# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.1.0] - 2026-11-08

Primeira release pública, publicada em
`https://github.com/wilkin-barban/CRM_Sofia_Manager`.

### Adicionado

- Atendimento omnichannel com a agente Sofia nos canais Web, Telegram e WhatsApp
  (Evolution API v2).
- Carrinho interativo, console de atendimento em tempo real com filas IA/Humana e
  gestão transacional de estoque com RPCs atômicas no PostgreSQL.
- Pagamentos Pix e Mercado Pago com conciliação por webhooks idempotentes.
- Pipeline RAG com DeepSeek sobre a base de conhecimento de assados.
- Controles de privacidade e LGPD: RLS, autenticação OTP e validação regional de
  telefone (DDD 41).
- Notas de release em `docs/releases/v0.1.0.md` e política de segurança em
  `SECURITY.md`.

### Alterado

- Repositório migrado de `wilkinbarban/CRM_Sofia_Manager` para
  `wilkin-barban/CRM_Sofia_Manager`.
- README alinhado ao stack real: Tailwind CSS 4, PostgreSQL 17 e WhatsApp somente
  via Evolution API.
- Workflow de validação passa a rodar também em pushes para `main` e por
  `workflow_dispatch`.

### Corrigido

- Resolução de pacotes no `vitest.config.mts`: os aliases passam a aceitar o layout
  hoisteado do npm workspaces (raiz) além do layout aninhado em
  `apps/web/node_modules`, destravando a suíte hermética em instalações limpas.

### Segurança

- Dependências de runtime e build atualizadas nesta release: `next` 16.4.5
  (corrige advisory crítico de RCE), `eslint-config-next` 16.4.5, `sharp` 0.35.5 e
  `zod` 4.6.6, além de `npm audit fix` para achados transitivos (`undici`, `vite`,
  `source-map-js`).
- **Zero achados críticos e zero altos** no `npm audit` completo.
- `npm audit --omit=dev` (dependências de produção) reporta **0 vulnerabilidades**,
  ou seja, **0/0**.
- A árvore completa de desenvolvimento mantém 11 achados moderados em
  `eslint-config-next` → `typescript-eslint`/`minimatch` e em `vitest`, sem superfície
  em runtime; estão documentados no registro de risco de dependências
  (`docs/security/dependency-risk-acceptance-2026-09-07.md`).
- Esta release é source-first: não publica imagem Docker genérica, porque as
  variáveis `NEXT_PUBLIC_*` são embutidas em tempo de build.

[0.1.0]: https://github.com/wilkin-barban/CRM_Sofia_Manager/releases/tag/v0.1.0
