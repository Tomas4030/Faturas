import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

function resolveApiUrl(): string {
  const override = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)
    ?.apiUrl;
  if (override) return override;
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:3000`;
}

export let API_URL = resolveApiUrl();

// Try to discover the actual API port (3000-3019)
async function discoverApi(): Promise<void> {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0] ?? 'localhost';
  for (let p = 3000; p < 3020; p++) {
    try {
      const res = await fetch(`http://${host}:${p}/auth/me`, { method: 'GET' });
      // 401 means the API is there (just unauthorized)
      if (res.status === 401 || res.ok) {
        API_URL = `http://${host}:${p}`;
        return;
      }
    } catch {
      // port not responding, try next
    }
  }
}

export const apiReady = discoverApi();

// --- Token management ---
let _token: string | null = null;

export async function loadToken(): Promise<string | null> {
  if (_token) return _token;
  _token = await AsyncStorage.getItem(TOKEN_KEY);
  return _token;
}

export async function setToken(token: string): Promise<void> {
  _token = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  _token = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return _token;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await loadToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Auth API ---
export async function apiRegister(email: string, password: string, name?: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  return handle<{ access_token: string; user_id: string }>(res);
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle<{ access_token: string; user_id: string }>(res);
}

export interface ProfileDto {
  id: string;
  email: string;
  name: string | null;
  plan: { name: string; priceCents: number; monthlyReceiptLimit: number } | null;
  usage: { receiptsScanned: number; splitsCreated: number };
}

export async function getProfile(): Promise<ProfileDto> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/auth/me`, { headers }));
}

// --- DTOs ---
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

export interface SplitSummaryDto {
  token: string;
  status: 'open' | 'closed';
  merchant_name: string | null;
  total_cents: number | null;
  participants: Array<{
    id: string;
    display_name: string;
    subtotal_cents: number;
    fees_cents: number;
    total_cents: number;
  }>;
  unclaimed: Array<{
    description: string;
    quantity_remaining: number;
    amount_cents: number;
  }>;
  warnings: string[];
}

// --- Helpers ---
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

// --- Authenticated API calls ---
export async function uploadReceipt(
  imageUri: string,
): Promise<{ receipt_id: string; status: string }> {
  const headers = await authHeaders();
  const form = new FormData();
  const name = imageUri.split('/').pop() ?? 'fatura.jpg';
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append('image', { uri: imageUri, name, type: mime } as unknown as Blob);
  const res = await fetch(`${API_URL}/receipts`, {
    method: 'POST',
    headers,
    body: form,
  });
  return handle(res);
}

export async function getReceipt(id: string): Promise<ReceiptDto> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/receipts/${id}`, { headers }));
}

export async function listReceipts(): Promise<ReceiptDto[]> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/receipts`, { headers }));
}

export async function updateItems(id: string, items: EditableItem[]): Promise<ReceiptDto> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/receipts/${id}/items`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return handle(res);
}

export async function updateReceipt(
  id: string,
  body: { category?: MacroCategory; merchant_name?: string },
): Promise<ReceiptDto> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/receipts/${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteReceipt(id: string): Promise<void> {
  const headers = await authHeaders();
  await handle(await fetch(`${API_URL}/receipts/${id}`, { method: 'DELETE', headers }));
}

export async function listSuppliers(): Promise<SupplierSummaryDto[]> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/suppliers`, { headers }));
}

export async function getSupplier(id: string): Promise<SupplierDetailDto> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/suppliers/${id}`, { headers }));
}

export async function renameSupplier(id: string, name: string): Promise<SupplierDetailDto> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handle(res);
}

export async function mergeSuppliers(sourceId: string, targetId: string): Promise<void> {
  const headers = await authHeaders();
  await handle(
    await fetch(`${API_URL}/suppliers/merge`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    }),
  );
}

export async function getStatsSummary(month?: string): Promise<StatsSummaryDto> {
  const headers = await authHeaders();
  const qs = month ? `?month=${month}` : '';
  return handle(await fetch(`${API_URL}/stats/summary${qs}`, { headers }));
}

export async function getReport(filters: {
  month?: string;
  category?: string;
  supplier_id?: string;
}): Promise<ReportDto> {
  const headers = await authHeaders();
  return handle(
    await fetch(`${API_URL}/reports/expenses${reportQuery(filters)}`, { headers }),
  );
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

export function reportCsvUrl(filters: {
  month?: string;
  category?: string;
  supplier_id?: string;
}): string {
  return `${API_URL}/reports/expenses.csv${reportQuery(filters)}`;
}

export async function createSplitSession(receiptId: string): Promise<{
  split_session_id: string;
  public_token: string;
  share_url: string;
}> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/receipts/${receiptId}/split-sessions`, {
    method: 'POST',
    headers,
  });
  const data = await handle<{
    split_session_id: string;
    public_token: string;
    share_path: string;
  }>(res);
  return { ...data, share_url: `${API_URL}${data.share_path}` };
}

export async function getSplitSummary(token: string): Promise<SplitSummaryDto> {
  return handle(await fetch(`${API_URL}/split-sessions/${token}/summary`));
}

export async function closeSplitSession(token: string): Promise<void> {
  const headers = await authHeaders();
  await handle(
    await fetch(`${API_URL}/split-sessions/${token}/close`, { method: 'POST', headers }),
  );
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const euros = Math.trunc(Math.abs(cents) / 100);
  const remainder = Math.abs(cents) % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${euros},${String(remainder).padStart(2, '0')} €`;
}

// --- Recurring Expenses ---
export interface RecurringExpenseDto {
  id: string;
  description: string;
  amountCents: number;
  category: string | null;
  dayOfMonth: number;
  active: boolean;
}

export async function listRecurringExpenses(): Promise<RecurringExpenseDto[]> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/recurring-expenses`, { headers }));
}

export async function createRecurringExpense(body: {
  description: string;
  amount_cents: number;
  category?: string;
  day_of_month?: number;
}): Promise<RecurringExpenseDto> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/recurring-expenses`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const headers = await authHeaders();
  await handle(await fetch(`${API_URL}/recurring-expenses/${id}`, { method: 'DELETE', headers }));
}

// --- Budgets ---
export interface BudgetDto {
  id: string;
  category: string;
  monthly_limit_cents: number;
  spent_cents: number;
}

export async function listBudgets(): Promise<BudgetDto[]> {
  const headers = await authHeaders();
  return handle(await fetch(`${API_URL}/budgets`, { headers }));
}

export async function createBudget(body: {
  category: string;
  monthly_limit_cents: number;
}): Promise<BudgetDto> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/budgets`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function deleteBudget(id: string): Promise<void> {
  const headers = await authHeaders();
  await handle(await fetch(`${API_URL}/budgets/${id}`, { method: 'DELETE', headers }));
}
