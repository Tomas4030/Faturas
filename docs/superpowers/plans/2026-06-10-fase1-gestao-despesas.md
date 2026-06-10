# Fase 1 — Gestão de Despesas: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fornecedores automáticos, dashboard com estatísticas/insights e relatórios com IVA na app mobile, por cima da Fase 0.

**Architecture:** Novas tabelas `suppliers`, `category_corrections`, `receipt_taxes`; ligação automática fatura→fornecedor na confirmação; endpoint agregador `/stats/summary`; relatório `/reports/expenses` (+CSV). App passa a bottom-tabs (Início · Despesas · Entidades).

**Tech Stack:** O existente (NestJS, Prisma 6, Expo SDK 54) + `@react-navigation/bottom-tabs` + `expo-sharing`/`expo-file-system` para o CSV.

---

### Task 1: Migração de schema (suppliers, category_corrections, receipt_taxes, campos novos)

**Files:** Modify `api/prisma/schema.prisma`

- [ ] Adicionar modelos `Supplier`, `CategoryCorrection`, `ReceiptTax`; campos `supplierId`, `category` em `Receipt`.
- [ ] `npx prisma migrate dev --name expense_management`
- [ ] Commit.

### Task 2: Normalização de nomes + matching de fornecedores (TDD)

**Files:** Create `api/src/suppliers/normalize.ts`, `normalize.spec.ts`, `suppliers.service.ts`, `suppliers.service.spec.ts` (matching com prisma mockado ou via integração)

- [ ] Testes de `normalizeName`: "LIDL & CIA." → "lidl"; "Continente, S.A." → "continente"; acentos ("Padaria São João" → "padaria sao joao"); "Makro Cash & Carry Unipessoal Lda" → "makro cash carry".
- [ ] Implementar; testes verdes.
- [ ] `findOrCreateSupplier({name, nif})`: match NIF → match normalized_name → create. Teste de integração.
- [ ] Resolução de categoria: corrections → supplier default → null. `recordCategoryCorrection(merchantName, category)`.
- [ ] Commit.

### Task 3: Ligar pipeline e endpoints de suppliers

**Files:** Modify `api/src/receipts/receipts.service.ts`; Create `api/src/suppliers/suppliers.controller.ts`, `suppliers.module.ts`

- [ ] Na extração concluída e no PATCH items: `findOrCreateSupplier` + resolver categoria; gravar `receipt_taxes` do JSON da IA.
- [ ] `PATCH /receipts/:id` body `{ category?, merchant_name? }` → atualiza, grava correção, atualiza default do supplier.
- [ ] `GET /suppliers` (agregados: total_cents, count, last_receipt_at), `GET /suppliers/:id` (com faturas).
- [ ] Script de backfill das faturas existentes (one-off em `api/scripts/backfill-suppliers.ts`, correr com ts-node).
- [ ] Teste e2e: upload mock → confirmar → supplier "Restaurante Sakura" criado; corrigir categoria → segunda fatura vem com categoria corrigida.
- [ ] Commit.

### Task 4: Endpoint /stats/summary com insights (TDD nas regras)

**Files:** Create `api/src/stats/stats.module.ts`, `stats.controller.ts`, `stats.service.ts`, `insights.ts`, `insights.spec.ts`

- [ ] `insights.spec.ts`: variação >15% vs mês anterior gera insight; fornecedor >30% gera insight; sem dados → [].
- [ ] `GET /stats/summary?month=YYYY-MM`: total, count, by_category, by_day, top_suppliers (5), previous_month_total, insights. Apenas receipts `ready`/`needs_review`.
- [ ] Teste e2e com dataset semeado.
- [ ] Commit.

### Task 5: Relatórios IVA + CSV

**Files:** Create `api/src/reports/reports.module.ts`, `reports.controller.ts`, `reports.service.ts`, `csv.ts`, `csv.spec.ts`

- [ ] `csv.spec.ts`: separador `;`, vírgula decimal, BOM UTF-8, escaping de `;` e aspas.
- [ ] `GET /reports/expenses?month=&category=&supplier_id=` → linhas (data, fornecedor, nº doc, categoria, s/IVA, IVA, c/IVA) + agregados.
- [ ] `GET /reports/expenses.csv?...` → `text/csv` com `Content-Disposition`.
- [ ] Commit.

### Task 6: App — bottom tabs + tab Despesas

**Files:** Modify `app/App.tsx`, `app/src/navigation.ts`; Create `app/src/screens/ExpensesScreen.tsx` (a partir da HomeScreen atual)

- [ ] `npx expo install @react-navigation/bottom-tabs`
- [ ] Tabs: Início (novo DashboardScreen placeholder) · Despesas (lista atual) · Entidades (placeholder). Stack global mantém Processing/Review.
- [ ] Botão digitalizar passa a FAB central na tab bar (ou botão no Início + Despesas).
- [ ] Commit.

### Task 7: App — Dashboard (Início)

**Files:** Create `app/src/screens/DashboardScreen.tsx`, `app/src/components/BarChart.tsx` (Views nativas), `CategoryCard.tsx`, `InsightCard.tsx`

- [ ] Seletor de mês (‹ junho 2026 ›), cartão total + nº faturas + comparação, cartões por categoria, barras por dia, top fornecedores, insights, estado vazio com CTA.
- [ ] Commit.

### Task 8: App — Entidades + correção de categoria

**Files:** Create `app/src/screens/SuppliersScreen.tsx`, `SupplierDetailScreen.tsx`; Modify `ReviewScreen.tsx` (picker de categoria), `app/src/api.ts`

- [ ] Lista de fornecedores (nome, total, nº faturas) → detalhe com faturas.
- [ ] Picker de categoria na revisão e no detalhe da fatura; chama `PATCH /receipts/:id`.
- [ ] Commit.

### Task 9: App — Relatório + export CSV

**Files:** Create `app/src/screens/ReportScreen.tsx`

- [ ] Filtros mês/categoria/fornecedor, tabela s/IVA·IVA·c/IVA, botão Exportar (download CSV → share sheet via expo-file-system + expo-sharing).
- [ ] Commit.

### Task 10: Verificação fim-a-fim

- [ ] `npm test` + `npm run test:e2e` na API verdes; `npx tsc --noEmit` na app limpo.
- [ ] Fluxo manual: digitalizar (mock) → confirmar → fornecedor criado → dashboard atualiza → relatório mostra IVA → export CSV.
- [ ] Atualizar README. Commit final.
