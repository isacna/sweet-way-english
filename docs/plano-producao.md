# Plano: colocar o Sweet Way English em produção

Data: 2026-11-07. Complementa `docs/plano-plataforma-cursos.md` (conteúdo e pedagogia). Este documento trata de banco,
arquitetura do backend, frontend pendente e infraestrutura para o primeiro lançamento.

## 0. Decisões do dono (2026-11-07)

| Tema | Decisão |
|---|---|
| Hospedagem | VPS própria com Docker Compose |
| Lançamento | Piloto fechado, até ~50 alunos (alunos da professora e conhecidos) |
| Banco | Migrar de SQLite para PostgreSQL antes do lançamento |
| Escopo do dia 1 | Recuperar senha por e-mail; gestão de turmas da professora revisada; conteúdo A2 |
| Fora do dia 1 | Pagamento/assinatura (modelo ainda não definido) |

Isto substitui, para produção, a decisão "hospedagem local em SQLite" da seção 1.3.1 do plano do curso.

**Ainda a decidir:** provedor da VPS, domínio, provedor de e-mail transacional (sugestão: Resend ou Brevo, ambos com
plano grátis suficiente para o piloto) e onde guardar os backups fora da VPS (sugestão: Cloudflare R2 ou Backblaze B2).

## 1. Diagnóstico: o que impede ir para produção hoje

Verificado no código em 2026-11-07.

**Bloqueadores**
1. **Um erro de banco derruba a API.** As rotas antigas (turmas, atividades, avisos, feedbacks, materiais, entregas)
   chamam controllers `async` sem `try/catch` e sem o wrapper `h()` que as rotas do curso usam
   (ex.: `backend/src/http/routes/activity.routes.ts`). No Express 4 a promessa rejeitada não chega ao `errorHandler`,
   e o Node encerra o processo em rejeição não tratada.
2. **Atualizar a imagem Docker não entrega migrações nem conteúdo novos.** `docker-compose.yml` monta o volume
   `db_data` em `/app/prisma` inteiro, que também guarda `schema.prisma`, `migrations/`, `conteudo/` e `seed.ts`. Depois
   da primeira subida, a imagem nova fica escondida pelo volume antigo.
3. **O primeiro start em Docker cria contas com senha `senha123`** (`backend/entrypoint.sh` roda o seed sem checar ambiente).
4. **Arquivos enviados são públicos.** `/uploads` é servido estático sem login; entregas de alunos (inclusive menores)
   ficam acessíveis a quem tiver a URL. Há um PDF de upload commitado no git (`backend/uploads/`).
5. **URL da API amarrada ao build e a `localhost`.** `NEXT_PUBLIC_API_URL` é fixado no build; `apiUrl()` cai para
   `host:3333`; `professor/layout.tsx` e `professor/configuracoes` usam `localhost:3333` direto. Não há HTTPS nem proxy.

**Importantes**
- Token JWT no `localStorage` (roubável por XSS), 7 dias, sem como revogar; guarda de rotas só no cliente.
- Sem recuperação de senha nem verificação de e-mail.
- Validação com zod só nas rotas novas; rotas antigas checam papel inline (cerca de 25 lugares) e usam `as any`.
- Sem logs estruturados; `/api/health` não testa o banco; sem `trust proxy` (o rate limit vê todos com o mesmo IP atrás do proxy).
- Backend roda `tsx` direto do fonte em produção, sem build compilado.
- Sem backup de banco nem de uploads.
- CI só roda testes: falta `tsc`, lint, `next build`, build das imagens e validação do conteúdo.
- Telas antigas da professora fora dos tokens de design (piores: `professor/configuracoes`, `professor/turmas/[id]`, `professor/alunos`).
- Alunos que se cadastraram sozinhos (sem turma) não aparecem em `/professor/progresso`.
- Vídeo da home vem de uma CloudFront de terceiros; `AssetPreview` manda a URL do arquivo para o Google Docs Viewer.

## 2. Arquitetura alvo

