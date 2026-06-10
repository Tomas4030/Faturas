import {
  eurosToCents,
  centsToEuros,
  validateLine,
  validateTotals,
} from './money';

describe('eurosToCents', () => {
  it('converte 18.5 para 1850', () => {
    expect(eurosToCents(18.5)).toBe(1850);
  });

  it('evita erros de float (0.1 + 0.2)', () => {
    expect(eurosToCents(0.1) + eurosToCents(0.2)).toBe(30);
  });

  it('arredonda corretamente valores com dízimas', () => {
    expect(eurosToCents(4.815)).toBe(482);
    expect(eurosToCents(1.005)).toBe(101);
  });
});

describe('centsToEuros', () => {
  it('converte 1050 para 10.5', () => {
    expect(centsToEuros(1050)).toBe(10.5);
  });
});

describe('validateLine', () => {
  it('aceita 2 x 18.50 = 37.00 (caso Menu Sushi correto)', () => {
    const r = validateLine(2, 1850, 3700);
    expect(r.ok).toBe(true);
    expect(r.expectedTotalCents).toBe(3700);
  });

  it('rejeita 2 x 18.50 = 18.50 (caso Menu Sushi errado da spec)', () => {
    const r = validateLine(2, 1850, 1850);
    expect(r.ok).toBe(false);
    expect(r.expectedTotalCents).toBe(3700);
  });

  it('tolera diferenças de arredondamento até 5 cêntimos', () => {
    // 3 x 3.33 = 9.99, fatura diz 10.00
    expect(validateLine(3, 333, 1000).ok).toBe(true);
  });

  it('rejeita diferenças acima da tolerância', () => {
    expect(validateLine(3, 333, 1100).ok).toBe(false);
  });

  it('suporta quantidades fracionárias (0.450 kg)', () => {
    // 0.450 x 12.00/kg = 5.40
    expect(validateLine(0.45, 1200, 540).ok).toBe(true);
  });
});

describe('validateTotals', () => {
  it('aceita soma exata: 37.00 + 5.00 + IVA 5.96 = 47.96', () => {
    const r = validateTotals({
      itemTotalsCents: [3700, 500],
      taxCents: 596,
      discountCents: 0,
      tipCents: 0,
      grandTotalCents: 4796,
    });
    expect(r.ok).toBe(true);
    expect(r.computedTotalCents).toBe(4796);
    expect(r.differenceCents).toBe(0);
  });

  it('aceita diferença dentro da tolerância (arredondamentos)', () => {
    const r = validateTotals({
      itemTotalsCents: [3700, 500],
      taxCents: 596,
      discountCents: 0,
      tipCents: 0,
      grandTotalCents: 4799,
    });
    expect(r.ok).toBe(true);
    expect(r.differenceCents).toBe(-3);
  });

  it('rejeita diferença acima da tolerância', () => {
    const r = validateTotals({
      itemTotalsCents: [3700, 500],
      taxCents: 0,
      discountCents: 0,
      tipCents: 0,
      grandTotalCents: 5000,
    });
    expect(r.ok).toBe(false);
    expect(r.differenceCents).toBe(-800);
  });

  it('considera desconto e gorjeta', () => {
    // 42.00 - 2.00 desconto + 3.00 gorjeta = 43.00
    const r = validateTotals({
      itemTotalsCents: [4200],
      taxCents: 0,
      discountCents: 200,
      tipCents: 300,
      grandTotalCents: 4300,
    });
    expect(r.ok).toBe(true);
  });
});
