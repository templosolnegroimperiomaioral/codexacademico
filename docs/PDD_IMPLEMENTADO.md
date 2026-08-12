# CODEX — Produto orientado pelo PDD

## Princípio operacional

> **O estudante deve gastar tempo estudando, não organizando informações.**

Esta versão reorganiza a aplicação em torno desse princípio. A interface não apresenta mais módulos paralelos como e-mail, tarefas e Classroom no menu principal. Esses sinais passam a convergir nas áreas que o estudante precisa consultar para agir.

| Área principal | Papel no produto | Implementação nesta versão |
|---|---|---|
| **Hoje** | Responder o que merece atenção agora | Seis blocos: próxima aula, pendências, próximos eventos, novidades, resumo semanal e atividades concluídas. |
| **Disciplinas** | Reunir o contexto de cada matéria | Estrutura única para professor, horários, sala, eventos, tarefas e materiais vinculados. |
| **Agenda** | Consolidar compromissos acadêmicos | Linha do tempo de Eventos Acadêmicos, com tipo, data, local, disciplina e origem. |
| **Caixa Acadêmica** | Centralizar avisos recebidos | Gmail, Classroom e Google Agenda aparecem juntos, com origem e revisão explícitas. |
| **Materiais** | Organizar links e arquivos | Biblioteca por disciplina com inclusão de links e arquivos. |
| **Configurações** | Controlar conta e conexões | Perfil, períodos acadêmicos e sincronização automática das integrações. |

## Modelo de Evento Acadêmico

O produto usa um único modelo para compromissos, independentemente da origem. Os tipos aceitos são **aula**, **prova**, **trabalho**, **apresentação**, **seminário**, **leitura**, **audiência**, **compromisso** e **outro**. A origem é mostrada na interface como Manual, Gmail, Classroom ou Google Agenda.

> A origem é preservada para que o estudante sempre saiba de onde a informação veio. Itens detectados automaticamente continuam sendo sugestões até a revisão da pessoa usuária.

## Pipeline de organização

A Caixa Acadêmica aplica o fluxo de produto que já existe nas integrações: receber uma informação, identificar a origem, relacionar a disciplina quando possível, extrair prazos ou datas e apresentar uma sugestão para confirmação. A interface diferencia sugestões pendentes, itens confirmados e descartados.

## Entrega atual e roadmap

| Entregue no pacote | Planejado para evolução posterior |
|---|---|
| PWA, interface responsiva e design system escuro | Aplicativos nativos Android e iOS |
| Google OAuth, Gmail, Google Classroom e Google Agenda | Google Drive, Outlook, OneDrive, Moodle, Canvas e Blackboard |
| Disciplinas, Eventos Acadêmicos, tarefas e materiais | Transcrição de aulas, geração de PDFs, flashcards e pesquisa semântica |
| Caixa Acadêmica com revisão de sugestões e cron de sincronização | Módulo acadêmico opcional de NPJ e integrações específicas de universidades |

## Publicação

Antes de publicar esta versão, execute a atualização de esquema do banco para aplicar os novos tipos de Evento Acadêmico:

```bash
pnpm db:push
```

Em seguida, gere e inicie a aplicação conforme o guia [`DEPLOY_VPS.md`](../DEPLOY_VPS.md). O arquivo `.env` de produção deve conter as credenciais de banco, as chaves de sessão, o segredo do cron e as credenciais OAuth do Google.
