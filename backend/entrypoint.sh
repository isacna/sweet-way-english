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

# Demo data (known accounts with password senha123) only with SEED_DEMO=1:
# never enable it on a server reachable from the internet.
if [ "$SEED_DEMO" = "1" ]; then
  # Seed only on first run — sentinel file lives in the persisted volume
  SEED_FLAG="/app/prisma/.seeded"
  if [ ! -f "$SEED_FLAG" ]; then
    echo "Seeding demo database..."
    npx tsx prisma/seed.ts && touch "$SEED_FLAG"
  else
    echo "Demo database already seeded, skipping."
  fi
else
  # Imports the course (keeps existing lessons) and creates the first admin from ADMIN_EMAIL/ADMIN_PASSWORD
  echo "Bootstrapping database..."
  npx tsx prisma/bootstrap.ts
fi

echo "Starting server..."
exec npx tsx src/server.ts
