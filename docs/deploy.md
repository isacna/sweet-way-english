# Deploy em produção (VPS)

Como o Sweet Way English roda na VPS (fase F4 do `docs/plano-producao.md`).

```
Internet ──443──▶ caddy ──/api/*──▶ backend (API compilada, :3333) ──▶ postgres (volume pgdata)
                   │                    └── volume uploads_data (arquivos privados)
                   └──── resto ──▶ frontend (Next standalone, :3000)
                  backup (crond): pg_dump + uploads todo dia ──▶ volume backups (+ R2/B2 opcional)
```

- Tudo está em `docker-compose.prod.yml` (projeto `sweetway`). Só o Caddy publica portas (80/443).
- O Caddy emite e renova o certificado HTTPS sozinho para `SITE_ENDERECO`.
- As imagens são publicadas pelo GitHub Actions no GHCR: `ghcr.io/isacna/sweet-way-english-{backend,frontend,backup}`, com as tags `latest` e o sha do commit.
- O backend aplica as migrações (`prisma migrate deploy`) toda vez que sobe.
- Arquivos: `deploy/Caddyfile`, `deploy/.env.prod.example`, `deploy/preparar-vps.sh`, `deploy/backup/`.

## 1. VPS e domínio

- **VPS:** Ubuntu 24.04 com 2 vCPU e 2–4 GB de RAM (o piloto de ~50 alunos cabe com folga). Crie com a sua chave SSH, não com senha.
- **Domínio:** crie um registro `A` (e `AAAA` se a VPS tiver IPv6) apontando para o IP da VPS. **Faça isso antes da primeira subida**, porque o Caddy só consegue o certificado com o DNS já apontado.
- **Sem domínio ainda:** dá para subir com `SITE_ENDERECO=http://IP-DA-VPS` e `URL_PUBLICA=http://IP-DA-VPS` só para conferir. Mas sem HTTPS **o login não funciona**: em produção o cookie de sessão é `Secure`, e o navegador só o aceita em HTTPS (ou em `localhost`). Não abra para alunos assim.

## 2. Preparar a VPS (uma vez)

```bash
scp deploy/preparar-vps.sh root@IP:/root/
ssh root@IP sh /root/preparar-vps.sh
```

O script:
- atualiza o sistema;
- instala o Docker;
- cria o usuário `deploy`, com a mesma chave SSH do root;
- deixa o SSH só por chave e sem login de root;
- liga o firewall (22, 80 e 443);
- liga as atualizações de segurança automáticas e o fail2ban;
- cria 2 GB de swap;
- cria `/opt/sweetway`.

Depois disso, entre sempre como `ssh deploy@IP`.

## 3. Primeira subida

Da sua máquina:

```bash
scp docker-compose.prod.yml deploy@IP:/opt/sweetway/
scp deploy/Caddyfile deploy@IP:/opt/sweetway/deploy/
scp deploy/.env.prod.example deploy@IP:/opt/sweetway/.env
```

Na VPS:

```bash
cd /opt/sweetway
nano .env          # preencha (segredos: openssl rand -hex 32)
chmod 600 .env
```

Preencha no `.env`:
- `SITE_ENDERECO` e `URL_PUBLICA`;
- `POSTGRES_PASSWORD` e `JWT_SECRET`;
- `RESEND_API_KEY`;
- `ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME`;
- `BACKUP_SENHA` (guarde uma cópia **fora** da VPS);
- `SEED_ON_START=1`, só nesta primeira vez.

As imagens do GHCR são privadas enquanto o repositório for privado. Para baixá-las à mão, faça login uma vez com um token do GitHub ("classic", só com o escopo `read:packages`):

```bash
echo SEU_TOKEN | docker login ghcr.io -u SEU_USUARIO_GITHUB --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f backend   # migrações, seed, "Server running"
```

O seed cria o admin e importa o curso A1 em revisão, para a professora publicar em `/professor/conteudo`. Depois de conferir, volte `SEED_ON_START=0` no `.env` (não precisa reiniciar nada agora).

