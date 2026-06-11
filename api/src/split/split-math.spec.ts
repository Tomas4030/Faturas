import { computeSplit, SplitItem, SplitClaim } from './split-math';

function item(
  id: string,
  quantity: number,
  totalCents: number,
  description = id,
): SplitItem {
  return { id, description, quantity, totalCents };
}

function claim(
  participantId: string,
  itemId: string,
  quantityClaimed: number,
): SplitClaim {
  return { participantId, receiptItemId: itemId, quantityClaimed };
}

describe('computeSplit', () => {
  it('item inteiro para uma pessoa (spec §10.1)', () => {
    const r = computeSplit({
      items: [item('sobremesa', 1, 400)],
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      participants: [{ id: 'joao', displayName: 'João' }],
      claims: [claim('joao', 'sobremesa', 1)],
    });
    expect(r.participants[0].totalCents).toBe(400);
    expect(r.unclaimed).toHaveLength(0);
  });

  it('item dividido por 3 distribui o cêntimo que sobra (spec §11)', () => {
    // 10,00€ / 3 = 3,33 + sobra 1 cêntimo
    const r = computeSplit({
      items: [item('vinho', 1, 1000)],
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
        { id: 'c', displayName: 'C' },
      ],
      claims: [
        claim('a', 'vinho', 1 / 3),
        claim('b', 'vinho', 1 / 3),
        claim('c', 'vinho', 1 / 3),
      ],
    });
    const totals = r.participants.map((p) => p.totalCents).sort((x, y) => y - x);
    expect(totals).toEqual([334, 333, 333]);
    expect(totals.reduce((s, t) => s + t, 0)).toBe(1000);
  });

  it('quantidade parcial (spec §10.3): 2 de 6 pães', () => {
    // 6 pães = 12,00€; A comeu 2 (4,00€), B comeu 4 (8,00€)
    const r = computeSplit({
      items: [item('paes', 6, 1200)],
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
      ],
      claims: [claim('a', 'paes', 2), claim('b', 'paes', 4)],
    });
    expect(r.participants.find((p) => p.id === 'a')!.totalCents).toBe(400);
    expect(r.participants.find((p) => p.id === 'b')!.totalCents).toBe(800);
  });

  it('taxa de serviço proporcional (spec §10.4): A 30€/B 70€, serviço 10€', () => {
    const r = computeSplit({
      items: [item('a-item', 1, 3000), item('b-item', 1, 7000)],
      taxCents: 1000,
      tipCents: 0,
      discountCents: 0,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
      ],
      claims: [claim('a', 'a-item', 1), claim('b', 'b-item', 1)],
    });
    expect(r.participants.find((p) => p.id === 'a')!.totalCents).toBe(3300);
    expect(r.participants.find((p) => p.id === 'b')!.totalCents).toBe(7700);
  });

  it('desconto proporcional subtrai', () => {
    const r = computeSplit({
      items: [item('x', 1, 2000), item('y', 1, 2000)],
      taxCents: 0,
      tipCents: 0,
      discountCents: 400,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
      ],
      claims: [claim('a', 'x', 1), claim('b', 'y', 1)],
    });
    expect(r.participants.find((p) => p.id === 'a')!.totalCents).toBe(1800);
    expect(r.participants.find((p) => p.id === 'b')!.totalCents).toBe(1800);
  });

  it('itens não reclamados aparecem em unclaimed', () => {
    const r = computeSplit({
      items: [item('claimed', 1, 500), item('esquecido', 2, 1000)],
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      participants: [{ id: 'a', displayName: 'A' }],
      claims: [claim('a', 'claimed', 1), claim('a', 'esquecido', 1)],
    });
    expect(r.unclaimed).toHaveLength(1);
    expect(r.unclaimed[0].itemId).toBe('esquecido');
    expect(r.unclaimed[0].quantityRemaining).toBe(1);
    expect(r.unclaimed[0].amountCents).toBe(500);
  });

  it('sobre-reclamação gera warning sem rebentar', () => {
    const r = computeSplit({
      items: [item('x', 1, 1000)],
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
      ],
      claims: [claim('a', 'x', 1), claim('b', 'x', 1)],
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('participante sem claims fica a 0 e não recebe taxas', () => {
    const r = computeSplit({
      items: [item('x', 1, 1000)],
      taxCents: 200,
      tipCents: 0,
      discountCents: 0,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
      ],
      claims: [claim('a', 'x', 1)],
    });
    expect(r.participants.find((p) => p.id === 'b')!.totalCents).toBe(0);
    expect(r.participants.find((p) => p.id === 'a')!.totalCents).toBe(1200);
  });

  it('soma dos participantes + unclaimed bate com itens + taxas (invariante)', () => {
    const r = computeSplit({
      items: [item('x', 3, 999), item('y', 2, 777), item('z', 1, 1234)],
      taxCents: 321,
      tipCents: 100,
      discountCents: 50,
      participants: [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
        { id: 'c', displayName: 'C' },
      ],
      claims: [
        claim('a', 'x', 1),
        claim('b', 'x', 2),
        claim('c', 'y', 2),
        claim('a', 'z', 1),
      ],
    });
    const participantSum = r.participants.reduce(
      (s, p) => s + p.totalCents,
      0,
    );
    // tudo reclamado: soma = itens + tax + tip - discount
    expect(participantSum).toBe(999 + 777 + 1234 + 321 + 100 - 50);
  });
});
