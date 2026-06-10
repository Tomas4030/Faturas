import { extractionResultSchema } from './schema';
import { eurosToCents, validateLine, validateTotals } from '../money/money';

export class ExtractionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionParseError';
  }
}

export interface ProcessedItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  category: string | null;
  confidence: number | null;
  position: number;
  suspect: boolean;
}

export interface ProcessedReceiptFields {
  merchantName: string | null;
  merchantNif: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  currency: string;
  subtotalCents: number | null;
  taxCents: number | null;
  discountCents: number | null;
  tipCents: number | null;
  totalCents: number | null;
}

export interface ProcessedTax {
  rate: number;
  baseCents: number;
  amountCents: number;
}

export interface PostprocessResult {
  receiptFields: ProcessedReceiptFields;
  items: ProcessedItem[];
  taxes: ProcessedTax[];
  warnings: string[];
  /** Categoria macro sugerida a partir das categorias dos itens da IA. */
  suggestedCategory: string | null;
}

function toCentsOrNull(value: number | null | undefined): number | null {
  return value == null ? null : eurosToCents(value);
}

export function postprocess(raw: unknown): PostprocessResult {
  const parsed = extractionResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ExtractionParseError(
      `JSON da extração não cumpre o schema: ${parsed.error.message}`,
    );
  }
  const data = parsed.data;
  const warnings: string[] = [...(data.warnings ?? [])];

  const items: ProcessedItem[] = data.items.map((item, index) => {
    const quantity = item.quantity ?? 1;
    const unitPriceCents = toCentsOrNull(item.unit_price);
    const totalCents = toCentsOrNull(item.total);

    let suspect = false;
    let finalUnitPrice = unitPriceCents;
    let finalTotal = totalCents;

    if (unitPriceCents == null && totalCents == null) {
      suspect = true;
      finalUnitPrice = 0;
      finalTotal = 0;
      warnings.push(
        `"${item.description}": sem preço legível. Confirma esta linha.`,
      );
    } else if (totalCents == null) {
      // total em falta: deriva de qty x preço, mas pede confirmação
      finalTotal = Math.round(quantity * (unitPriceCents ?? 0));
      suspect = true;
      warnings.push(
        `"${item.description}": total em falta, calculado automaticamente. Confirma esta linha.`,
      );
    } else if (unitPriceCents == null) {
      finalUnitPrice = Math.round(totalCents / quantity);
      suspect = true;
      warnings.push(
        `"${item.description}": preço unitário em falta, calculado automaticamente. Confirma esta linha.`,
      );
    } else {
      const check = validateLine(quantity, unitPriceCents, totalCents);
      if (!check.ok) {
        suspect = true;
        warnings.push(
          `"${item.description}": quantidade e total não coincidem. Confirma esta linha.`,
        );
      }
    }

    return {
      description: item.description,
      quantity,
      unitPriceCents: finalUnitPrice ?? 0,
      totalCents: finalTotal ?? 0,
      category: item.category ?? null,
      confidence: item.confidence ?? null,
      position: index,
      suspect,
    };
  });

  const taxCents = toCentsOrNull(data.totals?.tax) ?? 0;
  const discountCents = toCentsOrNull(data.totals?.discount) ?? 0;
  const tipCents = toCentsOrNull(data.totals?.tip) ?? 0;
  const grandTotalCents = toCentsOrNull(data.totals?.grand_total);
  const itemTotals = items.map((i) => i.totalCents);

  if (grandTotalCents != null && items.length > 0) {
    // Faturas PT costumam ter IVA já incluído nos preços; outras discriminam.
    // Aceita-se qualquer uma das duas leituras; se nenhuma bater, warning.
    const withTax = validateTotals({
      itemTotalsCents: itemTotals,
      taxCents,
      discountCents,
      tipCents,
      grandTotalCents,
    });
    const taxIncluded = validateTotals({
      itemTotalsCents: itemTotals,
      taxCents: 0,
      discountCents,
      tipCents,
      grandTotalCents,
    });
    if (!withTax.ok && !taxIncluded.ok) {
      warnings.push(
        'Total calculado não bate exatamente com o total da fatura. Confirma os itens.',
      );
    }
  }

  const taxes: ProcessedTax[] = (data.taxes ?? [])
    .filter((t) => t.rate != null && (t.base != null || t.amount != null))
    .map((t) => ({
      rate: Math.round(t.rate as number),
      baseCents: toCentsOrNull(t.base) ?? 0,
      amountCents: toCentsOrNull(t.amount) ?? 0,
    }));

  let documentDate: Date | null = null;
  if (data.document?.date) {
    const d = new Date(data.document.date);
    if (!Number.isNaN(d.getTime())) documentDate = d;
  }

  return {
    receiptFields: {
      merchantName: data.merchant?.name ?? null,
      merchantNif: data.merchant?.nif ?? null,
      documentNumber: data.document?.number ?? null,
      documentDate,
      currency: data.document?.currency ?? 'EUR',
      subtotalCents: toCentsOrNull(data.totals?.subtotal),
      taxCents,
      discountCents,
      tipCents,
      totalCents: grandTotalCents,
    },
    items,
    taxes,
    warnings,
    suggestedCategory: deriveMacroCategory(items),
  };
}

/** Mapeia categorias de item da IA para a categoria macro da fatura. */
const ITEM_TO_MACRO: Array<[RegExp, string]> = [
  [/restaurant|food|drink|meal|cafe|coffee/i, 'restaurante'],
  [/grocer|supermark|supermerc/i, 'supermercado'],
  [/fuel|gas|combust/i, 'combustivel'],
  [/supplier|fornecedor|wholesale/i, 'fornecedor'],
  [/leisure|entertain|lazer|cinema/i, 'lazer'],
  [/service|servic|utility|telecom/i, 'servicos'],
];

function deriveMacroCategory(items: ProcessedItem[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.category) continue;
    for (const [pattern, macro] of ITEM_TO_MACRO) {
      if (pattern.test(item.category)) {
        counts.set(macro, (counts.get(macro) ?? 0) + 1);
        break;
      }
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [macro, count] of counts) {
    if (count > bestCount) {
      best = macro;
      bestCount = count;
    }
  }
  return best;
}
