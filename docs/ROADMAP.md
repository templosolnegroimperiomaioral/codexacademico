# Roadmap do Codex até a versão 1.0

## Sprint 1 — Estabilização

A Sprint 1 transforma a base existente em uma plataforma operável. Esta entrega cobre desacoplamento do ambiente anterior, configuração portátil de Vite, sessão própria, health check, Compose para VPS e Coolify, migrações rastreáveis, seed local, backup, documentação de arquitetura e operação.

| Resultado | Estado |
|---|---|
| Interface PWA e design system | Entregue |
| Autenticação Google e sessão própria | Entregue |
| Gmail, Classroom e Agenda | Entregue como integrações iniciais |
| Caixa Acadêmica com origem e revisão | Entregue |
| Deploy por Docker, Nginx ou Coolify | Entregue |
| Migrações, seed e backup | Entregue |
| Documentação técnica | Entregue |

## Sprint 2 — Integrações

A próxima prioridade é aprofundar as fontes de informação, sem aumentar a complexidade da interface. Google Drive deve ser o próximo conector, seguido por Outlook, Microsoft Calendar, OneDrive, Moodle, Canvas e Blackboard, conforme disponibilidade de APIs e consentimento da pessoa usuária.

## Sprint 3 — Inteligência assistiva

A inteligência deve interpretar, não inventar. O escopo inclui parser de e-mails, extração de prazos, detecção de mudança de sala, resumo de PDFs, transcrição de aulas, geração de resumos e pesquisa unificada sobre materiais importados. Cada ação que afete agenda ou tarefas deve permanecer sujeita à revisão.

## Sprint 4 — Núcleo acadêmico

A evolução acadêmica inclui notas, leituras, planejamento de estudos, revisões, flashcards e cronogramas. Essas capacidades devem aproveitar as disciplinas, Eventos Acadêmicos e materiais já existentes, evitando estruturas paralelas.

## Sprint 5 — NPJ e clientes nativos

O módulo opcional de NPJ deve se limitar à organização acadêmica: número do processo, audiência, vara, data, hora, origem e link externo. Ele não deve se transformar em gestão processual. Aplicativos Android e iOS entram depois que os fluxos PWA estiverem estabilizados.

> Critério de aceitação da versão 1.0: ao abrir o Codex, o estudante identifica rapidamente a próxima aula, entregas próximas, mudanças relevantes, leituras pendentes e provas ou audiências futuras.
