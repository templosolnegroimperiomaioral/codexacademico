# Publicação do Codex Acadêmico em VPS

Este repositório foi preparado para executar fora do ambiente original, em uma VPS própria atrás de Cloudflare. A aplicação possui autenticação Google própria, sincronização agendada protegida por segredo, persistência de materiais no disco da VPS e experiência instalável como PWA.

> **Confirme o domínio antes de publicar.** O endereço informado foi `codexacademico.oline`; preencha `APP_BASE_URL` e `server_name` somente com o domínio que realmente está registrado e apontado para a VPS.

## 1. Pré-requisitos

A publicação direta exige Node.js 22, MySQL 8, Nginx, `curl` e uma conta de sistema restrita para a aplicação. Como alternativa, há um `docker-compose.yml` que sobe a aplicação e o MySQL. Não exponha a porta `3000` diretamente à internet; mantenha-a acessível apenas pelo Nginx local.

| Item | Uso no Codex |
|---|---|
| Domínio + Cloudflare | HTTPS público e proxy reverso |
| VPS | Execução do Node.js, Nginx e tarefa periódica |
| MySQL | Usuários, disciplinas, agenda, avisos e conexões criptografadas |
| Google Cloud | Login, Gmail, Classroom e Calendar |
| Diretório de uploads | Materiais enviados pelos usuários |

## 2. Configuração do Google Cloud

Crie um cliente OAuth do tipo **Aplicação Web** e mantenha o segredo somente no arquivo `.env` da VPS. O fluxo implementado usa códigos de autorização no servidor, com estado assinado e cookies HTTP-only.

Cadastre exatamente estes dois URIs de redirecionamento autorizados, substituindo `SEU-DOMINIO`:

```text
https://SEU-DOMINIO/api/auth/google/callback
https://SEU-DOMINIO/api/integrations/google/callback
```

Também habilite as APIs usadas pelo produto: Gmail API, Google Classroom API e Google Calendar API. O Google exige que cada URI de retorno seja idêntico ao URI registrado, incluindo esquema, maiúsculas/minúsculas e barra final; divergências retornam `redirect_uri_mismatch`. [1]

## 3. Preparação no servidor

```bash
sudo useradd --system --create-home --home-dir /opt/codexacademico --shell /usr/sbin/nologin codex
sudo mkdir -p /opt/codexacademico/uploads
sudo chown -R codex:codex /opt/codexacademico

sudo -u codex git clone https://github.com/templosolnegroimperiomaioral/codexacademico.git /opt/codexacademico
cd /opt/codexacademico
sudo -u codex cp .env.example .env
sudo chmod 600 .env
```

Edite `.env` e defina, no mínimo, `APP_BASE_URL`, `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` e `UPLOAD_DIR`. Gere `JWT_SECRET` e `CRON_SECRET` com valores aleatórios longos e exclusivos.

```bash
openssl rand -hex 32
```

Em seguida, instale as dependências, execute a migração e gere o pacote de produção.

```bash
sudo -u codex corepack enable
sudo -u codex pnpm install --frozen-lockfile
sudo -u codex pnpm db:push
sudo -u codex pnpm build
```

## 4. Serviço persistente e Nginx

Copie `deploy/codexacademico.service` para `/etc/systemd/system/codexacademico.service`, confira os caminhos e ative o serviço.

```bash
sudo cp deploy/codexacademico.service /etc/systemd/system/codexacademico.service
sudo systemctl daemon-reload
sudo systemctl enable --now codexacademico
sudo systemctl status codexacademico
```

Copie `deploy/nginx-codexacademico.conf` para `/etc/nginx/sites-available/codexacademico`, substitua ambos os `SEU-DOMINIO`, ative o virtual host e valide o Nginx.

```bash
sudo cp deploy/nginx-codexacademico.conf /etc/nginx/sites-available/codexacademico
sudo ln -s /etc/nginx/sites-available/codexacademico /etc/nginx/sites-enabled/codexacademico
sudo nginx -t
sudo systemctl reload nginx
```

No Cloudflare, aponte o registro DNS do domínio para o IP da VPS. Em **SSL/TLS**, use **Full (strict)** depois de instalar no servidor um certificado válido para o domínio, emitido por uma autoridade pública ou pela Origin CA do Cloudflare. Esse modo exige certificado não expirado e compatível com o hostname; sem isso, visitantes podem receber erro 526. [2]

## 5. Sincronização automática a cada 15 minutos

A interface permite que cada estudante ative ou pause sua própria sincronização. O cron abaixo dispara somente as contas que a ativaram; o endpoint aceita exclusivamente o segredo definido em `CRON_SECRET`.

```bash
sudo crontab -u codex -e
```

Inclua a linha:

```cron
*/15 * * * * /opt/codexacademico/scripts/sync-google.sh >> /var/log/codex-google-sync.log 2>&1
```

Crie o arquivo de log e entregue sua posse ao usuário do serviço:

```bash
sudo touch /var/log/codex-google-sync.log
sudo chown codex:codex /var/log/codex-google-sync.log
```

## 6. Alternativa com Docker

Preencha também `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` no `.env`. Depois, a partir da raiz do repositório, execute:

```bash
docker compose up -d --build
docker compose exec app pnpm db:push
```

O arquivo `docker-compose.yml` publica a aplicação apenas em `127.0.0.1:3000`; mantenha o mesmo Nginx como proxy público.

## 7. Verificação e backup

Após a publicação, confirme o serviço, o manifesto PWA e o agendador.

```bash
curl -I https://SEU-DOMINIO/
curl -I https://SEU-DOMINIO/manifest.webmanifest
sudo systemctl status codexacademico
```

Faça backup periódico do banco MySQL e de `UPLOAD_DIR`. Os uploads de materiais ficam nesse diretório, portanto um dump do banco isoladamente não recupera os arquivos enviados.

## Referências

[1] [Google — OAuth 2.0 para aplicações de servidor Web](https://developers.google.com/identity/protocols/oauth2/web-server)

[2] [Cloudflare — modo SSL/TLS Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
