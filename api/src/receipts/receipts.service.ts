import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma.service';
import { ExtractionService } from '../extraction/extraction.service';
import { postprocess } from '../extraction/postprocess';
import { validateLine, validateTotals } from '../money/money';
import { SuppliersService } from '../suppliers/suppliers.service';
import {
  ReceiptDto,
  listReceiptsSchema,
  toReceiptDto,
  updateItemsSchema,
  updateReceiptSchema,
} from './dto';
import { Prisma } from '@prisma/client';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extraction: ExtractionService,
    private readonly suppliers: SuppliersService,
  ) {}

  private async checkUsageLimit(userId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return; // no plan = no limit (shouldn't happen)

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await this.prisma.usageCounter.findUnique({
      where: { userId_periodStart: { userId, periodStart } },
    });

    const used = usage?.receiptsScanned ?? 0;
    if (used >= sub.plan.monthlyReceiptLimit) {
      throw new ForbiddenException(
        `Limite do plano ${sub.plan.name} atingido (${sub.plan.monthlyReceiptLimit} faturas/mês). Faz upgrade para continuar.`,
      );
    }
  }

  private async incrementUsage(userId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await this.prisma.usageCounter.upsert({
      where: { userId_periodStart: { userId, periodStart } },
      create: { userId, periodStart, periodEnd, receiptsScanned: 1 },
      update: { receiptsScanned: { increment: 1 } },
    });
  }

  async create(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ receipt_id: string; status: string }> {
    await this.checkUsageLimit(userId);

    const receipt = await this.prisma.receipt.create({
      data: {
        userId,
        status: 'processing',
        imageStorageKey: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    await this.incrementUsage(userId);

    void this.processReceipt(receipt.id).catch(async (error) => {
      this.logger.error(`Extração de ${receipt.id} falhou: ${String(error)}`);
      await this.prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          status: 'failed',
          failureReason:
            'Não foi possível ler a fatura. Aproxima a câmara e tenta novamente.',
        },
      });
    });

    return { receipt_id: receipt.id, status: receipt.status };
  }

  private async processReceipt(id: string): Promise<void> {
    const receipt = await this.prisma.receipt.findUniqueOrThrow({
      where: { id },
    });
    const imageBuffer = await readFile(
      join(UPLOADS_DIR, receipt.imageStorageKey),
    );
    const raw = await this.extraction.extract(imageBuffer, receipt.mimeType);
    const processed = postprocess(raw);

    const supplier = processed.receiptFields.merchantName
      ? await this.suppliers.findOrCreateSupplier({
          userId: receipt.userId,
          name: processed.receiptFields.merchantName,
          nif: processed.receiptFields.merchantNif,
        })
      : null;
    const category = await this.suppliers.resolveCategory({
      userId: receipt.userId,
      merchantName: processed.receiptFields.merchantName,
      supplier,
      aiSuggestion: processed.suggestedCategory,
    });

    await this.prisma.$transaction([
      this.prisma.receiptItem.deleteMany({ where: { receiptId: id } }),
      this.prisma.receiptTax.deleteMany({ where: { receiptId: id } }),
      this.prisma.receipt.update({
        where: { id },
        data: {
          ...processed.receiptFields,
          supplierId: supplier?.id ?? null,
          category,
          status: 'needs_review',
          rawOcrJson: raw as object,
          warnings: processed.warnings,
          taxes: { create: processed.taxes },
          items: {
            create: processed.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              totalCents: item.totalCents,
              category: item.category,
              confidence: item.confidence,
              position: item.position,
              suspect: item.suspect,
            })),
          },
        },
      }),
    ]);
  }

  async findOne(id: string, userId: string): Promise<ReceiptDto> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id, userId },
      include: { items: true, taxes: true },
    });
    if (!receipt) throw new NotFoundException('Fatura não encontrada');
    return toReceiptDto(receipt);
  }

  async findAll(userId: string, filters: unknown = {}): Promise<ReceiptDto[]> {
    const parsed = listReceiptsSchema.safeParse(filters);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const where: Prisma.ReceiptWhereInput = { userId };
    const and: Prisma.ReceiptWhereInput[] = [];

    if (parsed.data.month) {
      const [year, month] = parsed.data.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      and.push({
        OR: [
          { documentDate: { gte: start, lt: end } },
          { documentDate: null, createdAt: { gte: start, lt: end } },
        ],
      });
    }
    if (parsed.data.category) where.category = parsed.data.category;
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.q) {
      and.push({
        OR: [
          { merchantName: { contains: parsed.data.q, mode: 'insensitive' } },
          { merchantNif: { contains: parsed.data.q, mode: 'insensitive' } },
          { documentNumber: { contains: parsed.data.q, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length > 0) where.AND = and;

    const orderBy: Prisma.ReceiptOrderByWithRelationInput[] =
      parsed.data.sort === 'date_asc'
        ? [{ documentDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }]
        : parsed.data.sort === 'total_desc'
          ? [{ totalCents: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
          : parsed.data.sort === 'total_asc'
            ? [{ totalCents: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
            : [{ documentDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];

    const receipts = await this.prisma.receipt.findMany({
      where,
      include: { items: true, taxes: true },
      orderBy,
      take: parsed.data.limit,
    });
    return receipts.map(toReceiptDto);
  }

  async remove(id: string, userId: string): Promise<{ deleted: true }> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id, userId },
    });
    if (!receipt) throw new NotFoundException('Fatura não encontrada');
    await this.prisma.receipt.delete({ where: { id } });
    await unlink(join(UPLOADS_DIR, receipt.imageStorageKey)).catch(() => {});
    return { deleted: true };
  }

  async updateReceipt(
    id: string,
    body: unknown,
    userId: string,
  ): Promise<ReceiptDto> {
    const parsed = updateReceiptSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const existing = await this.prisma.receipt.findUnique({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Fatura não encontrada');

    const merchantName =
      parsed.data.merchant_name ?? existing.merchantName ?? null;
    let supplierId = existing.supplierId;

    if (parsed.data.merchant_name) {
      const supplier = await this.suppliers.findOrCreateSupplier({
        userId,
        name: parsed.data.merchant_name,
        nif: existing.merchantNif,
      });
      supplierId = supplier?.id ?? null;
    }

    if (parsed.data.category && merchantName) {
      await this.suppliers.recordCategoryCorrection(
        userId,
        merchantName,
        parsed.data.category,
        supplierId,
      );
    }

    await this.prisma.receipt.update({
      where: { id },
      data: {
        merchantName,
        supplierId,
        category: parsed.data.category ?? existing.category,
      },
    });
    return this.findOne(id, userId);
  }

  async updateItems(
    id: string,
    body: unknown,
    userId: string,
  ): Promise<ReceiptDto> {
    const parsed = updateItemsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const existing = await this.prisma.receipt.findUnique({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Fatura não encontrada');

    const items = parsed.data.items;
    const warnings: string[] = [];

    for (const item of items) {
      const check = validateLine(
        item.quantity,
        item.unit_price_cents,
        item.total_cents,
      );
      if (!check.ok) {
        warnings.push(
          `"${item.description}": quantidade e total não coincidem. Confirma esta linha.`,
        );
      }
    }

    const subtotalCents = items.reduce((sum, i) => sum + i.total_cents, 0);
    const totalsCheck = validateTotals({
      itemTotalsCents: items.map((i) => i.total_cents),
      taxCents: 0,
      discountCents: existing.discountCents ?? 0,
      tipCents: existing.tipCents ?? 0,
      grandTotalCents: existing.totalCents ?? subtotalCents,
    });
    if (!totalsCheck.ok) {
      warnings.push(
        'Total dos itens não bate com o total da fatura. Confirma os valores.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.receiptItem.deleteMany({ where: { receiptId: id } }),
      this.prisma.receipt.update({
        where: { id },
        data: {
          status: 'ready',
          subtotalCents,
          totalCents: existing.totalCents ?? subtotalCents,
          warnings,
          items: {
            create: items.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceCents: item.unit_price_cents,
              totalCents: item.total_cents,
              category: item.category ?? null,
              position: index,
              suspect: false,
            })),
          },
        },
      }),
    ]);

    return this.findOne(id, userId);
  }
}
