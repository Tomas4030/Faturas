/**
 * Cálculo central da divisão de conta (spec §11).
 * Tudo em cêntimos inteiros; nunca espalhar lógica de dinheiro fora daqui.
 */

export interface SplitItem {
  id: string;
  description: string;
  quantity: number;
  totalCents: number;
}

export interface SplitClaim {
  participantId: string;
  receiptItemId: string;
  quantityClaimed: number;
}

export interface SplitParticipantInput {
  id: string;
  displayName: string;
}

export interface ParticipantResult {
  id: string;
  displayName: string;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  discountCents: number;
  totalCents: number;
}

export interface UnclaimedItem {
  itemId: string;
  description: string;
  quantityRemaining: number;
  amountCents: number;
}

export interface SplitResult {
  participants: ParticipantResult[];
  unclaimed: UnclaimedItem[];
  warnings: string[];
}

export function computeSplit(args: {
  items: SplitItem[];
  taxCents: number;
  tipCents: number;
  discountCents: number;
  participants: SplitParticipantInput[];
  claims: SplitClaim[];
}): SplitResult {
  const warnings: string[] = [];
  const itemById = new Map(args.items.map((i) => [i.id, i]));

  // subtotal por participante: o total de cada item é distribuído de forma
  // exata pelos claims desse item (nunca se perdem cêntimos no arredondamento)
  const subtotal = new Map<string, number>(
    args.participants.map((p) => [p.id, 0]),
  );
  const claimedQty = new Map<string, number>();
  const claimsByItem = new Map<string, SplitClaim[]>();

  for (const claim of args.claims) {
    const item = itemById.get(claim.receiptItemId);
    if (!item || claim.quantityClaimed <= 0) continue;
    const list = claimsByItem.get(item.id) ?? [];
    list.push(claim);
    claimsByItem.set(item.id, list);
    claimedQty.set(
      item.id,
      (claimedQty.get(item.id) ?? 0) + claim.quantityClaimed,
    );
  }

  for (const [itemId, itemClaims] of claimsByItem) {
    const item = itemById.get(itemId)!;
    const claimedTotal = claimedQty.get(itemId) ?? 0;
    // parte do item efetivamente reclamada (se ficou metade por reclamar,
    // só metade do valor é distribuído)
    const coveredRatio = Math.min(1, claimedTotal / item.quantity);
    const amountToDistribute = Math.round(item.totalCents * coveredRatio);
    // ordena para determinismo
    const ordered = [...itemClaims].sort((a, b) =>
      a.participantId.localeCompare(b.participantId),
    );
    const shares = distributeProportionally(
      amountToDistribute,
      ordered.map((c) => c.quantityClaimed),
      claimedTotal,
    );
    ordered.forEach((claim, i) => {
      subtotal.set(
        claim.participantId,
        (subtotal.get(claim.participantId) ?? 0) + shares[i],
      );
    });
  }

  const EPSILON = 0.001;
  const unclaimed: UnclaimedItem[] = [];
  for (const item of args.items) {
    const claimed = claimedQty.get(item.id) ?? 0;
    if (claimed > item.quantity + EPSILON) {
      warnings.push(
        `"${item.description}": reclamado ${claimed} mas só há ${item.quantity}.`,
      );
    } else if (claimed < item.quantity - EPSILON) {
      const remaining = item.quantity - claimed;
      unclaimed.push({
        itemId: item.id,
        description: item.description,
        quantityRemaining: round3(remaining),
        amountCents: Math.round((remaining / item.quantity) * item.totalCents),
      });
    }
  }

  const totalClaimedSubtotal = [...subtotal.values()].reduce(
    (s, v) => s + v,
    0,
  );

  // ordem determinística: maior subtotal primeiro, depois id
  const ordered = [...args.participants].sort((a, b) => {
    const diff = (subtotal.get(b.id) ?? 0) - (subtotal.get(a.id) ?? 0);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const taxShares = distributeProportionally(
    args.taxCents,
    ordered.map((p) => subtotal.get(p.id) ?? 0),
    totalClaimedSubtotal,
  );
  const tipShares = distributeProportionally(
    args.tipCents,
    ordered.map((p) => subtotal.get(p.id) ?? 0),
    totalClaimedSubtotal,
  );
  const discountShares = distributeProportionally(
    args.discountCents,
    ordered.map((p) => subtotal.get(p.id) ?? 0),
    totalClaimedSubtotal,
  );

  const participants: ParticipantResult[] = ordered.map((p, i) => {
    const sub = subtotal.get(p.id) ?? 0;
    return {
      id: p.id,
      displayName: p.displayName,
      subtotalCents: sub,
      taxCents: taxShares[i],
      tipCents: tipShares[i],
      discountCents: discountShares[i],
      totalCents: sub + taxShares[i] + tipShares[i] - discountShares[i],
    };
  });

  return { participants, unclaimed, warnings };
}

/**
 * Divide `totalCents` proporcionalmente a `weights`, garantindo que a soma
 * das partes é exatamente `totalCents` (spec §11: nunca perder cêntimos).
 * O resto distribui-se 1 cêntimo de cada vez pela ordem dada (maiores primeiro).
 */
export function distributeProportionally(
  totalCents: number,
  weights: number[],
  weightSum?: number,
): number[] {
  const sum = weightSum ?? weights.reduce((s, w) => s + w, 0);
  if (totalCents === 0 || sum <= 0) return weights.map(() => 0);

  const shares = weights.map((w) => Math.floor((w / sum) * totalCents));
  let remainder = totalCents - shares.reduce((s, v) => s + v, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % shares.length) {
    if (weights[i] > 0) {
      shares[i] += 1;
      remainder -= 1;
    } else if (weights.every((w) => w <= 0)) {
      break;
    }
  }
  return shares;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
