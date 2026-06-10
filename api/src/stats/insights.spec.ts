import { buildInsights } from './insights';

describe('buildInsights', () => {
  const base = {
    totalCents: 10000,
    previousMonthTotalCents: 10000,
    byCategory: [] as Array<{ category: string | null; totalCents: number }>,
    topSuppliers: [] as Array<{ name: string; totalCents: number }>,
  };

  it('sem dados devolve lista vazia', () => {
    expect(
      buildInsights({ ...base, totalCents: 0, previousMonthTotalCents: 0 }),
    ).toEqual([]);
  });

  it('variação acima de 15% vs mês anterior gera insight de subida', () => {
    const insights = buildInsights({
      ...base,
      totalCents: 12000,
      previousMonthTotalCents: 10000,
    });
    expect(insights.some((i) => i.includes('20%') && i.includes('mais'))).toBe(
      true,
    );
  });

  it('descida acima de 15% gera insight de poupança', () => {
    const insights = buildInsights({
      ...base,
      totalCents: 8000,
      previousMonthTotalCents: 10000,
    });
    expect(insights.some((i) => i.includes('20%') && i.includes('menos'))).toBe(
      true,
    );
  });

  it('variação pequena não gera insight de variação', () => {
    const insights = buildInsights({
      ...base,
      totalCents: 10500,
      previousMonthTotalCents: 10000,
    });
    expect(insights.some((i) => i.includes('mês passado'))).toBe(false);
  });

  it('fornecedor com mais de 30% do total gera insight', () => {
    const insights = buildInsights({
      ...base,
      topSuppliers: [{ name: 'Lidl', totalCents: 6400 }],
    });
    expect(insights.some((i) => i.includes('Lidl') && i.includes('64%'))).toBe(
      true,
    );
  });

  it('categoria dominante (>50%) gera insight', () => {
    const insights = buildInsights({
      ...base,
      byCategory: [{ category: 'supermercado', totalCents: 7000 }],
    });
    expect(
      insights.some((i) => i.includes('Supermercado') && i.includes('70%')),
    ).toBe(true);
  });

  it('sem mês anterior não gera insight de variação', () => {
    const insights = buildInsights({
      ...base,
      previousMonthTotalCents: 0,
    });
    expect(insights.some((i) => i.includes('mês passado'))).toBe(false);
  });
});