```
Internet ──HTTPS──> Caddy (TLS automático, Let's Encrypt)
                     ├── /api/*, /uploads/*  ──> api   (Node 20, Express compilado)  ──> postgres (volume pgdata)
                     └── /*                  ──> web   (Next.js standalone)               uploads (volume)
                                                                         backup diário ──> R2/B2 (fora da VPS)
```

Escolhas e por quê:
- **Mesma origem** (`https://dominio/api`): o frontend chama `/api` relativo. Acaba o `NEXT_PUBLIC_API_URL` no build,
  o CORS e o problema de IP da rede local. A mesma imagem do frontend serve qualquer ambiente.
- **Sessão em cookie `httpOnly; Secure; SameSite=Lax`** no lugar do token no `localStorage`. Com mesma origem é simples,
  tira o token do alcance de XSS e permite guardar rotas no servidor (`proxy.ts` do Next 16) antes de renderizar.
  `Usuario.versaoToken` permite derrubar todas as sessões (troca de senha, aluno removido).
- **Uploads privados:** servidos por `GET /api/arquivos/:id` com checagem de quem pode ver (dono, professora da turma).
  Nomes aleatórios no disco; tipo real conferido pelos bytes do arquivo; arquivo apagado se a requisição for recusada.
  Disco local na VPS basta para o piloto (S3/R2 fica para a Fase 5+ do plano do curso).
- **Uma VPS só**, 2 vCPU / 4 GB (Hetzner, Contabo, DigitalOcean ou Hostinger; estimativa R$ 30–80/mês). Staging opcional
  como um segundo projeto Compose na mesma máquina.

### Backend em camadas (sem reescrever tudo de uma vez)

```
routes  →  controllers (HTTP: lê req, valida com zod, responde)
        →  services    (regras + Prisma; um por área: turmas, atividades, curso, conteúdo, auth)
        →  domain/     (regras puras, já existe: correcao, progresso, desbloqueio)
```

- Toda rota passa por um `asyncHandler` único (generaliza o `h()` de `curso.routes.ts`) e por `requireRole`.
- zod em todos os corpos e parâmetros; nada de `as any` nas rotas.
- `pino` para logs estruturados com id de requisição; erros 5xx logados com stack, sem dados pessoais.
- `env.ts` valida também `DATABASE_URL`, `APP_URL`, configuração de e-mail e `NODE_ENV`.
- Build com `tsc` para `dist/`; a imagem roda `node dist/server.js`.
- A camada de services entra área por área, começando pelas telas antigas da professora, que precisam ser revisadas de qualquer jeito.

## 3. Banco de dados (PostgreSQL)

**Estratégia:** como o banco real ainda é pequeno, gerar uma **nova migração base para Postgres** (as 9 migrações SQLite
ficam arquivadas) e levar os dados com um script de exportação/importação.

Mudanças de modelo, aproveitando a troca:
- **Índices** nas chaves estrangeiras que hoje não têm: `Turma.professorId`, `Aviso.turmaId`, `Matricula.turmaId`,
  `Atividade.turmaId`, `Submissao.atividadeId/alunoId`, `Feedback.professorId`, `MaterialApoio.turmaId`,
  `Exercicio.licaoId`, `ItemTeste.moduloId`, `ProgressoLicao.licaoId`, `NotaLicao.licaoId`, `RevisaoItem.exercicioId`,
  `TentativaTeste.moduloId`.
- **Enums** no lugar de strings: `Matricula.status`, `Exercicio.etapa` e `tipo`, `ItemTeste.habilidade`,
  `MaterialApoio.tipo`, `PerfilAprendiz.metodologia`.
- **`onDelete` explícito** nos modelos antigos (hoje as exclusões são feitas à mão em transações).
- **Timestamps** padronizados: `criadoEm` + `atualizadoEm` em todos os modelos editáveis.
- **E-mail sem diferenciar maiúsculas:** guardar normalizado (minúsculo) com índice único; some a busca em duas etapas do login.
- **Novos modelos:**
  - `TokenSenha` (recuperar senha): `usuarioId`, `hashToken`, `expiraEm` (1 h), `usadoEm`; só o hash fica no banco.
  - `Arquivo` (metadados dos uploads): `id`, `donoId`, `nomeOriginal`, `caminho`, `mime`, `tamanho`, `criadoEm`;
    `Submissao`, `Atividade` e `MaterialApoio` passam a apontar para ele.
  - `Usuario.versaoToken` (revogar sessões) e `Usuario.emailVerificadoEm` (opcional no piloto fechado).
