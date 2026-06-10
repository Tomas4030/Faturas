import { z } from 'zod';
import { Prisma, Receipt, ReceiptItem } from '@prisma/client';

/** Body do PATCH /receipts/:id/items — lista completa de itens revistos. */
export const updateItemsSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit_price_cents: z.number().int().min(0),
        total_cents: z.number().int().min(0),
        category: z.string().nullish(),
      }),
    )
    .min(1),
});

export type UpdateItemsBody = z.infer<typeof updateItemsSchema>;

export interface ReceiptDto {
  id: string;
  status: string;
  failure_reason: string | null;
  merchant: { name: string | null; nif: string | null };
  document: {
    number: string | null;
    date: string | null;
    currency: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    category: string | null;
    confidence: number | null;
    suspect: boolean;
    position: number;
  }>;
  totals: {
    subtotal_cents: number | null;
    tax_cents: number | null;
    discount_cents: number | null;
    tip_cents: number | null;
    total_cents: number | null;
  };
  warnings: string[];
  created_at: string;
}

export function toReceiptDto(
  receipt: Receipt & { items: ReceiptItem[] },
): ReceiptDto {
  return {
    id: receipt.id,
    status: receipt.status,
    failure_reason: receipt.failureReason,
    merchant: { name: receipt.merchantName, nif: receipt.merchantNif },
    document: {
      number: receipt.documentNumber,
      date: receipt.documentDate
        ? receipt.documentDate.toISOString().slice(0, 10)
        : null,
      currency: receipt.currency,
    },
    items: [...receipt.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: decimalToNumber(item.quantity),
        unit_price_cents: item.unitPriceCents,
        total_cents: item.totalCents,
        category: item.category,
        confidence: item.confidence,
        suspect: item.suspect,
        position: item.position,
      })),
    totals: {
      subtotal_cents: receipt.subtotalCents,
      tax_cents: receipt.taxCents,
      discount_cents: receipt.discountCents,
      tip_cents: receipt.tipCents,
      total_cents: receipt.totalCents,
    },
    warnings: Array.isArray(receipt.warnings)
      ? (receipt.warnings as string[])
      : [],
    created_at: receipt.createdAt.toISOString(),
  };
}

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}
