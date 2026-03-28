#!/bin/sh
# AutoHire ATS — Smart migration script
# Handles both fresh installations and upgrades from prisma db push

set -e

echo "==> Checking database state..."

# Check if _prisma_migrations table exists (proper migration tracking)
HAS_MIGRATION_TABLE=$(psql "$DATABASE_URL" -tAc \
  "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='_prisma_migrations')" \
  2>/dev/null || echo "f")

# Check if main tables already exist (deployed via db push without migrations)
HAS_EXISTING_TABLES=$(psql "$DATABASE_URL" -tAc \
  "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='candidates')" \
  2>/dev/null || echo "f")

if [ "$HAS_MIGRATION_TABLE" = "t" ]; then
  echo "==> Migration history found — applying pending migrations..."
  npx prisma migrate deploy

elif [ "$HAS_EXISTING_TABLES" = "t" ]; then
  echo "==> Existing installation detected (was using db push) — resolving init migration..."
  # Mark the init migration as already applied so Prisma doesn't try to re-create tables
  npx prisma migrate resolve --applied 0000000000000_init
  echo "==> Applying new migrations..."
  npx prisma migrate deploy

else
  echo "==> Fresh installation — running all migrations..."
  npx prisma migrate deploy
fi

echo "==> Migrations complete."
