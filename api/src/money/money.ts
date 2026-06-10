/**
 * Lógica monetária central. Todos os valores circulam em cêntimos inteiros.
 * Nunca usar floats para guardar ou comparar dinheiro (spec §12).
 */

export const DEFAULT_TOLERANCE_CENTS = 5;

export function eurosToCents(value: number): number {
  // Arredonda primeiro a milésimas para neutralizar representações
  // binárias como 4.815 * 100 === 481.49999999999994.
  return Math.round(Math.round(value * 1000) / 10);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export interface LineCheck {
  ok: boolean;
  expectedTotalCents: number;
}

export function validateLine(
  quantity: number,
  unitPriceCents: number,
  totalCents: number,
  toleranceCents = DEFAULT_TOLERANCE_CENTS,
): LineCheck {
  const expectedTotalCents = Math.round(quantity * unitPriceCents);
  return {
    ok: Math.abs(expectedTotalCents - totalCents) <= toleranceCents,
    expectedTotalCents,
  };
}

export interface TotalsCheck {
  ok: boolean;
  computedTotalCents: number;
  differenceCents: number;
}

export function validateTotals(args: {
  itemTotalsCents: number[];
  taxCents: number;
  discountCents: number;
  tipCents: number;
  grandTotalCents: number;
  toleranceCents?: number;
}): TotalsCheck {
  const {
    itemTotalsCents,
    taxCents,
    discountCents,
    tipCents,
    grandTotalCents,
    toleranceCents = DEFAULT_TOLERANCE_CENTS,
  } = args;
  const subtotal = itemTotalsCents.reduce((a, b) => a + b, 0);
  const computedTotalCents = subtotal + taxCents + tipCents - discountCents;
  const differenceCents = computedTotalCents - grandTotalCents;
  return {
    ok: Math.abs(differenceCents) <= toleranceCents,
    computedTotalCents,
    differenceCents,
  };
}
