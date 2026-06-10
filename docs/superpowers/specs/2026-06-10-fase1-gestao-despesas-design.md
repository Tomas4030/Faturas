# Design — Fase 1: Gestão de Despesas (estilo Tinz)

**Data:** 2026-06-10
**Base:** Fase 0 concluída (foto → extração → revisão). Pivot de prioridade decidido pelo utilizador: gestão de despesas primeiro (inspiração: app.mytinz.com, ver relatório do utilizador), split de contas adiado para fase posterior.
**Plataforma:** App mobile Expo (web mais tarde). Backend NestJS existente.

## Objetivo

Transformar a app de "digitalizador com revisão" num gestor de despesas: fornecedores automáticos, dashboard com estatísticas e insights, e relatórios com IVA discriminado.

## Sub-fases

- **1a Entidades** — fornecedores automáticos + categoria por fatura com memória de correções
- **1b Dashboard** — estatísticas mensais, gráficos, top fornecedores, insights
- **1c Relatórios IVA** — totais s/ IVA / IVA / c/ IVA com filtros + export CSV

## 1a — Entidades/Fornecedores

### Schema (novas tabelas/campos)

`suppliers`: id, name, nif (nullable, unique se presente), normalized_name (unique), category (default sugerida para faturas deste fornecedor), created_at, updated_at.

`receipts` ganha: `supplier_id` (nullable FK), `category` (nullable, categoria macro da fatura).

`category_corrections`: id, normalized_merchant_name (unique), category, created_at — memoriza correções do utilizador (spec §19).

### Normalização de nomes

`normalizeName(name)`: minúsculas, remover acentos, remover pontuação, colapsar espaços, remover sufixos comuns ("lda", "sa", "unipessoal", "& cia"). "LIDL & CIA." → "lidl".

### Ligação automática

Ao confirmar uma fatura (PATCH items) ou ao terminar a extração:
1. Match por NIF (se existir) → 2. match por `normalized_name` → 3. cria supplier novo.
2. Categoria da fatura: 1.º `category_corrections` para o merchant → 2.º categoria default do supplier → 3.º categoria macro derivada dos itens da IA → 4.º null ("Outros").

Quando o utilizador corrige a categoria de uma fatura (`PATCH /receipts/:id` novo endpoint com `{ category?, merchant_name? }`), grava-se em `category_corrections` e atualiza-se a default do supplier.

### Categorias macro (fixas na Fase 1)

`supermercado`, `restaurante`, `combustivel`, `fornecedor`, `lazer`, `servicos`, `outros`. (Tabela própria de categorias custom fica para a Fase 2.)

### Endpoints

- `GET /suppliers` — lista com agregados: total_cents gasto, nº faturas, última fatura
- `GET /suppliers/:id` — detalhe + faturas do fornecedor
- `PATCH /receipts/:id` — corrigir categoria/nome do comerciante (grava correção)

### UI

Tab **Entidades**: lista (nome, total gasto, nº faturas) → detalhe (histórico de faturas, categoria default editável).

## 1b — Dashboard

### Endpoint

`GET /stats/summary?month=2026-06` devolve num só pedido:

```json
{
  "month": "2026-06",
  "total_cents": 48230,
  "receipt_count": 34,
  "by_category": [{ "category": "supermercado", "total_cents": 22145, "count": 12 }],
  "by_day": [{ "day": "2026-06-01", "total_cents": 1230 }],
  "top_suppliers": [{ "supplier_id": "...", "name": "Continente", "total_cents": 9870, "count": 4 }],
  "previous_month_total_cents": 41200,
  "insights": ["Gastaste 17% mais do que em maio.", "Continente representa 20% das despesas."]
}
```

Agregações SQL (Prisma `groupBy`) sobre receipts com status `ready`/`needs_review`. Insights gerados por regras simples no backend (variação vs mês anterior > 15%; fornecedor > 30% do total; categoria > 50% do total).

### UI

Tab **Início** (substitui a Home): seletor de mês, cartão grande total do mês + nº faturas, comparação com mês anterior, cartões por categoria, gráfico de barras por dia (Views nativas, sem lib de gráficos na Fase 1), top 5 fornecedores, cartões de insight. Botão flutuante central "+" para digitalizar (como o Tinz mobile). Navegação: bottom tabs (Início · Despesas · Entidades) com stack para Processing/Review/Detalhes.

## 1c — Relatórios IVA

### Dados

`receipt_taxes`: id, receipt_id, rate (int, ex.: 23), base_cents, amount_cents — persiste o array `taxes` da extração (hoje deitado fora). Quando não há discriminação de IVA, a fatura aparece no relatório com IVA "—".

### Endpoint

`GET /reports/expenses?month=&category=&supplier_id=` → lista de faturas com totais s/ IVA, IVA, c/ IVA + agregados do filtro. `GET /reports/expenses.csv?...` → mesmo filtrado em CSV (`;` como separador, vírgula decimal, UTF-8 BOM para Excel PT).

### UI

Tab/ecrã **Relatórios** dentro de Início (botão "Ver relatório"): tabela simples com filtros mês/categoria/fornecedor e botão "Exportar CSV" (share sheet nativo).

## Fora de âmbito (Fase 1)

Email-in, orçamentos, recorrentes (Fase 2 nova); split de contas (Fase 3); web dashboard; auth/multi-utilizador; lib de gráficos; food cost/stock/banco do Tinz.

## Erros e validação

- Migração Prisma com backfill: faturas existentes ganham supplier via normalização ao arrancar (script `npx prisma db seed` opcional — na Fase 1 basta ligar on-the-fly quando a fatura for aberta/listada? Não: backfill único na migração via script Node).
- Dinheiro continua em cêntimos; agregações somam inteiros.
- Mês sem dados → dashboard mostra zeros e call-to-action de digitalizar.

## Testes

- Unitários: `normalizeName` (acentos, sufixos, pontuação); matching de suppliers (NIF > nome > criar); regras de insights; geração CSV.
- Integração: confirmar fatura → supplier criado e agregados corretos; correção de categoria → próxima fatura do mesmo merchant vem com a categoria corrigida; `GET /stats/summary` com dataset conhecido.
