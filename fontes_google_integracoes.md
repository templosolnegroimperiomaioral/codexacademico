# Fontes oficiais — integrações Google

## Custos do serviço de mensagens

O Google Cloud Pub/Sub oferece **10 GiB mensais de tráfego sem custo** por conta de faturamento. Acima dessa franquia, a tabela oficial informa cobrança de **US$ 40 por TiB** de tráfego de publicação ou entrega. Para o Codex, cada aviso recebido do Gmail ou Classroom é pequeno; uma operação pessoal ou uma turma pequena tende a permanecer com ampla margem dentro da franquia. Custos de armazenamento só incidem se as mensagens forem retidas por mais tempo que o necessário; o preço informado é **US$ 0,27 por GiB/mês**.

Referências: [preços do Pub/Sub](https://cloud.google.com/pubsub/pricing) e [programa gratuito do Google Cloud](https://cloud.google.com/free/docs/free-cloud-features), consultadas em 11 de agosto de 2026.

## Requisitos técnicos observados

- O Gmail API pode enviar atualizações de caixa de entrada por meio do Google Cloud Pub/Sub; a autorização de observação deve ser renovada pelo menos uma vez a cada sete dias. Fonte: [Gmail API — push notifications](https://developers.google.com/workspace/gmail/api/guides/push).
- O Google Classroom envia mudanças por tópico Pub/Sub, normalmente em poucos minutos. Cada registro expira em uma semana e precisa ser renovado. Fonte: [Classroom API — push notifications](https://developers.google.com/workspace/classroom/best-practices/push-notifications).
- O Google Calendar oferece notificações para um endereço HTTPS próprio. Os canais expiram e precisam ser recriados periodicamente. Fonte: [Calendar API — push notifications](https://developers.google.com/workspace/calendar/api/guides/push).
