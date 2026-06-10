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

export interface ReceiptDto {
  id: string;
  status: 'processing' | 'needs_review' | 'ready' | 'failed';
  failure_reason: string | null;
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

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const euros = Math.trunc(Math.abs(cents) / 100);
  const remainder = Math.abs(cents) % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${euros},${String(remainder).padStart(2, '0')} €`;
}
