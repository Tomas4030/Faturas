import Constants from 'expo-constants';

/**
 * URL da API. Por omissão deriva o IP do servidor Expo (a mesma máquina
 * onde corre a API NestJS). Para forçar outro endereço, define
 * expo.extra.apiUrl no app.json.
 */
function resolveApiUrl(): string {
  const override = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)
    ?.apiUrl;
  if (override) return override;
  const hostUri = Constants.expoConfig?.hostUri; // ex.: "192.168.1.176:8081"
  const host = hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3000`;
}

export const API_URL = resolveApiUrl();

export interface ReceiptItemDto {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  category: string | null;
  confidence: number | null;
  suspect: boolean;
  position: number;
}

export const MACRO_CATEGORIES = [
  'supermercado',
  'restaurante',
  'combustivel',
  'fornecedor',
  'compras',
  'lazer',
  'servicos',
  'outros',
] as const;

export type MacroCategory = (typeof MACRO_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  supermercado: 'Supermercado',
  restaurante: 'Restaurantes',
  combustivel: 'Combustível',
  fornecedor: 'Fornecedores',
  compras: 'Compras',
  lazer: 'Lazer',
  servicos: 'Serviços',
  outros: 'Outros',
};

export function categoryLabel(category: string | null | undefined): string {
  return category ? (CATEGORY_LABELS[category] ?? category) : 'Sem categoria';
}

export interface ReceiptDto {
  id: string;
  status: 'processing' | 'needs_review' | 'ready' | 'failed';
  failure_reason: string | null;
  category: string | null;
  supplier_id: string | null;
  taxes: Array<{ rate: number; base_cents: number; amount_cents: number }>;
  merchant: { name: string | null; nif: string | null };
  document: { number: string | null; date: string | null; currency: string };
  items: ReceiptItemDto[];
  totals: {
    subtotal_cents: number | null;
    tax_cents: number | null;
    discount_cents: number | null;
    tip_cents: number | null;
    total_cents: number | null;
  };
  warnings: string[];
  created_at: string;
}

export interface EditableItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  category?: string | null;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function uploadReceipt(
  imageUri: string,
): Promise<{ receipt_id: string; status: string }> {
  const form = new FormData();
  const name = imageUri.split('/').pop() ?? 'fatura.jpg';
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  // React Native aceita {uri, name, type} num FormData
  form.append('image', { uri: imageUri, name, type: mime } as unknown as Blob);
  const res = await fetch(`${API_URL}/receipts`, { method: 'POST', body: form });
  return handle(res);
}

export async function getReceipt(id: string): Promise<ReceiptDto> {
  return handle(await fetch(`${API_URL}/receipts/${id}`));
}

export async function listReceipts(): Promise<ReceiptDto[]> {
  return handle(await fetch(`${API_URL}/receipts`));
}

export async function updateItems(
  id: string,
  items: EditableItem[],
): Promise<ReceiptDto> {
  const res = await fetch(`${API_URL}/receipts/${id}/items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return handle(res);
}

export interface SupplierSummaryDto {
  id: string;
  name: string;
  nif: string | null;
  category: string | null;
  receipt_count: number;
  total_cents: number;
  last_receipt_at: string | null;
}

export interface SupplierDetailDto {
  id: string;
  name: string;
  nif: string | null;
  category: string | null;
  total_cents: number;
  receipts: Array<{
    id: string;
    date: string;
    category: string | null;
    total_cents: number | null;
    status: string;
  }>;
}

export interface StatsSummaryDto {
  month: string;
  total_cents: number;
  receipt_count: number;
  by_category: Array<{ category: string; total_cents: number; count: number }>;
  by_day: Array<{ day: string; total_cents: number }>;
  top_suppliers: Array<{
    supplier_id: string;
    name: string;
    total_cents: number;
    count: number;
  }>;
  previous_month_total_cents: number;
  insights: string[];
}

export interface ReportDto {
  rows: Array<{
    id: string;
    date: string;
    supplier: string | null;
    document_number: string | null;
    category: string | null;
    net_cents: number | null;
    tax_cents: number | null;
    total_cents: number;
  }>;
  totals: {
    net_cents: number;
    tax_cents: number;
    total_cents: number;
    receipt_count: number;
  };
}

export async function listSuppliers(): Promise<SupplierSummaryDto[]> {
  return handle(await fetch(`${API_URL}/suppliers`));
}

export async function getSupplier(id: string): Promise<SupplierDetailDto> {
  return handle(await fetch(`${API_URL}/suppliers/${id}`));
}

export async function getStatsSummary(
  month?: string,
): Promise<StatsSummaryDto> {
  const qs = month ? `?month=${month}` : '';
  return handle(await fetch(`${API_URL}/stats/summary${qs}`));
}

function reportQuery(filters: {
  month?: string;
  category?: string;
  supplier_id?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.category) params.set('category', filters.category);
  if (filters.supplier_id) params.set('supplier_id', filters.supplier_id);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getReport(filters: {
  month?: string;
  category?: string;
  supplier_id?: string;
}): Promise<ReportDto> {
  return handle(
    await fetch(`${API_URL}/reports/expenses${reportQuery(filters)}`),
  );
}

export function reportCsvUrl(filters: {
  month?: string;
  category?: string;
  supplier_id?: string;
}): string {
  return `${API_URL}/reports/expenses.csv${reportQuery(filters)}`;
}

export async function updateReceipt(
  id: string,
  body: { category?: MacroCategory; merchant_name?: string },
): Promise<ReceiptDto> {
  const res = await fetch(`${API_URL}/receipts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const euros = Math.trunc(Math.abs(cents) / 100);
  const remainder = Math.abs(cents) % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${euros},${String(remainder).padStart(2, '0')} €`;
}
