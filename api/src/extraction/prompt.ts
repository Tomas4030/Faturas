export const EXTRACTION_PROMPT = `Analisa esta fatura portuguesa. Extrai os dados em JSON.

Regras obrigatórias:
- Não inventes valores. Se não tiveres a certeza de um valor, usa null.
- Cada item deve ter descrição, quantidade, preço unitário e total.
- Confirma se a soma dos itens corresponde ao total da fatura.
- Devolve warnings (em português) quando algo não bater certo.
- Os valores monetários são números em euros (ex.: 18.5), não strings.
- A data deve estar no formato YYYY-MM-DD.
- Responde APENAS com o JSON, sem texto adicional.

Formato exato da resposta:
{
  "merchant": { "name": string|null, "nif": string|null, "address": string|null },
  "document": { "type": "receipt"|"invoice"|null, "date": string|null, "number": string|null, "atcud": string|null, "currency": string|null },
  "items": [
    { "description": string, "quantity": number|null, "unit_price": number|null, "total": number|null, "category": string|null, "confidence": number|null }
  ],
  "taxes": [ { "rate": number|null, "base": number|null, "amount": number|null } ],
  "totals": { "subtotal": number|null, "tax": number|null, "discount": number|null, "tip": number|null, "grand_total": number|null },
  "warnings": [ string ]
}`;
