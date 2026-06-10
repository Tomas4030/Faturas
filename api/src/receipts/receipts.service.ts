import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma.service';
import { ExtractionService } from '../extraction/extraction.service';
import { postprocess } from '../extraction/postprocess';
import { validateLine, validateTotals } from '../money/money';
import { ReceiptDto, toReceiptDto, updateItemsSchema } from './dto';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extraction: ExtractionService,
  ) {}

  async create(file: Express.Multer.File): Promise<{
    receipt_id: string;
    status: string;
  }> {
    const receipt = await this.prisma.receipt.create({
      data: {
        status: 'processing',
        imageStorageKey: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    // Extração assíncrona in-process (Fase 0). O contrato HTTP mantém-se
    // quando isto passar para uma fila (BullMQ) no MVP.
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

    await this.prisma.$transaction([
      this.prisma.receiptItem.deleteMany({ where: { receiptId: id } }),
      this.prisma.receipt.update({
        where: { id },
        data: {
          ...processed.receiptFields,
          status: 'needs_review',
          rawOcrJson: raw as object,
          warnings: processed.warnings,
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

  async findOne(id: string): Promise<ReceiptDto> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!receipt) throw new NotFoundException('Fatura não encontrada');
    return toReceiptDto(receipt);
  }

  async findAll(): Promise<ReceiptDto[]> {
    const receipts = await this.prisma.receipt.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return receipts.map(toReceiptDto);
  }

  async updateItems(id: string, body: unknown): Promise<ReceiptDto> {
    const parsed = updateItemsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const existing = await this.prisma.receipt.findUnique({ where: { id } });
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
          // O utilizador é a autoridade final: o total passa a ser a soma revista
          // se a fatura não tiver total extraído.
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

    return this.findOne(id);
  }
}