Confira:
- `https://SEU_DOMINIO/api/health` responde `{"status":"ok"...}`;
- o login funciona com o admin;
- a troca da senha do admin funciona pelo site.

### Trazer os dados do computador local (opcional)

Para começar com os dados do Postgres local (`sweetway-pg`, porta 5433) em vez de um banco vazio, faça antes de abrir para os alunos:

```bash
# Local
docker exec sweetway-pg pg_dump -U sweetway -Fc sweetway > sweetway-local.dump
scp sweetway-local.dump deploy@IP:/opt/sweetway/

# VPS: para a API, substitui o banco e sobe de novo
cd /opt/sweetway
docker compose -f docker-compose.prod.yml stop backend frontend caddy
docker compose -f docker-compose.prod.yml exec -T postgres sh -c \
  'pg_restore --no-owner --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < sweetway-local.dump
docker compose -f docker-compose.prod.yml up -d
```

Os uploads locais (`backend/uploads/`) vão para o volume da mesma forma que no item "Restaurar" da seção 5: copie com `scp`, depois rode `tar` num container com o volume `sweetway_uploads_data` montado.

## 4. Deploy automático (GitHub Actions)

O workflow `.github/workflows/producao.yml` roda em todo PR e em toda mudança na `main`. Ele:
1. Constrói as 3 imagens.
2. Sobe a stack completa como na VPS (Caddy em `http://localhost`, seed de demonstração).
3. Roda os e2e através do Caddy: páginas públicas e o fluxo do curso.
4. Faz um backup e o restaura num banco temporário.
5. Só na `main`, se tudo passou: publica as imagens no GHCR (`latest` e o sha do commit). Se a VPS estiver configurada, faz o deploy.

Para ligar o deploy, cadastre no GitHub em *Settings → Environments → New environment* `producao`:

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `VPS_HOST` | IP ou domínio da VPS. Sem ela, o job de deploy não roda |
| Variable | `VPS_USUARIO` | `deploy` |
| Variable | `VPS_KNOWN_HOSTS` | saída de `ssh-keyscan -t ed25519 IP` (fixa a identidade da VPS) |
| Variable | `URL_PUBLICA` | `https://SEU_DOMINIO` (o workflow confere `/api/health` no fim) |
| Variable | `VPS_PASTA` | opcional; o padrão é `/opt/sweetway` |
| Secret | `VPS_CHAVE_SSH` | chave **privada** de uma chave nova, só para o deploy |

Gere a chave de deploy na sua máquina e autorize a parte pública na VPS:

```bash
ssh-keygen -t ed25519 -f sweetway-deploy -N "" -C github-deploy
ssh-copy-id -i sweetway-deploy.pub deploy@IP
# conteúdo de sweetway-deploy (privada) → secret VPS_CHAVE_SSH; depois apague o arquivo local
```

Em *Environments → producao* você pode exigir aprovação manual antes de cada deploy (*Required reviewers*).

O deploy faz quatro coisas:
- copia `docker-compose.prod.yml` e `deploy/Caddyfile` para a VPS;
- grava `IMAGEM_TAG=<sha>` no `.env`;
- roda `pull` e `up -d --wait`, usando o token da própria execução para o GHCR, então não precisa de token guardado na VPS;
- confere `URL_PUBLICA/api/health`.

### Voltar uma versão

Na VPS:

```bash
cd /opt/sweetway
sed -i 's/^IMAGEM_TAG=.*/IMAGEM_TAG=<sha-anterior>/' .env
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
```

Cuidado: se a versão nova trouxe uma migração, voltar a imagem **não desfaz** a migração. Para voltar o banco também, restaure o backup anterior ao deploy (seção 5).

## 5. Backups

O serviço `backup` roda todo dia em `BACKUP_HORARIO` (padrão 03:30, no fuso `TZ`). Ele grava `sweetway-AAAAMMDD-HHMMSS.tar.gpg` no volume `sweetway_backups`. Cada arquivo tem:
- `banco.dump`: o `pg_dump` no formato custom;
- `uploads.tar.gz`: a pasta de uploads.

