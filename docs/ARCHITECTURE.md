# Arquitetura do Codex

## Visão geral

O Codex é uma aplicação web modular dividida entre interface, API, domínio acadêmico e infraestrutura de operação. A organização privilegia isolamento de responsabilidades: a interface não acessa o banco; os fluxos de integração passam pela API; e dados externos só entram no domínio acadêmico após normalização e revisão.

```text
client/                 Interface React e componentes de experiência
server/                 API tRPC, OAuth, integrações e armazenamento local
shared/                 Tipos, filtros e contratos compartilhados
drizzle/                Esquema MySQL e migrações versionadas
scripts/                Operações recorrentes: sincronização e backup
deploy/                 Nginx e serviço para VPS
docs/                   Produto, arquitetura, API, banco e operação
```

## Camadas

| Camada | Responsabilidade | Regra de fronteira |
|---|---|---|
| `client/` | Navegação, formulários e revisão de sugestões | Consome somente tRPC e rotas HTTP públicas. |
| `server/routers.ts` | Contrato tRPC do produto | Valida input e delega regras ao domínio. |
| `server/db.ts` | Persistência e consultas acadêmicas | Centraliza acesso ao Drizzle/MySQL. |
| `server/googleIntegration.ts` | Gmail, Classroom e Agenda | Normaliza dados externos e registra origem. |
| `server/_core/session.ts` | JWT e sessão HTTP-only | Não depende de provedor de plataforma. |
| `drizzle/schema.ts` | Modelo de dados | Toda mudança é acompanhada por migração. |

## Autenticação e sessão

O login começa em `/api/auth/google/start`, retorna em `/api/auth/google/callback` e cria uma sessão JWT assinada pelo segredo `JWT_SECRET`. O token é enviado ao navegador em cookie HTTP-only. A API tRPC resolve a pessoa usuária no contexto da requisição por meio de `sessionService`.

> `JWT_SECRET` e `GOOGLE_OAUTH_CLIENT_SECRET` são segredos de produção. Eles pertencem ao ambiente de implantação, nunca ao repositório ou ao bundle do cliente.

## Dados acadêmicos e origem

A entidade `academicEvents` representa todo **Evento Acadêmico**: aula, prova, trabalho, apresentação, seminário, leitura, audiência, compromisso ou outro. Cada evento registra sua origem como manual, Gmail, Classroom ou Agenda.

A `academicNotifications` é a entrada da Caixa Acadêmica. Um item recebido não é automaticamente uma verdade operacional: seu `reviewStatus` passa por `pending`, `approved` ou `dismissed`. Essa separação permite que a automação organize, enquanto a pessoa usuária mantém controle.

## Integrações e sincronização

O Google OAuth fornece a autorização. Gmail, Classroom e Agenda usam conexões separadas, guardadas de forma cifrada pelo módulo de integração. A atualização automática é disparada pelo cron da VPS em `/api/scheduled/google-sync`, protegido por `CRON_SECRET`.

```text
Fonte Google → normalização → disciplina sugerida → dado extraído
      → notificação pendente → revisão da pessoa usuária → evento ou tarefa
```

## Armazenamento e backups

Materiais enviados são mantidos em `UPLOAD_DIR`; metadados ficam no MySQL. O backup deve cobrir os dois recursos. O script `scripts/backup-codex.sh` cria um dump lógico do MySQL e um arquivo compactado de uploads com retenção configurável.

## Saúde e exposição

A aplicação escuta em `0.0.0.0` dentro do contêiner e disponibiliza `GET /health`. Em VPS com Nginx, a porta 3000 é vinculada a `127.0.0.1`; em Coolify, a versão de Compose específica mantém a porta interna para o proxy da plataforma.
