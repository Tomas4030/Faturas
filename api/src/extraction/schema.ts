import { z } from 'zod';

/**
 * Schema rígido do JSON devolvido pela IA (spec §7).
 * Tudo o que a IA não tiver a certeza vem como null — nunca inventado.
 */

const nullableString = z.string().nullish();
const nullableNumber = z.number().nullish();

export const extractionItemSchema = z.object({
  description: z.string().min(1),
  quantity: nullableNumber,
  unit_price: nullableNumber,
  total: nullableNumber,
  category: nullableString,
  confidence: nullableNumber,
});

export const extractionResultSchema = z.object({
  merchant: z
    .object({
      name: nullableString,
      nif: nullableString,
      address: nullableString,
    })
    .nullish(),
  document: z
    .object({
      type: nullableString,
      date: nullableString,
      number: nullableString,
      atcud: nullableString,
      currency: nullableString,
      category: nullableString,
    })
    .nullish(),
  items: z.array(extractionItemSchema).default([]),
  taxes: z
    .array(
      z.object({
        rate: nullableNumber,
        base: nullableNumber,
        amount: nullableNumber,
      }),
    )
    .nullish(),
  totals: z
    .object({
      subtotal: nullableNumber,
      tax: nullableNumber,
      discount: nullableNumber,
      tip: nullableNumber,
      grand_total: nullableNumber,
    })
    .nullish(),
  warnings: z.array(z.string()).nullish(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type ExtractionItem = z.infer<typeof extractionItemSchema>;
