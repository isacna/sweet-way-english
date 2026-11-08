# Backup do Sweet Way English: pg_dump (cliente 17, igual ao servidor) + uploads, agendado pelo crond.
# Opcional: criptografia (gpg, AES-256) e cópia para fora da VPS (rclone: Cloudflare R2, Backblaze B2...).
FROM alpine:3.22

RUN apk add --no-cache postgresql17-client rclone gnupg tzdata \
  && mkdir -p /backups /config/rclone

COPY backup.sh restaurar.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restaurar.sh /usr/local/bin/entrypoint.sh

ENV RCLONE_CONFIG=/config/rclone/rclone.conf
VOLUME ["/backups"]
ENTRYPOINT ["entrypoint.sh"]
