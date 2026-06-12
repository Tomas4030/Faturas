import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { categoryLabel } from '../stats/insights';

function cents(v: number | null): string {
  if (v == null) return '-';
  return (v / 100).toFixed(2) + ' €';
}

export async function generateReportPdf(data: {
  rows: { date: string; supplier: string | null; category: string | null; net_cents: number | null; tax_cents: number | null; total_cents: number }[];
  totals: { net_cents: number; tax_cents: number; total_cents: number };
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (c) => chunks.push(c));
  doc.pipe(stream);

  doc.fontSize(16).text('Relatório de Despesas', { align: 'center' });
  doc.moveDown();

  const cols = [40, 130, 250, 340, 410, 480];
  const headers = ['Data', 'Fornecedor', 'Categoria', 'Líquido', 'IVA', 'Total'];
  doc.fontSize(9).font('Helvetica-Bold');
  headers.forEach((h, i) => doc.text(h, cols[i], doc.y, { continued: i < 5, width: 80 }));
  doc.moveDown(0.5);
  doc.font('Helvetica');

  for (const r of data.rows) {
    if (doc.y > 750) doc.addPage();
    const y = doc.y;
    doc.text(r.date, cols[0], y);
    doc.text((r.supplier ?? '-').slice(0, 18), cols[1], y);
    doc.text(r.category ? categoryLabel(r.category) : '-', cols[2], y);
    doc.text(cents(r.net_cents), cols[3], y);
    doc.text(cents(r.tax_cents), cols[4], y);
    doc.text(cents(r.total_cents), cols[5], y);
    doc.moveDown(0.3);
  }

  doc.moveDown();
  doc.font('Helvetica-Bold');
  doc.text(`Total: ${cents(data.totals.net_cents)} líquido | ${cents(data.totals.tax_cents)} IVA | ${cents(data.totals.total_cents)} total`);

  doc.end();
  return new Promise((resolve) => stream.on('end', () => resolve(Buffer.concat(chunks))));
}
