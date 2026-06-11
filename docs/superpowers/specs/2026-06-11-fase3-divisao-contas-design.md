# Design — Fase 3: Divisão de Contas

**Data:** 2026-06-11
**Base:** Secções 10, 11, 13 e 17 da spec original. Fases 0-1 concluídas.

## Objetivo

Fatura confirmada → criador cria sessão de divisão → partilha link → amigos abrem no **browser** (sem instalar nada), escolhem os itens que consumiram → cada um vê quanto deve pagar.

## Fluxo

1. Na app, numa fatura `ready`: botão **"Dividir conta"** → `POST /receipts/:id/split-sessions` → devolve `share_url`.
2. Criador partilha o link pelo share sheet nativo (WhatsApp etc.).
3. Amigo abre `http://<host>:3000/s/<token>` no browser → página web mínima servida pela API: escreve o nome → vê a lista de itens → seleciona o que consumiu (com quantidade, ex.: 2 dos 6 pães) → grava → vê o seu total e o resumo.
4. Criador vê o resumo na app (ecrã SplitSummary com polling) e fecha a sessão.

## Schema (Prisma)

`split_sessions`: id, receipt_id FK, public_token (unique, aleatório forte — `spl_` + 24 chars), status (`open | closed`), expires_at (default +7 dias), created_at, updated_at.

`participants`: id, split_session_id FK, display_name, created_at. (Sem user_id — não há auth na app ainda.)

`participant_item_claims`: id, participant_id FK, receipt_item_id FK, quantity_claimed (Decimal). Único por (participant_id, receipt_item_id) — re-submeter substitui.

## Regras de cálculo (módulo central, TDD — spec §11/§12)

`computeSplit(receipt, claims)` em `api/src/split/split-math.ts`:

- `participant_subtotal` = Σ (quantity_claimed / item.quantity) × item.total_cents, arredondado por item.
- Proporcional: tax, tip e discount distribuídos por rácio do subtotal de cada participante.
- **Distribuição de cêntimos:** o total de todos tem de bater com a soma reclamada; resto distribuído 1 cêntimo de cada vez aos maiores participantes (ordem determinística).
- Itens não reclamados → secção `unclaimed` no resumo (o criador vê o que falta).
- Sobre-reclamação (Σ quantity_claimed > item.quantity) → warning no resumo, não bloqueia.

## Endpoints (contrato da spec §17)

- `POST /receipts/:id/split-sessions` → `{ split_session_id, public_token, share_url }` (só para receipts `ready`/`needs_review`; reutiliza sessão `open` existente)
- `GET /split-sessions/:token` → fatura (merchant, itens com qty/total) + participantes + claims
- `POST /split-sessions/:token/participants` body `{ display_name }` → `{ participant_id }`
- `PUT /split-sessions/:token/participants/:participantId/claims` body `{ claims: [{ receipt_item_id, quantity_claimed }] }` → substitui as claims do participante
- `GET /split-sessions/:token/summary` → totais por participante + unclaimed + warnings
- `POST /split-sessions/:token/close` → status `closed` (Fase 3: sem auth, qualquer um com o token pode fechar; auth real chega com o login)

Sessões expiradas/fechadas: claims e joins devolvem 410/400; GET e summary continuam a funcionar.

## Página web pública

`GET /s/:token` — HTML único (template estático em `api/src/split/public/split.html`, servido com o token injetado) com JS vanilla que consome os endpoints. Mobile-first, tema escuro/lima igual à app. Estado do participante guardado em `localStorage` (voltar ao link mantém a identidade).

## App mobile

- `ReviewScreen` (status `ready`) e `ExpensesScreen`: botão/ação **"Dividir conta"** → cria sessão → `Share.share({ url })` → navega para `SplitSummaryScreen`.
- `SplitSummaryScreen`: polling do summary a cada 3s — participantes, valor de cada um, itens por reclamar, botão "Fechar sessão" e re-partilhar link.
- `share_url` construído com o mesmo host da API (`API_URL`).

## Fora de âmbito (Fase 3)

Pagamentos/MB WAY (mostrar valores apenas), auth, push notifications, expiração configurável, edição da fatura depois de haver claims (bloqueia-se o PATCH items quando existe sessão aberta — warning na app).

## Testes

- Unitários `split-math`: item inteiro 1 pessoa; item dividido por 3 (10€/3 → 3,34+3,33+3,33); quantidade parcial (2 de 6 pães); proporcional de tax/tip (spec: A 30€ + B 70€, serviço 10€ → 3€/7€); descontos; soma sempre = total reclamado; unclaimed.
- e2e: criar sessão → 2 participantes → claims → summary correto → fechar → claims bloqueadas; token inválido → 404.
