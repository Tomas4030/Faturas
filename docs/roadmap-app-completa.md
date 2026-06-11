# Roadmap Para Uma App De Faturas Completa

Este documento reúne funcionalidades, melhorias técnicas e prioridades para tornar a app de faturas mais completa, segura e pronta para produção.

## Prioridade Alta

- Auth robusto com JWT seguro, refresh token e recuperação de password.
- Onboarding claro para explicar digitalização, categorias, relatórios e limites.
- Upload por câmara, galeria e PDF.
- OCR/IA real com fallback mock/local.
- Revisão manual completa da fatura antes de guardar.
- Validação forte de dinheiro sempre em cêntimos.
- Histórico de faturas com pesquisa, filtros e ordenação.
- Categorias editáveis por utilizador.
- Fornecedores isolados por utilizador.
- Estatísticas mensais com total, categorias, fornecedores e evolução.
- Export CSV/PDF autenticado.
- Backups e política de retenção de imagens.
- Testes e2e atualizados com auth.
- Typecheck, lint e testes na app e API.
- CI automático no GitHub Actions.

## Funcionalidades Financeiras

- Orçamentos mensais por categoria.
- Alertas quando o utilizador ultrapassa o orçamento.
- Despesas recorrentes.
- Comparação entre mês atual e mês anterior.
- Previsão de gastos até ao fim do mês.
- Deteção de faturas duplicadas.
- Deteção de anomalias, por exemplo: "gastaste 60% mais em restaurantes".
- Dashboard anual.
- Relatórios por fornecedor, categoria, período e IVA.
- Export para contabilista.

## Digitalização

- Melhor pré-processamento de imagem.
- Corte automático da fatura.
- Melhoria de contraste.
- Suporte a QR Code/ATCUD.
- Leitura de NIF, data, número do documento e IVA.
- Confiança por campo extraído.
- Marcação visual de campos suspeitos.
- Reprocessar fatura com IA.
- Guardar imagem original e versão comprimida.

## Split De Conta

- Divisão por itens.
- Divisão igual.
- Divisão por percentagem.
- Gorjeta e descontos.
- Link público com expiração.
- QR code para partilhar split.
- Fechar sessão só pelo dono.
- Resumo final por participante.
- Export/partilha do resumo.

## Fornecedores

- Página de detalhe do fornecedor.
- Renomear fornecedor.
- Merge de fornecedores duplicados.
- Categoria padrão por fornecedor.
- Histórico de gastos por fornecedor.
- Top fornecedores.
- Pesquisa por NIF/nome.
- Sugestões automáticas de categoria.

## App Mobile

- Estados de loading/erro mais bonitos.
- Empty states úteis.
- Pull to refresh.
- Pesquisa global.
- Filtros persistentes.
- Modo offline parcial.
- Sincronização quando voltar a haver internet.
- Notificações push.
- Tema claro/escuro.
- Biometrics para desbloquear.
- Melhor UX para editar itens da fatura.
- Partilha nativa de CSV/PDF.
- Ecrã de definições.

## Planos E Monetização

- Plano Free com limite mensal.
- Plano Basic/Pro/Business.
- Ecrã de upgrade.
- Contadores de uso.
- Limite de splits.
- Integração Stripe ou outro pagamento.
- Gestão de subscrição.
- Trial gratuito.
- Paywall suave quando atinge limite.

## Segurança

- `JWT_SECRET` obrigatório.
- CORS configurado por ambiente.
- Rate limiting.
- Validação Zod em todos os endpoints.
- Autorização por dono em todos os recursos.
- Upload com validação real do ficheiro.
- Limite de tamanho e tipo de ficheiro.
- Logs sem dados sensíveis.
- Encriptação/privacidade para imagens.
- Política GDPR: exportar dados e apagar conta.

## Infra

- Dockerfile para API.
- Docker Compose com API + DB.
- Migrations estáveis.
- Seed oficial de planos.
- CI com test/build/typecheck.
- Deploy configurado.
- Healthcheck.
- Logs estruturados.
- Monitorização de erros.
- Storage tipo S3 para imagens.
- Fila BullMQ/Redis para processamento OCR.

## Extra Para Ficar Premium

- Chat IA: "quanto gastei em supermercado este mês?"
- Insights automáticos semanais.
- Reconhecimento automático de subscrições.
- Sugestões para poupar.
- Multi-conta/família.
- Espaços separados: pessoal, empresa, família.
- Export SAF-T/contabilidade se o produto evoluir para uso profissional.
- Web dashboard além da app mobile.
- Admin panel para gerir planos, utilizadores e erros de extração.

## Sugestão De Fases

### MVP

- Auth segura.
- Upload por câmara/galeria.
- OCR/IA com revisão manual.
- Histórico de faturas.
- Categorias e fornecedores por utilizador.
- Estatísticas mensais básicas.
- Export CSV autenticado.
- Testes essenciais.

Progresso iniciado:

- `JWT_SECRET` passou a ser obrigatório.
- Split passou a exigir dono autenticado para criar/fechar sessões.
- Fornecedores e correções de categoria passaram a ser isolados por utilizador.
- Export CSV da app passou a enviar `Authorization`.
- Histórico de faturas recebeu pesquisa, filtros e ordenação.
- E2E foram atualizados para auth.
- App recebeu scripts de `typecheck`, `lint` e `test`.

### V1 Completa

- Orçamentos.
- Despesas recorrentes.
- Relatórios avançados.
- Split de conta robusto.
- Pesquisa e filtros.
- PDF export.
- Notificações.
- CI/CD.

### V2 Premium

- Planos pagos.
- Pagamentos e subscrições.
- IA para insights e chat financeiro.
- Multi-conta/família.
- Web dashboard.
- Storage em cloud.
- Processamento assíncrono com fila.

### Produção Profissional

- Segurança reforçada.
- GDPR completo.
- Monitorização e alertas.
- Admin panel.
- Deploy escalável.
- Integrações contabilísticas.
