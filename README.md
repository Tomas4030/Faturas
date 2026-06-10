# Faturas — Fase 0 (Protótipo)

App mobile que fotografa uma fatura, extrai os itens com IA e permite revisão manual antes de confirmar. Base da futura app de divisão de contas e gestão de gastos (ver `spec.txt` e `docs/`).

## Estrutura

- `api/` — NestJS + Prisma + PostgreSQL. Upload de imagem, extração assíncrona, validação matemática (dinheiro em cêntimos).
- `app/` — Expo + React Native. Ecrãs: Home → Processamento → Revisão.
- `docker-compose.yml` — PostgreSQL 16.

## Arrancar

### 1. Base de dados

```powershell
docker compose up -d
```

### 2. API

```powershell
cd api
npm install
npx prisma migrate dev   # primeira vez
npm run start:dev        # http://localhost:3000
```

Configuração em `api/.env` (copiar de `.env.example`):

| Variável | Descrição |
|---|---|
| `EXTRACTION_MODE` | `mock` (fatura de exemplo, sem custos) ou `real` |
| `OPENAI_BASE_URL` | Endpoint OpenAI-compatible (Blackbox: `https://api.blackbox.ai/v1`) |
| `OPENAI_API_KEY` | A tua chave |
| `EXTRACTION_MODEL` | Modelo com visão disponível no provider |

### 3. App mobile

```powershell
cd app
npm install
npx expo start
```

Lê o QR code com a app **Expo Go** no telemóvel (mesma rede Wi-Fi que o PC). A app descobre o IP da API automaticamente; para forçar outro endereço, define `expo.extra.apiUrl` no `app.json`.

> Atenção: a firewall do Windows tem de permitir ligações de entrada na porta 3000 (Node.js) para o telemóvel chegar à API.

## Testes

```powershell
cd api
npm test        # unitários (dinheiro, pós-processamento, parser)
npm run test:e2e  # integração (upload → extração → revisão)
```

## Endpoints

- `POST /receipts` — multipart `image` → `{ receipt_id, status: "processing" }`
- `GET /receipts/:id` — estado + itens + totais + warnings
- `GET /receipts` — lista
- `PATCH /receipts/:id/items` — itens revistos pelo utilizador → status `ready`

## Regras críticas (da especificação)

- Dinheiro **sempre em cêntimos inteiros**, nunca floats (`api/src/money/`).
- `quantidade × preço unitário = total` validado por linha, tolerância de 5 cêntimos; linhas inconsistentes marcadas como suspeitas.
- A IA nunca é fonte de verdade: o utilizador confirma tudo no ecrã de revisão.
- A resposta bruta da IA fica guardada em `raw_ocr_json` para debug.
