# API do Codex

## Convenções

A interface usa tRPC em `/api/trpc`. Procedimentos protegidos exigem a sessão JWT criada pelo login Google. Rotas HTTP são reservadas a autenticação, arquivos estáticos, saúde e tarefas agendadas.

| Tipo | Acesso | Finalidade |
|---|---|---|
| `publicProcedure` | Sem sessão | Identidade atual e encerramento de sessão. |
| `protectedProcedure` | Cookie de sessão válido | Dados acadêmicos e integrações do estudante. |
| HTTP protegido por segredo | Header de cron | Sincronização automática de contas conectadas. |

## Procedimentos tRPC

| Procedimento | Tipo | Responsabilidade |
|---|---|---|
| `auth.me` | Query pública | Retorna a pessoa autenticada ou `null`. |
| `auth.logout` | Mutation pública | Remove o cookie de sessão. |
| `academic.dashboard` | Query protegida | Retorna perfil, períodos, disciplinas, eventos, tarefas, materiais e assuntos de aula. |
| `academic.profile.save` | Mutation protegida | Salva nome, instituição, curso e fuso. |
| `academic.semesters.create` | Mutation protegida | Adiciona período acadêmico. |
| `academic.subjects.create` | Mutation protegida | Adiciona disciplina. |
| `academic.events.create` | Mutation protegida | Cria Evento Acadêmico manual. |
| `academic.tasks.create` | Mutation protegida | Cria pendência de estudo. |
| `academic.tasks.setCompleted` | Mutation protegida | Atualiza a conclusão de uma pendência. |
| `academic.tasks.delete` | Mutation protegida | Exclui uma pendência pertencente à pessoa usuária. |
| `academic.materials.createLink` | Mutation protegida | Associa um link a uma disciplina. |
| `academic.materials.upload` | Mutation protegida | Envia material para o armazenamento persistente. |
| `academic.lessonTopics.create` | Mutation protegida | Registra assunto previsto de aula. |
| `academic.lessonTopics.review` | Mutation protegida | Aprova ou descarta assunto detectado. |
| `academic.integrations.summary` | Query protegida | Retorna o estado de Gmail, Classroom e Agenda. |
| `academic.integrations.googleAuthorization` | Mutation protegida | Cria a URL de consentimento Google. |
| `academic.integrations.syncGoogle` | Mutation protegida | Executa sincronização manual. |
| `academic.integrations.notifications` | Query protegida | Carrega a Caixa Acadêmica. |
| `academic.integrations.reviewNotification` | Mutation protegida | Aprova ou descarta sugestão recebida. |
| `academic.integrations.enableAutoSync` | Mutation protegida | Ativa a sincronização periódica para a conta. |
| `academic.integrations.disableAutoSync` | Mutation protegida | Pausa a sincronização periódica. |

## Rotas HTTP

| Rota | Método | Finalidade |
|---|---|---|
| `/health` | `GET` | Retorna disponibilidade da aplicação para proxy e monitoramento. |
| `/api/auth/google/start` | `GET` | Inicia login com Google. |
| `/api/auth/google/callback` | `GET` | Recebe o retorno do Google e cria a sessão. |
| `/api/integrations/google/callback` | `GET` | Conclui a autorização das integrações Google. |
| `/api/scheduled/google-sync` | `POST` | Executa sincronização coletiva com `x-cron-secret`. |
| `/uploads/*` | `GET` | Serve materiais persistidos autorizados pelo armazenamento local. |

## Regras de evolução

Novas funcionalidades devem entrar como procedimentos coerentes com o domínio acadêmico. Não adicione um endpoint apenas para atender uma tela; primeiro defina a entidade, a origem dos dados, a política de acesso e o comportamento de revisão.
