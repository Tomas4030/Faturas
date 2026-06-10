# Design — Fase 0: Protótipo de Digitalização de Faturas

**Data:** 2026-06-10
**Base:** "Especificação Técnica — App Mobile de Digitalização de Faturas" (ver `spec.txt`)
**Âmbito:** Fase 0 da spec — provar o núcleo técnico: foto → extração IA → revisão manual. A divisão de contas (split sessions) fica para a fase seguinte.

## Objetivo

Conseguir fotografar faturas reais com o telemóvel, extrair os itens automaticamente e corrigi-los num ecrã de revisão. Critério de sucesso da spec: extrair itens de ~20 faturas reais com revisão manual funcional.

## Estrutura do projeto (monorepo)

```
faturas/
├── app/      # Expo + React Native + TypeScript (Expo Go no telemóvel)
├── api/      # NestJS + TypeScript + Prisma
├── docker-compose.yml   # PostgreSQL
└── docs/
```

## Stack

| Camada | Escolha | Nota |
|---|---|---|
| Mobile | Expo + React Native + TypeScript | Testado via Expo Go em telemóvel real |
| Backend | NestJS + TypeScript | Estrutura final da spec desde já |
| BD | PostgreSQL 16 em Docker | Prisma como ORM |
| Storage de imagens | Disco local (`api/uploads/`) | Campos da BD já preparados para S3 (`image_storage_key`, `mime_type`, `file_size`) |
| Extração IA | Cliente OpenAI-compatible → Blackbox API | `OPENAI_BASE_URL`, `OPENAI_API_KEY` e `EXTRACTION_MODEL` configuráveis via `.env`; modo `EXTRACTION_MODE=mock` para desenvolver sem custos |
| Fila | Nenhuma na Fase 0 | Extração corre assíncrona in-process; o contrato HTTP (status `processing`) já é o final, pelo que trocar para BullMQ depois não muda a API |
| Auth | Nenhuma na Fase 0 | A spec dispensa login no protótipo |

## Fluxo de dados

1. App tira foto (expo-camera / image picker) e faz `POST /receipts` (multipart).
2. API guarda imagem em disco, cria `receipt` com `status = "processing"`, devolve `{ receipt_id, status }` imediatamente e dispara a extração em background (in-process).
3. Worker de extração: envia a imagem ao modelo de visão com o prompt da spec → recebe JSON → valida com Zod contra schema fixo → converte valores para cêntimos → validação matemática → grava `receipt` + `receipt_items` + `raw_ocr_json`, status `needs_review` (ou `failed`).
4. App faz polling de `GET /receipts/:id` a cada ~2s até sair de `processing`.
5. Ecrã de revisão: utilizador edita/apaga/adiciona itens; app envia `PATCH /receipts/:id/items`; API revalida totais e grava, status `ready`.

## Regras de dinheiro (críticas, da spec)

- Todos os valores monetários em **cêntimos inteiros** (`*_cents INTEGER`), nunca floats.
- Validação matemática no backend: `quantity × unit_price_cents ≈ total_cents` por linha e `Σ linhas + tax − discount + tip ≈ grand_total`, com tolerância de 5 cêntimos (arredondamentos).
- Linhas que falham validação são marcadas (`warnings` na resposta) e destacadas no ecrã de revisão.
- Lógica monetária centralizada num único módulo (`api/src/money/`) com testes unitários.

## Schema da base de dados (Prisma)

`receipts`: id, merchant_name, merchant_nif, document_number, document_date, currency, subtotal_cents, tax_cents, discount_cents, tip_cents, total_cents, status (`processing | needs_review | ready | failed`), image_storage_key, mime_type, file_size, raw_ocr_json (JSONB), warnings (JSONB), created_at, updated_at. (Sem `user_id` na Fase 0 — adiciona-se com o login no MVP.)

`receipt_items`: id, receipt_id, description, quantity (decimal — há quantidades fracionárias, ex.: 0.450 kg), unit_price_cents, total_cents, category, confidence, position, suspect (bool), created_at, updated_at.

## API (contrato da spec)

- `POST /receipts` — multipart com a imagem → `201 { receipt_id, status: "processing" }`
- `GET /receipts/:id` — `{ id, status, merchant, document, items[], totals, warnings[] }`
- `PATCH /receipts/:id/items` — substitui a lista de itens revista; revalida e devolve o receipt atualizado
- `GET /receipts` — lista simples (para reabrir faturas no protótipo)

## Extração IA

- Prompt em PT conforme secção 24 da spec: "Não inventes valores. Se não tiveres certeza, usa null. (…) Devolve warnings quando algo não bater certo."
- Resposta forçada a JSON; validada com Zod contra o schema da secção 7 da spec (merchant, document, items, taxes, totals, warnings).
- Pós-processamento: normalizar moeda → cêntimos → validar totais → marcar linhas suspeitas → categorizar (a categoria vem da IA na Fase 0) → gravar.
- `EXTRACTION_MODE=mock` devolve uma fatura de exemplo fixa após 2s, para desenvolvimento offline.
- Guardar sempre a resposta bruta (`raw_ocr_json`) para debug.
- Se a imagem for ilegível ou o JSON inválido após 1 retry: status `failed` com mensagem para o utilizador tirar nova foto.

## App mobile (3 ecrãs)

1. **Home** — lista de faturas digitalizadas + botão grande "Digitalizar fatura" (câmara ou galeria).
2. **Processamento** — indicador de progresso com polling; erro → opção de tentar novamente.
3. **Revisão** — nome do comerciante, data, lista de itens editáveis (descrição, quantidade, preço unitário, total), apagar/adicionar item, totais detetados vs. fatura, linhas suspeitas destacadas a amarelo, botão "Confirmar".

A app fala com a API pelo IP da máquina na rede local (configurável), já que o Expo Go corre no telemóvel.

## Tratamento de erros

- Upload falha → mensagem clara + retry na app.
- Extração falha/timeout (60s) → `status = failed`, app sugere nova foto.
- JSON da IA inválido → 1 retry; depois `failed` com `raw_ocr_json` guardado.
- `PATCH` com valores inconsistentes → API aceita mas devolve warnings recalculados (o utilizador é a autoridade final, mas é avisado).

## Testes

- **Unitários (obrigatórios):** módulo de dinheiro — conversão para cêntimos, validação de linhas, validação de totais com tolerância, parsing/validação do JSON da IA (casos: linha errada `2 × 18.5 = 18.5`, totais que não batem, valores null).
- **Integração:** upload → extração mock → `needs_review` → PATCH → `ready`.
- **Manuais:** as ~20 faturas reais da Fase 0, via telemóvel.

## Fora de âmbito (Fase 0)

Login, divisão de contas/sessões, link partilhável, categorias corrigíveis com memória, estatísticas, planos/limites, pagamentos, S3, Redis/fila, pré-processamento de imagem avançado (apenas compressão/resize no upload).