- **Json continua** onde é conteúdo de lição/exercício (`apresentacao`, `conteudo`, `gabarito`), como `jsonb`.
- **Testes de integração contra Postgres real** no CI (container de serviço do GitHub Actions), além dos testes com mock.

## 4. Fases

### F0. Correções urgentes (1–2 dias, ainda no SQLite)
- `asyncHandler` em todas as rotas + `process.on('unhandledRejection')` logando.
- Seed seguro: em produção não cria contas demo; o admin inicial vem de variáveis (`ADMIN_EMAIL`, `ADMIN_SENHA`) e é obrigatório trocar a senha.
- Remover o PDF commitado em `backend/uploads/` e ignorar a pasta.
- `trust proxy`, health com ping no banco, roteador de atividades montado em dobro, validação de senha no `ConfigController`.

### F1. PostgreSQL e modelagem (3–5 dias)
- Revisão do schema (seção 3), migração base, script `migrar-sqlite-para-postgres` para usuários, turmas, progresso e notas.
- Docker Compose com Postgres; testes de integração com Postgres no CI.
- **Entregue (2026-11-08):** schema revisado (índices, enums, `onDelete`, timestamps, e-mail minúsculo), migração base
  `20261108000000_base_postgres`, `npm run db:migrar-sqlite`, serviço `postgres` no Compose (sem volume sobre
  `/app/prisma`; seed só com `SEED_ON_START=1`), `npm run test:db` no CI. `TokenSenha`, `Arquivo` e `versaoToken` ficam para a F2.

### F2. Backend (5–8 dias)
- Sessão em cookie `httpOnly`, `versaoToken`, logout no servidor.
- Recuperar senha: `POST /auth/esqueci-senha` (sempre responde igual, para não revelar quais e-mails existem; rate limit) e
  `POST /auth/redefinir-senha`; e-mail por um módulo `email/` com provedor trocável (Resend/Brevo/SMTP); em dev, só loga o link.
- Uploads privados (seção 2) com o modelo `Arquivo`.
- zod + `requireRole` em todas as rotas antigas; services de turmas, atividades, entregas, feedbacks e materiais.
- `pino`, build com `tsc`, `env.ts` completo.
- **Entregue (2026-11-08):** sessão em cookie `sw_sessao` com `versaoToken`, recuperar senha (`TokenSenha`, módulo
  `email/` com Resend) e uploads privados (`Arquivo`, `GET /api/arquivos/:id`). Rotas antigas com `requireRole` na rota e
  zod em parâmetros e corpos (`src/http/validacao.ts`); regras e Prisma em `src/services/` (turmas, atividades, avisos,
  materiais, submissoes, feedbacks, alunos, professores, configuracao), com erros tipados (`src/services/erros.ts`)
  mapeados pelo `errorHandler`. Logs com `pino`/`pino-http` (id de requisição, sem corpo, cookies nem dados pessoais;
  `LOG_LEVEL`). Build `tsc` para `dist/` (`npm start` = `node dist/server.js`) e imagem Docker em vários estágios, sem
  dependências de desenvolvimento, rodando como usuário `node`. O seed e os scripts de conteúdo seguem com `tsx`.

### F3. Frontend pendente (5–8 dias)
- API relativa (`/api`) e remoção dos `localhost:3333`; `.env.example` do frontend.
- `proxy.ts` (Next 16) guardando `/aluno/*` e `/professor/*` pelo cookie; tirar as checagens de `localStorage` por página.
- Telas "Esqueci minha senha" e "Nova senha".
- Revisão da gestão de turmas da professora: fluxos de turma, atividade, entrega, feedback e materiais conferidos de
  ponta a ponta e passados para os tokens de design (claro/escuro).
