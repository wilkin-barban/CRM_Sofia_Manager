# Política de Segurança

O CRM Sofia Manager trata dados de clientes, pedidos e pagamentos. Levamos a sério
a divulgação responsável de vulnerabilidades e pedimos que você **não** abra uma
issue pública com detalhes de segurança.

## Versões suportadas

| Versão | Suporte |
| :--- | :--- |
| 0.1.x | ✅ Correções de segurança |
| < 0.1 | ❌ Sem suporte |

## Como reportar uma vulnerabilidade

Use os **GitHub Security Advisories** do repositório:

1. Acesse <https://github.com/wilkin-barban/CRM_Sofia_Manager/security/advisories/new>.
2. Descreva o impacto, os passos de reprodução e a versão afetada.
3. Inclua apenas o necessário: não anexe dados pessoais de clientes, credenciais,
   tokens ou dumps de produção.

O relato é privado entre você e os mantenedores. Não abra issues, discussions ou
pull requests públicos com detalhes exploráveis antes da correção ser publicada.

## Escopo

São de interesse especial:

- Bypass de RLS, escalada de privilégios ou acesso a pedidos e perfis de terceiros.
- Falhas em autenticação OTP, gates de webhook ou validação de assinatura
  (Mercado Pago, Evolution API, Telegram).
- Exposição de segredos ou de PII em logs, respostas de API ou artefatos de build.
- Injeção de prompt ou bypass de política no pipeline RAG da Sofia.

## Segredos e configuração

- Nenhuma credencial é versionada. Chaves de API, tokens e service role são
  fornecidos **somente por variáveis de ambiente** (`.env` local, ignorado pelo
  Git) ou pelo cofre de configuração do ambiente.
- `.env.example` contém apenas placeholders.
- As variáveis `NEXT_PUBLIC_*` são embutidas no bundle do cliente: nunca coloque
  segredos nelas.
- Relatos que incluam segredos reais devem ser enviados pelo canal privado acima.

## LGPD e privacidade

- Dados pessoais são coletados com base na execução do contrato de compra e tratados
  conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
- O acesso é restrito por RLS e por papéis de operador; logs e telemetria omitem PII.
- Pedidos de acesso, correção ou exclusão de dados devem ser feitos pelos canais
  privados do repositório, nunca em issue pública.

Este documento não registra endereço de e-mail de contato de propósito: o canal
oficial é o GitHub Security Advisories.
