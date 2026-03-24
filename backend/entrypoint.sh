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

echo "Running database migrations..."
npx prisma migrate deploy

# Seed only on first run — sentinel file lives in the persisted volume
SEED_FLAG="/app/prisma/.seeded"
if [ ! -f "$SEED_FLAG" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts && touch "$SEED_FLAG"
else
  echo "Database already seeded, skipping."
fi

echo "Starting server..."
exec npx tsx src/server.ts