- `/professor/progresso` com alunos sem turma; download de arquivos pela rota privada; tirar o Google Docs Viewer.
- Vídeo da home hospedado no próprio servidor (versão comprimida + poster); esconder os cards de metodologia "Em breve".
- **LGPD (obrigatório com menores):** páginas de Termos de Uso e Política de Privacidade, link no cadastro, e um caminho
  para pedir exportação/exclusão de dados (no piloto pode ser por e-mail para o responsável).
- **Entregue, parte A (2026-11-08):** o navegador chama `/api` relativo; o Next repassa ao backend por `rewrites`
  (`BACKEND_URL`, fixado no build: build arg no Docker; `proxyClientMaxBodySize` em 25 MB para não cortar uploads de
  10 MB). Sem `NEXT_PUBLIC_API_URL` nem `localhost:3333` no código do navegador; `frontend/.env.example`; imagem do
  frontend em `node:24-alpine`. `src/proxy.ts` manda ao login quem está sem o cookie (ou com o JWT vencido) e cada papel
  para a própria área, antes de renderizar (o JWT só é decodificado; quem valida é o backend); as páginas do curso
  perderam a checagem de `localStorage` (as páginas antigas do aluno ainda a têm, e saem na revisão delas).
  `/professor/progresso` com o filtro "Alunos sem turma" (`?turmaId=sem-turma`; no piloto, qualquer professor vê).
  Vídeo da home em `frontend/public/video/` (WebM 0,5 MB + MP4 1,2 MB, 720p, poster, sem tocar com movimento reduzido
  ou economia de dados). Cards de metodologia "Em breve" escondidos atrás de uma constante. As telas de senha já
  vieram na F2; a revisão da gestão de turmas, o Google Docs Viewer e a LGPD ficam para a parte B.

### F4. Infraestrutura e deploy (3–4 dias)
- `docker-compose.prod.yml`: `caddy`, `web` (Next standalone), `api` (compilado), `postgres`; volumes só de dados
  (`pgdata`, `uploads`), nunca de código. Migrações rodam no start da `api` (`prisma migrate deploy`).
- GitHub Actions:
  - **CI** em todo PR: `tsc`, lint, testes backend (mock + Postgres), `next build`, `conteudo:validar`, build das imagens, e2e do curso.
  - **CD** ao fazer merge na `main` (ou tag): publica as imagens no GHCR e atualiza a VPS por SSH (`compose pull && up -d`).
- Backups: `pg_dump` diário + pasta de uploads, criptografados e enviados para R2/B2 (retenção de 30 dias);
  **teste de restauração** antes do lançamento.
- Monitoramento: Uptime Kuma (ou healthchecks.io) no `/api/health`; Sentry (plano grátis) opcional para erros do front e da API.
- VPS: SSH só por chave, firewall (80/443/22), atualizações automáticas de segurança, fail2ban.
- **Entregue (2026-11-08), menos o que depende da VPS e do domínio.** Passo a passo em `docs/deploy.md`.
  - **`docker-compose.prod.yml`** (projeto `sweetway`):
    - serviços `caddy` (Caddy 2.10, `deploy/Caddyfile`: HTTPS automático, `/api/*` direto ao backend e cabeçalhos de segurança), `frontend`, `backend`, `postgres` e `backup`;
    - só o Caddy publica portas;
    - as imagens vêm do GHCR, com a tag `IMAGEM_TAG` (sha ou `latest`);
    - `URL_PUBLICA` alimenta `APP_URL`, `FRONTEND_URL` e `CORS_ORIGIN`, e `TRUST_PROXY=1`.
  - **Backup** (`deploy/backup/`, imagem própria):
    - crond diário com `pg_dump` + uploads, criptografado com gpg (`BACKUP_SENHA`);
    - retenção de 30 dias, cópia opcional via rclone (R2/B2) e aviso pelo healthchecks.io;
    - `restaurar.sh teste|banco|uploads`.
  - **CI** (`.github/workflows/producao.yml`):
    - em todo PR, constrói as 3 imagens, sobe a stack inteira com o Caddy em `http://localhost`, roda os e2e públicos e do curso (31) através dele e testa backup + restauração;
    - na `main`, publica no GHCR e, com `VPS_HOST` configurado, faz deploy por SSH (`pull` + `up -d --wait`) e confere o `/api/health`.
  - **Workflows antigos:** agora em Node 24; o do backend roda `npm run build` e `conteudo:validar`, e o do frontend roda lint, `tsc` e `next build`.
  - **VPS:** `deploy/preparar-vps.sh` (Docker, usuário `deploy`, SSH só por chave, ufw, unattended-upgrades, fail2ban, swap).
  - **Monitoramento:** UptimeRobot no `/api/health` e healthchecks.io no backup (configuração na seção 6 do `deploy.md`). O Sentry ficou de fora.
  - **Bugs achados testando a stack:**
    - o primeiro acesso de um aluno com duas requisições ao mesmo tempo dava 500 (`obterPerfil` agora usa `INSERT … ON CONFLICT DO NOTHING`, com teste no Postgres);
    - o otimizador de imagens do Next travava sem permissão em `.next/cache` (corrigido no Dockerfile).
  - **Falta (precisa da VPS e do domínio):** criar a VPS, apontar o DNS, cadastrar as variáveis do environment `producao` no GitHub, configurar o rclone e os monitores, e fazer o teste de restauração na própria VPS.

