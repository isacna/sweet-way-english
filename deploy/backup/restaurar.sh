#!/bin/sh
# Restaura um backup feito pelo backup.sh. Rode pelo compose (mesmas variáveis PG* e BACKUP_SENHA):
#
#   restaurar.sh teste   ARQUIVO   restaura o banco num banco temporário, confere e apaga (não mexe em nada)
#   restaurar.sh banco   ARQUIVO   SUBSTITUI o banco atual pelo do backup (exige CONFIRMAR=sim)
#   restaurar.sh uploads ARQUIVO   extrai os uploads em /uploads-destino (monte o volume de uploads ali)
#
# ARQUIVO: nome dentro de /backups (ex.: sweetway-20261108-033000.tar.gpg) ou caminho completo.
# `ultimo` como ARQUIVO usa o backup mais recente. Passo a passo: docs/deploy.md ("Backups").
set -eu

MODO="${1:-}"
ARG="${2:-}"
[ -n "$MODO" ] && [ -n "$ARG" ] || { sed -n '2,10p' "$0"; exit 2; }

if [ "$ARG" = "ultimo" ]; then
  ARG="$(ls -1t /backups/sweetway-*.tar* 2>/dev/null | head -n1)"
  [ -n "$ARG" ] || { echo "Nenhum backup em /backups."; exit 1; }
fi
case "$ARG" in /*) ARQ="$ARG" ;; *) ARQ="/backups/$ARG" ;; esac
[ -f "$ARQ" ] || { echo "Não achei $ARQ"; exit 1; }
echo "Backup: $(basename "$ARQ")"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TAR="$ARQ"
case "$ARQ" in
  *.gpg)
    [ -n "${BACKUP_SENHA:-}" ] || { echo "Backup criptografado: defina BACKUP_SENHA."; exit 1; }
    printf '%s' "$BACKUP_SENHA" | gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 0 \
      --decrypt --output "$TMP/backup.tar" "$ARQ"
    TAR="$TMP/backup.tar"
    ;;
esac
tar -C "$TMP" -xf "$TAR" banco.dump uploads.tar.gz

case "$MODO" in
  teste)
    BANCO="sweetway_restauro_teste"
    dropdb --if-exists "$BANCO"
    createdb "$BANCO"
    pg_restore --no-owner --exit-on-error --dbname="$BANCO" "$TMP/banco.dump"
    echo "Linhas no banco restaurado:"
    psql -d "$BANCO" -At -F ' ' -c "
      SELECT 'usuarios', count(*) FROM \"Usuario\"
      UNION ALL SELECT 'turmas', count(*) FROM \"Turma\"
      UNION ALL SELECT 'licoes', count(*) FROM \"Licao\"
      UNION ALL SELECT 'arquivos', count(*) FROM \"Arquivo\"
      UNION ALL SELECT 'migracoes', count(*) FROM \"_prisma_migrations\"" | sed 's/^/  /'
    dropdb "$BANCO"
    echo "Arquivos em uploads.tar.gz: $(tar -tzf "$TMP/uploads.tar.gz" | grep -vc '/$')"
    echo "Teste de restauração OK."
    ;;
  banco)
    [ "${CONFIRMAR:-}" = "sim" ] || { echo "Isto APAGA o banco $PGDATABASE e põe o do backup no lugar. Rode com -e CONFIRMAR=sim."; exit 1; }
    pg_restore --no-owner --clean --if-exists --exit-on-error --dbname="$PGDATABASE" "$TMP/banco.dump"
    echo "Banco $PGDATABASE restaurado."
    ;;
  uploads)
    [ -d /uploads-destino ] && [ -w /uploads-destino ] || { echo "Monte o volume de uploads em /uploads-destino (leitura e escrita)."; exit 1; }
    tar -C /uploads-destino -xzf "$TMP/uploads.tar.gz"
    # A API roda como o usuário node (uid 1000) e precisa gravar na pasta
    chown -R 1000:1000 /uploads-destino
    echo "Uploads restaurados em /uploads-destino."
    ;;
  *)
    echo "Modo desconhecido: $MODO (use teste, banco ou uploads)"; exit 2 ;;
esac
