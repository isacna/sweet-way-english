#!/bin/sh
set -eu

# Com argumentos, roda o comando (ex.: `docker compose run --rm backup backup.sh` ou `restaurar.sh teste ...`).
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Sem argumentos: agenda o backup (BACKUP_HORARIO, formato cron, no fuso TZ) e fica em primeiro plano.
HORARIO="${BACKUP_HORARIO:-30 3 * * *}"
mkdir -p /etc/crontabs
echo "$HORARIO /usr/local/bin/backup.sh > /proc/1/fd/1 2>&1" > /etc/crontabs/root
echo "Backup agendado: '$HORARIO' (TZ=${TZ:-UTC}), retenção de ${BACKUP_RETENCAO_DIAS:-30} dias."
exec crond -f -l 8