O arquivo é criptografado com `BACKUP_SENHA` (gpg, AES-256), e a retenção é de `BACKUP_RETENCAO_DIAS` (30).

**Cópia fora da VPS:** use o Cloudflare R2 (10 GB grátis) ou o Backblaze B2.
1. Crie um bucket e uma chave de acesso.
2. Configure o rclone:

   ```bash
   cd /opt/sweetway
   docker compose -f docker-compose.prod.yml run --rm backup rclone config   # gera deploy/rclone/rclone.conf
   ```

3. No `.env`, defina `BACKUP_RCLONE_DESTINO=r2:sweetway-backups` (`remoto:bucket`), depois rode `docker compose -f docker-compose.prod.yml up -d backup`.

Sem `BACKUP_SENHA`, nada sai da VPS.

**Aviso de falha:** crie um check no [healthchecks.io](https://healthchecks.io), com período de 1 dia e tolerância de 2 horas. Ponha a URL em `BACKUP_PING_URL`. O backup avisa quando começa, quando termina e quando falha. Se não rodar, o healthchecks.io manda e-mail.

Comandos (na VPS, em `/opt/sweetway`; `dc` = `docker compose -f docker-compose.prod.yml`):

```bash
dc exec backup backup.sh                       # backup agora
dc exec backup ls -lh /backups                 # lista
dc exec backup restaurar.sh teste ultimo       # TESTE de restauração: restaura num banco temporário, conta linhas, apaga
```

**Teste de restauração:** faça um antes de abrir o piloto e depois uma vez por mês. O CI também testa em todo PR.

**Restaurar de verdade** (perda de dados ou um deploy que deu errado):

```bash
dc stop backend frontend
dc run --rm -e CONFIRMAR=sim backup restaurar.sh banco sweetway-20261108-033000.tar.gpg
dc run --rm -v sweetway_uploads_data:/uploads-destino backup restaurar.sh uploads sweetway-20261108-033000.tar.gpg
dc up -d
```

Backup vindo de fora (R2/B2): `dc run --rm backup rclone copy r2:sweetway-backups/ARQUIVO /backups/`.

## 6. Monitoramento e logs

- **Site no ar:** cadastre `https://SEU_DOMINIO/api/health` no [UptimeRobot](https://uptimerobot.com) (grátis, de 5 em 5 minutos, alerta por e-mail ou Telegram). O health também confere o banco (`SELECT 1`).
- **Backup:** pelo healthchecks.io (acima).
- **Logs:** JSON no stdout, com rotação de 10 MB × 5 arquivos por serviço.
  - `dc logs -f backend`, ou `dc logs --since 1h backend | grep '"level":50'` para ver os erros.
  - Cada requisição tem um `X-Request-Id`, que também volta na resposta.
- **Uso:** `docker stats` e `df -h` (backups e uploads crescem com o tempo).

## 7. Testar a stack de produção localmente

Sem domínio, no seu computador, com o Docker Desktop:

```bash
cp deploy/.env.prod.example .env.prod.local
# SITE_ENDERECO=http://localhost, URL_PUBLICA=http://localhost, POSTGRES_PASSWORD, JWT_SECRET,
# SEED_ON_START=1, SEED_DEMO=1, SEED_PUBLICAR_CONTEUDO=1
docker compose -f docker-compose.prod.yml --env-file .env.prod.local up -d --build --wait
# http://localhost (o cookie Secure funciona em localhost). Para apagar tudo, inclusive os dados:
docker compose -f docker-compose.prod.yml --env-file .env.prod.local down -v
```

Se as portas 80 ou 443 estiverem ocupadas, use outras com `PORTA_HTTP=8080` e `PORTA_HTTPS=8443` (e `URL_PUBLICA=http://localhost:8080`). O projeto `sweetway` tem volumes próprios, separados do `docker-compose.yml` de desenvolvimento e do `sweetway-pg`.
