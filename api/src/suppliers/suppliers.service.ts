import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Supplier } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { normalizeName } from './normalize';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liga um comerciante a um fornecedor existente ou cria um novo.
   * Ordem de match: NIF → nome normalizado → criar.
   */
  async findOrCreateSupplier(args: {
    userId: string;
    name: string;
    nif?: string | null;
  }): Promise<Supplier | null> {
    const normalized = normalizeName(args.name);
    if (!normalized) return null;

    if (args.nif) {
      const byNif = await this.prisma.supplier.findFirst({
        where: { userId: args.userId, nif: args.nif },
      });
      if (byNif) return byNif;
    }

    const byName = await this.prisma.supplier.findUnique({
      where: {
        userId_normalizedName: {
          userId: args.userId,
          normalizedName: normalized,
        },
      },
    });
    if (byName) {
      if (args.nif && !byName.nif) {
        // enriquece com o NIF agora conhecido
        return this.prisma.supplier.update({
          where: { id: byName.id },
          data: { nif: args.nif },
        });
      }
      return byName;
    }

    return this.prisma.supplier.create({
      data: {
        userId: args.userId,
        name: args.name.trim(),
        nif: args.nif ?? null,
        normalizedName: normalized,
      },
    });
  }

  /**
   * Categoria para uma fatura: correção do utilizador → default do
   * fornecedor → categoria sugerida pela IA → null.
   */
  async resolveCategory(args: {
    userId: string;
    merchantName: string | null;
    supplier: Supplier | null;
    aiSuggestion: string | null;
  }): Promise<string | null> {
    if (args.merchantName) {
      const normalized = normalizeName(args.merchantName);
      if (normalized) {
        const correction = await this.prisma.categoryCorrection.findUnique({
          where: {
            userId_normalizedMerchantName: {
              userId: args.userId,
              normalizedMerchantName: normalized,
            },
          },
        });
        if (correction) return correction.category;
      }
    }
    if (args.supplier?.category) return args.supplier.category;
    return args.aiSuggestion;
  }

  /** Memoriza a correção de categoria do utilizador (spec §19). */
  async recordCategoryCorrection(
    userId: string,
    merchantName: string,
    category: string,
    supplierId?: string | null,
  ): Promise<void> {
    const normalized = normalizeName(merchantName);
    if (normalized) {
      await this.prisma.categoryCorrection.upsert({
        where: {
          userId_normalizedMerchantName: {
            userId,
            normalizedMerchantName: normalized,
          },
        },
        create: { userId, normalizedMerchantName: normalized, category },
        update: { category },
      });
    }
    if (supplierId) {
      await this.prisma.supplier.updateMany({
        where: { id: supplierId, userId },
        data: { category },
      });
    }
  }

  async findAll(userId?: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        ...(userId ? { userId } : {}),
        receipts: { some: { ...(userId ? { userId } : {}) } },
      },
      include: {
        receipts: {
          where: { status: { in: ['ready', 'needs_review'] }, ...(userId ? { userId } : {}) },
          select: { totalCents: true, createdAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return suppliers
      .map((s) => ({
        id: s.id,
        name: s.name,
        nif: s.nif,
        category: s.category,
        receipt_count: s.receipts.length,
        total_cents: s.receipts.reduce((sum, r) => sum + (r.totalCents ?? 0), 0),
        last_receipt_at:
          s.receipts.length > 0
            ? s.receipts
                .map((r) => r.createdAt)
                .sort((a, b) => b.getTime() - a.getTime())[0]
                .toISOString()
            : null,
      }))
      .sort((a, b) => b.total_cents - a.total_cents);
  }

  async findOne(id: string, userId?: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: {
        receipts: {
          where: userId ? { userId } : {},
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            documentDate: true,
            category: true,
            totalCents: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    return {
      id: supplier.id,
      name: supplier.name,
      nif: supplier.nif,
      category: supplier.category,
      total_cents: supplier.receipts.reduce(
        (sum, r) => sum + (r.totalCents ?? 0),
        0,
      ),
      receipts: supplier.receipts.map((r) => ({
        id: r.id,
        date: r.documentDate
          ? r.documentDate.toISOString().slice(0, 10)
          : r.createdAt.toISOString().slice(0, 10),
        category: r.category,
        total_cents: r.totalCents,
        status: r.status,
      })),
    };
  }

  async rename(id: string, name: string, userId: string) {
    const normalizedName = normalizeName(name);
    if (!normalizedName) throw new BadRequestException('Nome inválido');

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, userId },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');

    const conflict = await this.prisma.supplier.findUnique({
      where: { userId_normalizedName: { userId, normalizedName } },
    });
    if (conflict && conflict.id !== id) {
      throw new BadRequestException('Já existe um fornecedor com esse nome');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: { name: name.trim(), normalizedName },
    });
  }

  async merge(sourceId: string, targetId: string, userId: string) {
    if (!sourceId || !targetId) {
      throw new BadRequestException('source e target são obrigatórios');
    }
    if (sourceId === targetId)
      throw new BadRequestException('source e target não podem ser iguais');
    const [source, target] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: sourceId, userId } }),
      this.prisma.supplier.findFirst({ where: { id: targetId, userId } }),
    ]);
    if (!source || !target)
      throw new NotFoundException('Fornecedor não encontrado');
    await this.prisma.receipt.updateMany({
      where: { supplierId: sourceId, userId },
      data: { supplierId: targetId },
    });
    await this.prisma.supplier.delete({ where: { id: sourceId } });
    return target;
  }
}
