/**
 * CSV para Excel em português: separador ";", vírgula decimal,
 * BOM UTF-8, CRLF. Colunas em `centsColumns` são cêntimos inteiros
 * e saem formatadas como euros ("47,96").
 */

export type CsvValue = string | number | null | undefined;

export function toCsv(
  header: string[],
  rows: CsvValue[][],
  centsColumns: number[],
): string {
  const centsSet = new Set(centsColumns);
  const lines = [header.map(escapeCell).join(';')];
  for (const row of rows) {
    lines.push(
      row
        .map((value, index) => {
          if (value == null) return '';
          if (centsSet.has(index) && typeof value === 'number') {
            return formatCentsPt(value);
          }
          return escapeCell(String(value));
        })
        .join(';'),
    );
  }
  return '﻿' + lines.join('\r\n');
}

function formatCentsPt(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

function escapeCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
