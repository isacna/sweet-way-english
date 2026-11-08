# Configuração do rclone (backup fora da VPS)

Na VPS, crie aqui o `rclone.conf` do remoto (Cloudflare R2, Backblaze B2...). Ele tem chaves de acesso e não vai para o git.

```bash
cd /opt/sweetway
docker compose -f docker-compose.prod.yml run --rm backup rclone config
# o arquivo fica em deploy/rclone/rclone.conf; depois, no .env: BACKUP_RCLONE_DESTINO=<remoto>:<bucket>
```

Passo a passo em `docs/deploy.md` ("Backups").
