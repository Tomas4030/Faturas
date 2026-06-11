import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { computeSplit } from './split-math';

const SESSION_TTL_DAYS = 7;

const joinSchema = z.object({ display_name: z.string().trim().min(1).max(40) });
const claimsSchema = z.object({
  claims: z
    .array(
      z.object({
        receipt_item_id: z.string().min(1),
        quantity_claimed: z.number().min(0),
      }),
    )
    .max(200),
});

@Injectable()
export class SplitService {
  constructor(private readonly prisma: PrismaService) {}

  async createForReceipt(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId, userId },
      include: { splitSessions: { where: { status: 'open' } } },
    });
    if (!receipt) throw new NotFoundException('Fatura não encontrada');
    if (receipt.status !== 'ready' && receipt.status !== 'needs_review') {
      throw new BadRequestException(
        'A fatura ainda não está pronta para dividir.',
      );
    }

    const existing = receipt.splitSessions.find(
      (s) => s.expiresAt > new Date(),
    );
    const session =
      existing ??
      (await this.prisma.splitSession.create({
        data: {
          receiptId,
          publicToken: `spl_${randomBytes(18).toString('base64url')}`,
          expiresAt: new Date(
            Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      }));

    return {
      split_session_id: session.id,
      public_token: session.publicToken,
      share_path: `/s/${session.publicToken}`,
    };
  }

  private async getSession(token: string) {
    const session = await this.prisma.splitSession.findUnique({
      where: { publicToken: token },
      include: {
        receipt: { include: { items: { orderBy: { position: 'asc' } } } },
        participants: { include: { claims: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  private assertWritable(session: { status: string; expiresAt: Date }) {
    if (session.status === 'closed') {
      throw new GoneException('Esta sessão já foi fechada.');
    }
    if (session.expiresAt < new Date()) {
      throw new GoneException('Esta sessão expirou.');
    }
  }

  async getPublic(token: string) {
    const session = await this.getSession(token);
    return {
      token: session.publicToken,
      status: session.status,
      expires_at: session.expiresAt.toISOString(),
      merchant_name: session.receipt.merchantName,
      document_date: session.receipt.documentDate
        ? session.receipt.documentDate.toISOString().slice(0, 10)
        : null,
      total_cents: session.receipt.totalCents,
      items: session.receipt.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        total_cents: i.totalCents,
      })),
      participants: session.participants.map((p) => ({
        id: p.id,
        display_name: p.displayName,
        claims: p.claims.map((c) => ({
          receipt_item_id: c.receiptItemId,
          quantity_claimed: Number(c.quantityClaimed),
        })),
      })),
    };
  }

  async join(token: string, body: unknown) {
    const session = await this.getSession(token);
    this.assertWritable(session);
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Nome inválido');
    const participant = await this.prisma.participant.create({
      data: {
        splitSessionId: session.id,
        displayName: parsed.data.display_name,
      },
    });
    return { participant_id: participant.id };
  }

  async setClaims(token: string, participantId: string, body: unknown) {
    const session = await this.getSession(token);
    this.assertWritable(session);
    const parsed = claimsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const participant = session.participants.find(
      (p) => p.id === participantId,
    );
    if (!participant) throw new NotFoundException('Participante não encontrado');

    const itemIds = new Set(session.receipt.items.map((i) => i.id));
    for (const claim of parsed.data.claims) {
      if (!itemIds.has(claim.receipt_item_id)) {
        throw new BadRequestException('Item não pertence a esta fatura');
      }
    }

    await this.prisma.$transaction([
      this.prisma.participantItemClaim.deleteMany({
        where: { participantId },
      }),
      this.prisma.participantItemClaim.createMany({
        data: parsed.data.claims
          .filter((c) => c.quantity_claimed > 0)
          .map((c) => ({
            participantId,
            receiptItemId: c.receipt_item_id,
            quantityClaimed: new Prisma.Decimal(c.quantity_claimed),
          })),
      }),
    ]);
    return this.summary(token);
  }

  async summary(token: string) {
    const session = await this.getSession(token);
    const receipt = session.receipt;
    const result = computeSplit({
      items: receipt.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        totalCents: i.totalCents,
      })),
      taxCents: hasTaxSeparate(receipt) ? (receipt.taxCents ?? 0) : 0,
      tipCents: receipt.tipCents ?? 0,
      discountCents: receipt.discountCents ?? 0,
      participants: session.participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
      })),
      claims: session.participants.flatMap((p) =>
        p.claims.map((c) => ({
          participantId: p.id,
          receiptItemId: c.receiptItemId,
          quantityClaimed: Number(c.quantityClaimed),
        })),
      ),
    });

    return {
      token: session.publicToken,
      status: session.status,
      merchant_name: receipt.merchantName,
      total_cents: receipt.totalCents,
      participants: result.participants.map((p) => ({
        id: p.id,
        display_name: p.displayName,
        subtotal_cents: p.subtotalCents,
        fees_cents: p.taxCents + p.tipCents - p.discountCents,
        total_cents: p.totalCents,
      })),
      unclaimed: result.unclaimed.map((u) => ({
        description: u.description,
        quantity_remaining: u.quantityRemaining,
        amount_cents: u.amountCents,
      })),
      warnings: result.warnings,
    };
  }

  async close(token: string, userId: string) {
    const session = await this.getSession(token);
    if (session.receipt.userId !== userId) {
      throw new NotFoundException('Sessão não encontrada');
    }
    if (session.status === 'closed') return { status: 'closed' };
    await this.prisma.splitSession.update({
      where: { id: session.id },
      data: { status: 'closed' },
    });
    return { status: 'closed' };
  }
}

/**
 * Em PT o IVA costuma estar incluído nos preços dos itens; nesse caso não se
 * soma outra vez. Só se distribui o IVA quando o total da fatura é maior do
 * que a soma dos itens (IVA discriminado à parte).
 */
function hasTaxSeparate(receipt: {
  totalCents: number | null;
  taxCents: number | null;
  items: Array<{ totalCents: number }>;
}): boolean {
  if (!receipt.taxCents || !receipt.totalCents) return false;
  const itemsSum = receipt.items.reduce((s, i) => s + i.totalCents, 0);
  return receipt.totalCents - itemsSum > 5;
}