### F5. Piloto (go-live)
Checklist: domínio com HTTPS, admin real criado e senha trocada, módulos revisados e publicados pela professora,
recuperação de senha testada com e-mail real, backup restaurado com sucesso em teste, termos e privacidade publicados,
contas de teste removidas, alerta de queda funcionando.

### Trilha paralela: conteúdo A2
Roda em paralelo a F0–F4, sem depender delas: 10 módulos A2 no mesmo formato JSON (`backend/prisma/conteudo/a2/`),
validados por `conteudo:validar` e revisados pela professora em `/professor/conteudo`. Mesmo método do A1
(seção 9.1 do plano do curso). É o item mais longo do escopo do dia 1; se atrasar, o piloto pode abrir com A1 e o A2 entrar
publicado aos poucos, já que a professora publica módulo a módulo.
- **Escrito (2026-11-09), falta a revisão da professora:**
  - **Volume:** os 10 módulos A2 (`a2/m01.json`…`m10.json`, PRs #12–#16), com 6 lições de 15 exercícios cada (900 no nível).
  - **Testes:** do M01 ao M09, 2 formas de 18 itens por módulo. O M10 é revisão, e o teste dele é a prova do nível A2: 2 formas de 30 itens, cobrindo todos os módulos, com tarefas no formato do A2 Key e itens originais.
  - **Correção:** todas as respostas aceitas do A1 e do A2 (4.467) passam no corretor real.
  - **Mudanças no app feitas junto:**
    - as opções de múltipla escolha aparecem embaralhadas por exercício (a certa era A ou B em 73% dos itens);
    - o corretor lê o `'s`/`'d` do aluno como *is/has* e *would/had*.
  - **Revisão:** cada PR lista os pontos que a professora deve conferir, quase sempre respostas aceitas por tolerância.

## 5. Ordem e estimativa

| Fase | Duração estimada | Depende de |
|---|---|---|
| F0 Correções urgentes | 1–2 dias | — |
| F1 PostgreSQL e modelagem | 3–5 dias | F0 |
| F2 Backend | 5–8 dias | F1 |
| F3 Frontend pendente | 5–8 dias | F2 (cookie, reset, uploads); a revisão visual pode começar antes |
| F4 Infra e deploy | 3–4 dias | F1; termina depois de F2/F3 |
| F5 Piloto | 1–2 dias | tudo acima |
| Conteúdo A2 | em paralelo | — |

Total aproximado: 4 a 6 semanas de desenvolvimento até o piloto, com A2 correndo em paralelo.

Custos mensais estimados do piloto: VPS R$ 30–80; domínio ~R$ 40/ano; e-mail transacional e backup dentro dos planos grátis.

## 6. Fora deste plano (fica para depois do piloto)
Pagamento/assinatura, B1, fala/IA (Fases 3–4 do plano do curso), S3/CDN, várias instâncias da API, app mobile.
