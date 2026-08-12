# Banco de dados do Codex

## Tecnologia e acesso

O Codex usa MySQL 8 com Drizzle ORM. A URL de conexão é fornecida exclusivamente por `DATABASE_URL`. Em Docker Compose, a aplicação usa o hostname interno `db`; em instalação externa, use a URL do MySQL gerenciado ou local.

## Entidades principais

| Grupo | Tabelas | Responsabilidade |
|---|---|---|
| Conta | `users`, `academicProfiles`, `semesters` | Identidade, preferências e períodos acadêmicos. |
| Organização | `subjects`, `academicEvents`, `studyTasks` | Disciplinas, eventos e pendências. |
| Conteúdo | `studyMaterials`, `lessonTopics` | Links, arquivos e conteúdos previstos de aula. |
| Integração | `integrationConnections`, `academicNotifications`, `integrationSyncSchedules` | Conexões Google, Caixa Acadêmica e atualização automática. |

## Evento Acadêmico

A tabela `academicEvents` unifica compromissos de diferentes fontes. Os tipos disponíveis são `class`, `exam`, `assignment`, `presentation`, `seminar`, `reading`, `hearing`, `appointment` e `other`. A coluna `source` identifica `manual`, `gmail`, `classroom` ou `calendar`.

## Migrações

O esquema fonte está em `drizzle/schema.ts`; a alteração correspondente deve estar em `drizzle/` e ser gerada em desenvolvimento.

```bash
# Desenvolvedor: gera uma migração a partir de uma alteração de schema.
pnpm db:generate

# Produção: aplica somente migrações já versionadas.
pnpm db:migrate
# Alias de publicação.
pnpm db:push
```

> Nunca execute `db:generate` durante a implantação. A produção deve receber apenas migrações revisadas e versionadas no repositório.

## Seed de desenvolvimento

A seed cria um perfil demonstrativo, período, disciplinas, aula, tarefa e notificação. Ela é idempotente para possibilitar repetição em ambiente local.

```bash
pnpm db:seed
```

O script interrompe a execução quando `NODE_ENV=production`, salvo se `ALLOW_DEVELOPMENT_SEED=true` for definido explicitamente. Esse escape existe apenas para ambientes de demonstração controlados.

## Backup e recuperação

O banco e os uploads são complementares: o dump MySQL preserva dados estruturados, enquanto o diretório `UPLOAD_DIR` preserva os arquivos vinculados aos materiais. Para uma instalação Docker na VPS:

```bash
APP_DIR=/opt/codexacademico /opt/codexacademico/scripts/backup-codex.sh
```

O script cria `mysql-<timestamp>.sql.gz` e `uploads-<timestamp>.tar.gz`, removendo arquivos com mais de 14 dias por padrão. Defina `RETENTION_DAYS` para alterar a política. Teste periodicamente a recuperação em um ambiente separado antes de confiar no backup para produção.
