# Fase 0 — Protótipo de Digitalização de Faturas: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protótipo funcional: fotografar fatura no telemóvel (Expo Go) → upload → extração IA (Blackbox, OpenAI-compatible) → ecrã de revisão com itens editáveis e validação matemática.

**Architecture:** Monorepo com `api/` (NestJS + Prisma + PostgreSQL em Docker, imagens em disco local, extração assíncrona in-process com polling) e `app/` (Expo + TypeScript, 3 ecrãs). Dinheiro sempre em cêntimos inteiros, lógica monetária centralizada em `api/src/money/`.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL 16 (Docker), Zod, openai SDK (base URL configurável), Expo SDK (mais recente), expo-image-picker, Vitest/Jest para testes.

---

### Task 1: Infraestrutura do monorepo

**Files:**
- Create: `docker-compose.yml`, `.gitignore`, `README.md`

- [ ] **Step 1:** Criar `docker-compose.yml` com PostgreSQL 16:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: faturas
      POSTGRES_PASSWORD: faturas
      POSTGRES_DB: faturas
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [ ] **Step 2:** Criar `.gitignore` (node_modules, dist, .env, api/uploads, .expo).
- [ ] **Step 3:** `docker compose up -d` e verificar com `docker compose ps` (estado: running).
- [ ] **Step 4:** Commit: `chore: monorepo infra (postgres docker, gitignore)`

### Task 2: Scaffold da API NestJS + Prisma

**Files:**
- Create: `api/` (via `nest new`), `api/prisma/schema.prisma`, `api/.env`

- [ ] **Step 1:** `npx -y @nestjs/cli new api --package-manager npm --skip-git` na raiz.
- [ ] **Step 2:** Instalar deps: `npm i prisma @prisma/client zod openai @nestjs/config multer @types/multer`
- [ ] **Step 3:** `npx prisma init` e escrever o schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ReceiptStatus {
  processing
  needs_review
  ready
  failed
}

model Receipt {
  id              String        @id @default(cuid())
  merchantName    String?       @map("merchant_name")
  merchantNif     String?       @map("merchant_nif")
  documentNumber  String?       @map("document_number")
  documentDate    DateTime?     @map("document_date") @db.Date
  currency        String        @default("EUR")
  subtotalCents   Int?          @map("subtotal_cents")
  taxCents        Int?          @map("tax_cents")
  discountCents   Int?          @map("discount_cents")
  tipCents        Int?          @map("tip_cents")
  totalCents      Int?          @map("total_cents")
  status          ReceiptStatus @default(processing)
  imageStorageKey String        @map("image_storage_key")
  mimeType        String        @map("mime_type")
  fileSize        Int           @map("file_size")
  rawOcrJson      Json?         @map("raw_ocr_json")
  warnings        Json?
  failureReason   String?       @map("failure_reason")
  items           ReceiptItem[]
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@map("receipts")
}

model ReceiptItem {
  id             String   @id @default(cuid())
  receiptId      String   @map("receipt_id")
  receipt        Receipt  @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  description    String
  quantity       Decimal  @db.Decimal(10, 3)
  unitPriceCents Int      @map("unit_price_cents")
  totalCents     Int      @map("total_cents")
  category       String?
  confidence     Float?
  position       Int
  suspect        Boolean  @default(false)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("receipt_items")
}
```

- [ ] **Step 4:** `.env`: `DATABASE_URL`, `PORT=3000`, `EXTRACTION_MODE=mock`, `OPENAI_BASE_URL=https://api.blackbox.ai/v1`, `OPENAI_API_KEY=`, `EXTRACTION_MODEL=`. Criar `.env.example` commitável.
- [ ] **Step 5:** `npx prisma migrate dev --name init` — migração criada e aplicada.
- [ ] **Step 6:** Commit: `feat(api): nestjs scaffold + prisma schema (receipts, receipt_items)`

### Task 3: Módulo de dinheiro (TDD — núcleo crítico)

**Files:**
- Create: `api/src/money/money.ts`, Test: `api/src/money/money.spec.ts`

Interface:

```typescript
export function eurosToCents(value: number): number;          // 18.5 → 1850, arredonda a 0.5 cêntimo para cima
export function centsToEuros(cents: number): number;
export interface LineCheck { ok: boolean; expectedTotalCents: number; }
export function validateLine(quantity: number, unitPriceCents: number, totalCents: number, toleranceCents?: number): LineCheck; // default 5
export interface TotalsCheck { ok: boolean; computedTotalCents: number; differenceCents: number; }
export function validateTotals(args: { itemTotalsCents: number[]; taxCents: number; discountCents: number; tipCents: number; grandTotalCents: number; toleranceCents?: number }): TotalsCheck;
```

