import { postprocess, ExtractionParseError } from './postprocess';

const validRaw = {
  merchant: { name: 'Restaurante Sakura', nif: '123456789', address: null },
  document: {
    type: 'receipt',
    date: '2026-06-10',
    number: 'FT 2026/123',
    atcud: null,
    currency: 'EUR',
  },
  items: [
    {
      description: 'Menu Sushi',
      quantity: 2,
      unit_price: 18.5,
      total: 37,
      category: 'restaurant_food',
      confidence: 0.94,
    },
    {
      description: 'Coca-Cola',
      quantity: 2,
      unit_price: 2.5,
      total: 5,
      category: 'drinks',
      confidence: 0.91,
    },
  ],
  taxes: [],
  totals: { subtotal: 42, tax: 0, discount: 0, tip: 0, grand_total: 42 },
  warnings: [],
};

describe('postprocess', () => {
  it('converte um JSON válido para cêntimos com linhas validadas', () => {
    const r = postprocess(validRaw);
    expect(r.receiptFields.merchantName).toBe('Restaurante Sakura');
    expect(r.receiptFields.totalCents).toBe(4200);
    expect(r.receiptFields.currency).toBe('EUR');
    expect(r.items).toHaveLength(2);
    expect(r.items[0].unitPriceCents).toBe(1850);
    expect(r.items[0].totalCents).toBe(3700);
    expect(r.items[0].suspect).toBe(false);
    expect(r.items[1].totalCents).toBe(500);
    expect(r.warnings).toHaveLength(0);
  });

  it('marca linha suspeita quando quantidade x preço não bate com o total', () => {
    const raw = {
      ...validRaw,
      items: [
        {
          description: 'Menu Sushi',
          quantity: 2,
          unit_price: 18.5,
          total: 18.5, // errado: caso da spec §8
          category: null,
          confidence: 0.9,
        },
      ],
      totals: { subtotal: 18.5, tax: 0, discount: 0, tip: 0, grand_total: 18.5 },
    };
    const r = postprocess(raw);
    expect(r.items[0].suspect).toBe(true);
    expect(r.warnings.some((w) => w.includes('Menu Sushi'))).toBe(true);
  });

  it('emite warning global quando a soma dos itens não bate com o grand_total', () => {
    const raw = {
      ...validRaw,
      totals: { subtotal: 42, tax: 0, discount: 0, tip: 0, grand_total: 50 },
    };
    const r = postprocess(raw);
    expect(r.warnings.some((w) => w.toLowerCase().includes('total'))).toBe(true);
  });

  it('aceita IVA discriminado quando subtotal + IVA = grand_total', () => {
    const raw = {
      ...validRaw,
      totals: { subtotal: 42, tax: 5.96, discount: 0, tip: 0, grand_total: 47.96 },
    };
    const r = postprocess(raw);
    expect(r.warnings).toHaveLength(0);
    expect(r.receiptFields.totalCents).toBe(4796);
    expect(r.receiptFields.taxCents).toBe(596);
  });

  it('marca item com preço null como suspeito em vez de inventar valor', () => {
    const raw = {
      ...validRaw,
      items: [
        {
          description: 'Item ilegível',
          quantity: null,
          unit_price: null,
          total: null,
          category: null,
          confidence: 0.2,
        },
      ],
      totals: { subtotal: null, tax: null, discount: null, tip: null, grand_total: null },
    };
    const r = postprocess(raw);
    expect(r.items[0].suspect).toBe(true);
    expect(r.items[0].totalCents).toBe(0);
  });

  it('lança ExtractionParseError com JSON inválido', () => {
    expect(() => postprocess({ foo: 'bar', items: 'not-an-array' })).toThrow(
      ExtractionParseError,
    );
  });

  it('preserva warnings vindos da IA', () => {
    const raw = { ...validRaw, warnings: ['Total pouco legível na imagem.'] };
    const r = postprocess(raw);
    expect(r.warnings).toContain('Total pouco legível na imagem.');
  });
});
