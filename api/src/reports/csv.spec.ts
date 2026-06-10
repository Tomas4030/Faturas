import { toCsv } from './csv';

describe('toCsv', () => {
  it('gera cabeçalho e linhas com ; e vírgula decimal', () => {
    const csv = toCsv(
      ['Data', 'Total'],
      [
        ['2026-06-10', 4796],
        ['2026-06-11', 500],
      ],
      [1],
    );
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[0]).toBe('Data;Total');
    expect(lines[1]).toBe('2026-06-10;47,96');
    expect(lines[2]).toBe('2026-06-11;5,00');
  });

  it('começa com BOM UTF-8 (Excel PT)', () => {
    const csv = toCsv(['A'], [['x']], []);
    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('faz escaping de ; aspas e quebras de linha', () => {
    const csv = toCsv(['Nome'], [['Café; o "melhor"\nda zona']], []);
    const body = csv.replace(/^﻿/, '').split('\r\n')[1];
    expect(body).toBe('"Café; o ""melhor""\nda zona"');
  });

  it('valores null ficam vazios', () => {
    const csv = toCsv(['A', 'B'], [[null, 100]], [1]);
    const body = csv.replace(/^﻿/, '').split('\r\n')[1];
    expect(body).toBe(';1,00');
  });
});