- [ ] **Step 1:** Escrever testes que falham: `eurosToCents(18.5)===1850`, `eurosToCents(0.1)+eurosToCents(0.2)===30`, `validateLine(2,1850,3700).ok===true`, `validateLine(2,1850,1850).ok===false` (caso "Menu Sushi" da spec), tolerância: `validateLine(3,333,1000).ok===true` (diferença 1 cêntimo), `validateTotals` com soma exata e com diferença > 5 cêntimos.
- [ ] **Step 2:** Correr `npm test -- money` → FAIL.
- [ ] **Step 3:** Implementar:

```typescript
export function eurosToCents(value: number): number {
  return Math.round(value * 100);
}
export function centsToEuros(cents: number): number {
  return cents / 100;
}
export function validateLine(quantity: number, unitPriceCents: number, totalCents: number, toleranceCents = 5): LineCheck {
  const expectedTotalCents = Math.round(quantity * unitPriceCents);
  return { ok: Math.abs(expectedTotalCents - totalCents) <= toleranceCents, expectedTotalCents };
}
export function validateTotals({ itemTotalsCents, taxCents, discountCents, tipCents, grandTotalCents, toleranceCents = 5 }: { itemTotalsCents: number[]; taxCents: number; discountCents: number; tipCents: number; tipCents: number; grandTotalCents: number; toleranceCents?: number }): TotalsCheck {
  const subtotal = itemTotalsCents.reduce((a, b) => a + b, 0);
  const computedTotalCents = subtotal + taxCents + tipCents - discountCents;
  const differenceCents = computedTotalCents - grandTotalCents;
  return { ok: Math.abs(differenceCents) <= toleranceCents, computedTotalCents, differenceCents };
}
```

Nota: se a fatura já incluir IVA nos preços dos itens (comum em PT), `taxCents` entra como 0 na validação do total — decisão tomada no pós-processamento (Task 4): valida primeiro com IVA incluído (subtotal dos itens ≈ grand_total) e só soma o IVA se a primeira validação falhar e a segunda passar.

- [ ] **Step 4:** `npm test -- money` → PASS.
- [ ] **Step 5:** Commit: `feat(api): money module with line/total validation (cents only)`

### Task 4: Schema Zod + pós-processamento da extração (TDD)

**Files:**
- Create: `api/src/extraction/schema.ts`, `api/src/extraction/postprocess.ts`
- Test: `api/src/extraction/postprocess.spec.ts`

- [ ] **Step 1:** Schema Zod do JSON da secção 7 da spec (merchant, document, items[], taxes[], totals, warnings[]), tudo `nullable/optional` exceto items com description+total. `ExtractionResult` tipado por inferência.
- [ ] **Step 2:** Testes de `postprocess(raw: unknown)`: JSON válido → itens em cêntimos, linhas validadas; linha `2 × 18.5 = 18.5` → `suspect: true` + warning "Quantidade e total não coincidem"; totais que não batem → warning global; JSON inválido → lança `ExtractionParseError`; preços null → item suspeito com warning.
- [ ] **Step 3:** Correr testes → FAIL. Implementar `postprocess`: parse Zod → converter para cêntimos (`eurosToCents`) → `validateLine` por item → `validateTotals` (estratégia IVA incluído/excluído da Task 3) → devolver `{ receiptFields, items, warnings }` prontos para gravar.
- [ ] **Step 4:** Testes PASS. Commit: `feat(api): extraction schema + postprocessing with math validation`

### Task 5: Serviço de extração (Blackbox/OpenAI-compatible + mock)

**Files:**
- Create: `api/src/extraction/extraction.service.ts`, `api/src/extraction/prompt.ts`, `api/src/extraction/mock-receipt.ts`

