# Codex Acadêmico

> **O centro da sua vida acadêmica.**

O Codex consolida sinais de Gmail, Google Classroom e Google Agenda em uma experiência acadêmica única. A interface orienta o estudante pelas seis áreas do produto: **Hoje**, **Disciplinas**, **Agenda**, **Caixa Acadêmica**, **Materiais** e **Configurações**.

## Princípios do produto

O Codex organiza informação, mas não cria fatos oficiais. Itens vindos de integrações conservam sua origem e aparecem como sugestões até a revisão da pessoa usuária. A decisão de produto é simples: se uma função não reduz o trabalho de organização do estudante, ela não deve entrar no núcleo do Codex.

| Área | Resultado esperado |
|---|---|
| Hoje | Responder rapidamente à próxima aula, pendências, eventos e novidades. |
| Disciplinas | Centralizar professor, horários, sala, conteúdos, tarefas e materiais. |
| Agenda | Unificar Eventos Acadêmicos de qualquer origem. |
| Caixa Acadêmica | Reunir e revisar avisos de Gmail, Classroom e Agenda. |
| Materiais | Guardar links e arquivos por disciplina. |
| Configurações | Manter perfil, períodos, integrações e sincronização automática. |

## Arquitetura

O projeto é uma aplicação Node.js/Express com interface React/Vite, API tRPC e persistência MySQL via Drizzle. A autenticação é realizada com Google OAuth e sessões JWT HTTP-only próprias. Consulte os documentos abaixo para os contratos e decisões técnicas.

| Documento | Conteúdo |
|---|---|
| [Arquitetura](docs/ARCHITECTURE.md) | Camadas, módulos, dados e segurança. |
| [API](docs/API.md) | Procedimentos tRPC e rotas HTTP. |
| [Banco de dados](docs/DATABASE.md) | Entidades, migrações, seed e backup. |
| [Operações](docs/OPERATIONS.md) | VPS, Docker, Coolify, cron e recuperação. |
| [Roadmap](docs/ROADMAP.md) | Fundação concluída e evolução até a versão 1.0. |
| [PDD aplicado](docs/PDD_IMPLEMENTADO.md) | Tradução do Product Design Document para a versão atual. |

## Desenvolvimento local

Copie o arquivo de ambiente e preencha uma conexão MySQL de desenvolvimento. Não use credenciais de produção neste ambiente.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

A seed é idempotente e bloqueia execução em produção, exceto se `ALLOW_DEVELOPMENT_SEED=true` for definido intencionalmente.

## Verificações

```bash
pnpm check
pnpm test
pnpm build
```

## Publicação

O caminho padrão para VPS é o arquivo `docker-compose.yml`, que deixa a porta da aplicação acessível apenas em `127.0.0.1:3000` para o Nginx local. Para Coolify, use `docker-compose.coolify.yml`, informe `codexacademico.online:3000` como porta interna do serviço e configure todas as variáveis obrigatórias na interface do Coolify. Em composições Docker, o Coolify trata o arquivo Compose como fonte de verdade e detecta as variáveis nele referenciadas. [1]

A aplicação expõe `GET /health`. O Dockerfile e os arquivos Compose usam essa rota para que o proxy encaminhe tráfego apenas a instâncias saudáveis; health checks são importantes para atualizações sem indisponibilidade. [2]

> Antes da primeira publicação, configure no Google Cloud os callbacks `https://codexacademico.online/api/auth/google/callback` e `https://codexacademico.online/api/integrations/google/callback`.

## Licença

MIT.

## Referências

[1] [Coolify — Docker Compose](https://coolify.io/docs/knowledge-base/docker/compose)

[2] [Coolify — Health checks](https://coolify.io/docs/knowledge-base/health-checks)
