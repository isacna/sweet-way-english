#!/bin/sh
# Um backup completo: sweetway-AAAAMMDD-HHMMSS.tar[.gpg] em /backups, com
#   banco.dump        pg_dump no formato custom (restaura com pg_restore)
#   uploads.tar.gz    pasta de uploads inteira (arquivos privados dos alunos e da professora)
# Variáveis: PG* (conexão), BACKUP_RETENCAO_DIAS (30), BACKUP_SENHA (criptografa com gpg),
# BACKUP_RCLONE_DESTINO (ex.: r2:sweetway-backups; exige BACKUP_SENHA), BACKUP_PING_URL (healthchecks.io).
set -eu

DIR=/backups
RETENCAO="${BACKUP_RETENCAO_DIAS:-30}"
CARIMBO="$(date +%Y%m%d-%H%M%S)"
TMP="$DIR/.tmp-$CARIMBO"
ARQ="$DIR/sweetway-$CARIMBO.tar"

log() { echo "[backup $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

ping() {
  [ -n "${BACKUP_PING_URL:-}" ] || return 0
  wget -q -T 10 -O /dev/null "${BACKUP_PING_URL%/}$1" || log "aviso: não consegui avisar $BACKUP_PING_URL$1"
}

falhou() {
  log "FALHOU"
  rm -rf "$TMP" "$ARQ"
  ping /fail
}
trap 'falhou' EXIT

if [ -n "${BACKUP_RCLONE_DESTINO:-}" ] && [ -z "${BACKUP_SENHA:-}" ]; then
  log "BACKUP_RCLONE_DESTINO exige BACKUP_SENHA: o backup tem dados pessoais e não sai da VPS sem criptografia."
  exit 1
fi

ping /start
mkdir -p "$TMP"

log "pg_dump de $PGDATABASE..."
pg_dump --format=custom --no-owner --file="$TMP/banco.dump"

log "uploads..."
if [ -d /uploads ]; then
  tar -C /uploads -czf "$TMP/uploads.tar.gz" .
else
  tar -czf "$TMP/uploads.tar.gz" -T /dev/null
fi

tar -C "$TMP" -cf "$ARQ" banco.dump uploads.tar.gz
rm -rf "$TMP"

if [ -n "${BACKUP_SENHA:-}" ]; then
  printf '%s' "$BACKUP_SENHA" | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 \
    --symmetric --cipher-algo AES256 --output "$ARQ.gpg" "$ARQ"
  rm -f "$ARQ"
  ARQ="$ARQ.gpg"
fi
log "pronto: $(basename "$ARQ") ($(du -h "$ARQ" | cut -f1))"

if [ -n "${BACKUP_RCLONE_DESTINO:-}" ]; then
  log "enviando para $BACKUP_RCLONE_DESTINO..."
  rclone copy --no-traverse "$ARQ" "$BACKUP_RCLONE_DESTINO"
  rclone delete --min-age "${RETENCAO}d" --include 'sweetway-*' "$BACKUP_RCLONE_DESTINO"
fi

# Retenção local
find "$DIR" -maxdepth 1 -name 'sweetway-*.tar*' -mtime +"$RETENCAO" -print -delete | sed 's/^/removido: /'

trap - EXIT
ping ""
log "ok"