- [ ] **Step 1:** `prompt.ts` com o prompt da secção 24 da spec (PT, "Não inventes valores… usa null… devolve warnings") + instrução de devolver apenas JSON no schema dado.
- [ ] **Step 2:** `extraction.service.ts`: se `EXTRACTION_MODE=mock` → espera 2s e devolve `mock-receipt.ts` (fatura Restaurante Sakura da spec). Caso contrário: cliente `openai` com `baseURL`/`apiKey` do env, `chat.completions.create` com imagem em base64 (`image_url` data URI), `response_format: { type: 'json_object' }` se suportado; extrair JSON da resposta (tolerar cercas ```json); 1 retry em parse falhado; timeout 60s.
- [ ] **Step 3:** Teste unitário do parser de resposta (texto com cercas → JSON). Commit: `feat(api): extraction service with blackbox client and mock mode`

### Task 6: Módulo Receipts (endpoints da spec)

**Files:**
- Create: `api/src/receipts/receipts.module.ts`, `receipts.controller.ts`, `receipts.service.ts`, `api/src/prisma.service.ts`
- Modify: `api/src/app.module.ts`, `api/src/main.ts` (CORS on, listen `0.0.0.0`)

- [ ] **Step 1:** `POST /receipts` — `FileInterceptor` (multer, disco `api/uploads/`, limite 10MB, só jpeg/png/webp/heic) → cria Receipt `processing` → responde `201 { receipt_id, status }` → dispara `processReceipt(id)` sem await (com catch → status `failed`).
- [ ] **Step 2:** `processReceipt`: lê ficheiro → `extractionService.extract()` → `postprocess` → grava campos + items + `raw_ocr_json` + warnings, status `needs_review`; erro → `failed` + `failure_reason`.
- [ ] **Step 3:** `GET /receipts/:id` → DTO `{ id, status, merchant, document, items[], totals, warnings }` (valores em cêntimos, app formata). `GET /receipts` → lista resumida. `PATCH /receipts/:id/items` → body Zod `{ items: [{ description, quantity, unit_price_cents, total_cents, category? }] }` → substitui itens (transação), revalida com módulo money, atualiza totais/warnings, status `ready`.
- [ ] **Step 4:** Teste de integração (supertest + mock mode): upload PNG 1px → poll até `needs_review` → PATCH → `ready` e totais corretos.
- [ ] **Step 5:** Commit: `feat(api): receipts endpoints with async extraction pipeline`

### Task 7: Scaffold da app Expo

**Files:**
- Create: `app/` via `npx create-expo-app@latest app --template blank-typescript`

- [ ] **Step 1:** Criar app, instalar `expo-image-picker` e `@react-navigation/native @react-navigation/native-stack` (+ deps expo: `react-native-screens react-native-safe-area-context`).
- [ ] **Step 2:** `app/src/api.ts`: `API_URL` lido de `app.json` → `expo.extra.apiUrl` (IP da máquina na LAN, ex.: `http://192.168.1.x:3000`); funções `uploadReceipt(uri)`, `getReceipt(id)`, `listReceipts()`, `updateItems(id, items)`; helper `formatCents(cents) → "18,50 €"`.
- [ ] **Step 3:** Arrancar com `npx expo start` e confirmar no telemóvel. Commit: `feat(app): expo scaffold + api client`

### Task 8: Ecrãs Home, Processamento e Revisão

**Files:**
- Create: `app/src/screens/HomeScreen.tsx`, `ProcessingScreen.tsx`, `ReviewScreen.tsx`
- Modify: `app/App.tsx` (NavigationContainer + stack)

- [ ] **Step 1:** **Home**: botão grande "📷 Digitalizar fatura" → `ImagePicker.launchCameraAsync({ quality: 0.7 })` (fallback galeria) → `uploadReceipt` → navega para Processing com `receiptId`. Lista de faturas (`listReceipts`) com nome/data/total/estado, refresh ao focar.
- [ ] **Step 2:** **Processing**: polling `getReceipt` a cada 2s; `needs_review|ready` → substitui rota por Review; `failed` → mensagem da spec ("Foto pouco nítida…") + botão voltar.
- [ ] **Step 3:** **Review**: cabeçalho comerciante+data; lista de itens editáveis (description TextInput, quantity/preço unitário TextInput numérico, total recalculado ao editar), linha suspeita com fundo amarelo e aviso; apagar (swipe ou botão ✕) e "+ Adicionar item"; rodapé "Total detetado vs Total fatura" com diferença a vermelho se exceder tolerância; botão "Confirmar" → `updateItems` → volta a Home.
- [ ] **Step 4:** Teste manual no telemóvel com `EXTRACTION_MODE=mock`. Commit: `feat(app): home, processing and review screens`

### Task 9: Verificação fim-a-fim

- [ ] **Step 1:** `npm test` na API → tudo PASS.
- [ ] **Step 2:** Fluxo manual completo em mock: foto → processing → review → editar → confirmar → aparece na Home como `ready`.
- [ ] **Step 3:** Trocar `EXTRACTION_MODE=real` com a chave Blackbox do utilizador e testar com 2-3 faturas reais (utilizador).
- [ ] **Step 4:** Atualizar `README.md` (como arrancar: docker, api, app, configurar IP e .env). Commit final.

## Self-review

- Cobertura da spec de design: infra ✔ (T1), BD ✔ (T2), dinheiro ✔ (T3), schema+validação ✔ (T4), IA+mock ✔ (T5), endpoints+pipeline ✔ (T6), app 3 ecrãs ✔ (T7-8), testes ✔ (T3,T4,T6,T9), erros (failed/retry/timeout) ✔ (T5,T6,T8).
- Fora de âmbito mantido fora: sem auth, split, S3, Redis.
