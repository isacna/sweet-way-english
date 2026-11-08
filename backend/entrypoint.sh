#!/bin/sh
set -e

# Roda como o usuário `node` (sem privilégios). A pasta de uploads é um volume e precisa ser gravável por ele.
UPLOADS="${UPLOAD_DIR:-uploads}"
mkdir -p "$UPLOADS" 2>/dev/null || true
if [ ! -w "$UPLOADS" ]; then
  echo "A pasta de uploads ($UPLOADS) não é gravável pelo usuário $(id -un)."
  echo "Volume criado por uma imagem antiga (que rodava como root)? Corrija uma vez com:"
  echo "  docker compose run --rm --user root --entrypoint chown backend -R node:node /app/uploads"
  exit 1
fi

# O Compose só sobe o backend com o Postgres saudável (healthcheck), então não há espera aqui.
echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

# Seed só quando pedido explicitamente (ex.: primeira subida): SEED_ON_START=1.
# Os arquivos de exemplo (seed-media/) são copiados pelo próprio seed, com nome aleatório e linha em Arquivo.
if [ "$SEED_ON_START" = "1" ]; then
  echo "Seeding database (SEED_ON_START=1)..."
  ./node_modules/.bin/tsx prisma/seed.ts
else
  echo "Skipping seed (set SEED_ON_START=1 to run it)."
fi

echo "Starting server..."
exec node dist/server.js
