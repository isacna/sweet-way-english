#!/bin/sh
set -e

# Copy seed media to uploads volume only if files are not already there
for f in /app/seed-media/*; do
  [ -f "$f" ] || continue
  fname=$(basename "$f")
  if [ ! -f "/app/uploads/$fname" ]; then
    cp "$f" "/app/uploads/$fname"
    echo "Copied seed media: $fname"
  fi
done

# O Compose só sobe o backend com o Postgres saudável (healthcheck), então não há espera aqui.
echo "Running database migrations..."
npx prisma migrate deploy

# Seed só quando pedido explicitamente (ex.: primeira subida): SEED_ON_START=1
if [ "$SEED_ON_START" = "1" ]; then
  echo "Seeding database (SEED_ON_START=1)..."
  npx tsx prisma/seed.ts
else
  echo "Skipping seed (set SEED_ON_START=1 to run it)."
fi

echo "Starting server..."
exec npx tsx src/server.ts
