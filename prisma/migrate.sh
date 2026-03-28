#!/bin/sh
# AutoHire ATS — Smart migration script
# Handles fresh installs, upgrades from db push, and failed migration recovery

set -e

echo "==> Checking database state..."

# Helper: check if a table exists — returns "yes" or "no"
table_exists() {
  psql "$DATABASE_URL" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_name='$1' LIMIT 1" \
    2>/dev/null | grep -q "1" && echo "yes" || echo "no"
}

MIGRATIONS_TRACKED=$(table_exists "_prisma_migrations")
TABLES_EXIST=$(table_exists "candidates")

if [ "$MIGRATIONS_TRACKED" = "yes" ]; then
  # Check for any failed migrations — resolve them before deploying
  FAILED=$(psql "$DATABASE_URL" -tAc \
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL LIMIT 1" \
    2>/dev/null || echo "")

  if [ -n "$FAILED" ]; then
    echo "==> Found failed migration: $FAILED — marking as applied (tables already exist from db push)..."
    npx prisma migrate resolve --applied "$FAILED"
  fi

  echo "==> Applying pending migrations..."
  npx prisma migrate deploy

elif [ "$TABLES_EXIST" = "yes" ]; then
  echo "==> Existing installation detected (was using db push) — resolving init migration..."
  npx prisma migrate resolve --applied 0000000000000_init
  echo "==> Applying new migrations..."
  npx prisma migrate deploy

else
  echo "==> Fresh installation — running all migrations..."
  npx prisma migrate deploy
fi

echo "==> Migrations complete."

# ── Seed only on fresh install ────────────────────────────────────────────────
# Check if any users exist — if yes, skip seeding (not a fresh install)
HAS_USERS=$(psql "$DATABASE_URL" -tAc \
  "SELECT 1 FROM users LIMIT 1" \
  2>/dev/null | grep -q "1" && echo "yes" || echo "no")

if [ "$HAS_USERS" = "no" ]; then
  echo "==> Fresh database — running seed..."
  npx tsx prisma/seed.ts
  echo "==> Seed complete."
else
  echo "==> Existing data found — skipping seed."
fi
