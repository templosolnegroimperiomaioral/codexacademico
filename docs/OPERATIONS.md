# Operação e publicação

## Domínio de produção

A URL canônica do Codex é:

```text
https://codexacademico.online
```

Defina `APP_BASE_URL=https://codexacademico.online`. No Google Cloud, cadastre os dois retornos abaixo sem alterar protocolo, domínio ou caminho:

```text
https://codexacademico.online/api/auth/google/callback
https://codexacademico.online/api/integrations/google/callback
```

## Variáveis obrigatórias

| Variável | Finalidade |
|---|---|
| `APP_BASE_URL` | Domínio externo utilizado por OAuth e links. |
| `DATABASE_URL` | Conexão MySQL da aplicação. |
| `JWT_SECRET` | Assinatura das sessões HTTP-only. |
| `CRON_SECRET` | Proteção da sincronização automática. |
| `GOOGLE_OAUTH_CLIENT_ID` | Identificador do cliente OAuth Google. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Segredo do cliente OAuth Google. |
| `MYSQL_PASSWORD` | Senha do usuário MySQL no Compose padrão. |
| `MYSQL_ROOT_PASSWORD` | Senha administrativa MySQL para inicialização e backup. |

Gere os segredos com `openssl rand -hex 32` e mantenha o `.env` fora do versionamento.

## VPS com Docker e Nginx

A composição padrão mantém o processo Node em `127.0.0.1:3000`. O Nginx recebe o tráfego público e faz o proxy para essa porta local.

```bash
cd /opt/codexacademico
cp .env.example .env
# edite .env

docker compose up -d --build
pnpm db:migrate
```

Copie `deploy/nginx-codexacademico.conf` para o Nginx, substitua `SEU-DOMINIO` por `codexacademico.online`, valide e recarregue a configuração.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://codexacademico.online/health
```

No Cloudflare, mantenha SSL/TLS em **Full (strict)** e instale um certificado válido no servidor de origem. Esse modo exige certificado válido e correspondente ao hostname de origem. [1]

## Coolify

Para publicar pelo Coolify, selecione **Docker Compose** e aponte para `docker-compose.coolify.yml`. A composição não publica portas no host: o proxy do Coolify acessa a porta interna `3000`. Defina o domínio da aplicação como `https://codexacademico.online:3000` na interface; o sufixo de porta informa a porta interna do contêiner, enquanto o proxy mantém o acesso público normal. [2]

Preencha na interface do Coolify todas as variáveis obrigatórias que aparecem na composição. O arquivo marca esses valores com a sintaxe `:?`, evitando uma implantação parcial quando um segredo estiver ausente. [2]

O endpoint de saúde é `/health`. O Dockerfile já possui `HEALTHCHECK`; em Coolify, mantenha a verificação ativa para que o proxy encaminhe tráfego somente à instância saudável. [3]

## Sincronização automática

Ative a sincronização pela interface depois de conectar uma conta Google. Na VPS, registre o cron:

```cron
*/15 * * * * /opt/codexacademico/scripts/sync-google.sh >> /var/log/codex-google-sync.log 2>&1
```

A chamada usa `CRON_SECRET` no header `x-cron-secret`. Não exponha esse segredo em logs, commits ou mensagens.

## Backup diário

Registre o backup após validar manualmente o script:

```cron
0 3 * * * APP_DIR=/opt/codexacademico /opt/codexacademico/scripts/backup-codex.sh >> /var/log/codex-backup.log 2>&1
```

Copie os arquivos de `backups/` para um armazenamento externo regularmente. Um backup local no mesmo disco não protege contra falha da VPS.

## Referências

[1] [Cloudflare — Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

[2] [Coolify — Docker Compose](https://coolify.io/docs/knowledge-base/docker/compose)

[3] [Coolify — Health checks](https://coolify.io/docs/knowledge-base/health-checks)
