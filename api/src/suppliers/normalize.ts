/**
 * Normaliza nomes de comerciantes para deduplicação de fornecedores.
 * "LIDL & CIA." e "Lidl" devem mapear para o mesmo fornecedor.
 */

const CORPORATE_SUFFIXES = new Set([
  'lda',
  'ldta',
  'sa',
  'unipessoal',
  'cia',
  'crl',
  'sgps',
  'inc',
  'ltd',
]);

export function normalizeName(name: string): string {
  const words = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/\./g, '') // "s.a." → "sa" antes de separar palavras
    .replace(/[^a-z0-9\s]/g, ' ') // restante pontuação e símbolos → espaço
    .split(/\s+/)
    .filter((w) => w.length > 0 && !CORPORATE_SUFFIXES.has(w));
  return words.join(' ');
}
