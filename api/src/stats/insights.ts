/** Regras simples de insights para o dashboard (sem IA — determinístico). */

const CATEGORY_LABELS: Record<string, string> = {
  supermercado: 'Supermercado',
  restaurante: 'Restaurantes',
  combustivel: 'Combustível',
  fornecedor: 'Fornecedores',
  lazer: 'Lazer',
  servicos: 'Serviços',
  outros: 'Outros',
};

export function categoryLabel(category: string | null): string {
  return category ? (CATEGORY_LABELS[category] ?? category) : 'Sem categoria';
}

export function buildInsights(args: {
  totalCents: number;
  previousMonthTotalCents: number;
  byCategory: Array<{ category: string | null; totalCents: number }>;
  topSuppliers: Array<{ name: string; totalCents: number }>;
}): string[] {
  const insights: string[] = [];
  if (args.totalCents <= 0) return insights;

  if (args.previousMonthTotalCents > 0) {
    const variation =
      ((args.totalCents - args.previousMonthTotalCents) /
        args.previousMonthTotalCents) *
      100;
    if (variation >= 15) {
      insights.push(
        `Gastaste ${Math.round(variation)}% mais do que no mês passado.`,
      );
    } else if (variation <= -15) {
      insights.push(
        `Gastaste ${Math.round(-variation)}% menos do que no mês passado.`,
      );
    }
  }

  const topSupplier = args.topSuppliers[0];
  if (topSupplier && topSupplier.totalCents > 0) {
    const share = (topSupplier.totalCents / args.totalCents) * 100;
    if (share > 30) {
      insights.push(
        `${topSupplier.name} representa ${Math.round(share)}% das despesas este mês.`,
      );
    }
  }

  const topCategory = [...args.byCategory].sort(
    (a, b) => b.totalCents - a.totalCents,
  )[0];
  if (topCategory && topCategory.totalCents > 0) {
    const share = (topCategory.totalCents / args.totalCents) * 100;
    if (share > 50) {
      insights.push(
        `${categoryLabel(topCategory.category)} é ${Math.round(share)}% dos teus gastos.`,
      );
    }
  }

  return insights;
}
