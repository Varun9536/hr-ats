# AutoHire ATS — Server Deployment Guide

---

## Requirements

- Ubuntu VPS with Docker and Docker Compose installed
- Git installed on server
- `.env` file present in `/var/www/hr-ats/` (not tracked by git)

### `.env` file must contain

```env
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_jwt_secret
```

---

## First Time Setup (Fresh Server)

```bash
# 1. Clone the repo
cd /var/www
git clone <your-repo-url> hr-ats
cd hr-ats

# 2. Create your .env file
nano .env
# Add DB_PASSWORD and JWT_SECRET, then save

# 3. Build and start all containers
docker compose up --build -d

# 4. Watch migration and seed run
docker compose logs migrate --follow

# 5. Check all containers are running
docker compose ps
```

**Expected output from migrate logs:**
```
==> Fresh installation — running all migrations...
==> Migrations complete.
```

**Expected docker compose ps output:**
```
NAME                 STATUS
autohire-postgres    running
autohire-app         running
autohire-migrate     exited (0)
```

> Exit code `0` on migrate = success. It always exits after running.

---

## Regular Update (Pulling New Code)

Use this every time you deploy new changes from git.

```bash
# 1. Go to project folder
cd /var/www/hr-ats

# 2. Pull latest code (.env file is never touched by git)
git pull

# 3. Rebuild and restart
docker compose down
docker compose up --build -d

# 4. Watch migration logs
docker compose logs migrate --follow

# 5. Verify everything is running
docker compose ps
```

---

## v2.1.0 Upgrade (One-Time Fix for Existing Servers)

> Only needed if your server was already running before v2.1.0.
> The server was set up using `prisma db push` and has no migration history.

### Step 1 — SSH into your server

```bash
ssh ubuntu@your-server-ip
cd /var/www/hr-ats
```

### Step 2 — Fix the stuck migration state

Run this **before** pulling new code:

```bash
docker compose run --rm migrate sh -c "
  npm ci --ignore-scripts &&
  npx prisma generate &&
  npx prisma migrate resolve --applied 0000000000000_init &&
  npx prisma migrate deploy
"
```

**Expected output:**
```
Migration 0000000000000_init marked as applied.
The following migration(s) have been applied:
  20260328000001_add_job_applications
```

### Step 3 — Pull updated code and rebuild

```bash
git pull
docker compose down
docker compose up --build -d
```

### Step 4 — Verify migration logs

```bash
docker compose logs migrate --follow
```

**Expected output:**
```
==> Applying pending migrations...
==> Migrations complete.
```

### Step 5 — Verify app is working

```bash
docker compose ps
```

Then open the app and check:
- [ ] Dashboard shows all 4 score averages (Technical, Communication, Culture Fit, Overall)
- [ ] Candidate detail page loads without 500 error
- [ ] Candidate modal Overview tab shows "Primary: ..." for job
- [ ] Adding same candidate to a second job works (no 409 error)

---

## Useful Commands

### View logs

```bash
# App logs (live)
docker compose logs autohire --follow

# Migration logs
docker compose logs migrate --follow

# Postgres logs
docker compose logs postgres --follow

# All containers at once
docker compose logs --follow
```

### Container status

```bash
docker compose ps
```

### Restart app only (no rebuild)

```bash
docker compose restart autohire
```

### Full rebuild (after code changes)

```bash
docker compose down
docker compose up --build -d
```

### Connect to the database directly

```bash
docker exec -it autohire-postgres psql -U autohire -d autohire
```

### Run a one-off Prisma command

```bash
docker compose run --rm migrate sh -c "npm ci --ignore-scripts && npx prisma generate && npx prisma <command>"
```

---

## Troubleshooting

### 500 error on candidate detail page

The `job_applications` table is missing. Run the v2.1.0 upgrade steps above.

---

### migrate container exits with code 1

Check the logs:
```bash
docker compose logs migrate
```

**If you see `Error: P3009` (failed migration):**
```bash
docker compose run --rm migrate sh -c "
  npm ci --ignore-scripts &&
  npx prisma generate &&
  npx prisma migrate resolve --applied 0000000000000_init &&
  npx prisma migrate deploy
"
```

**If you see a connection error:**
```bash
# Check postgres is healthy
docker compose ps postgres

# Restart postgres and try again
docker compose restart postgres
docker compose up migrate
```

---

### App not reachable after deploy

```bash
# Check if app container is running
docker compose ps

# Check app logs for errors
docker compose logs autohire --tail=50

# Hard restart everything
docker compose down
docker compose up --build -d
```

---

### Out of disk space

```bash
# Remove unused Docker images and containers
docker system prune -f

# Check disk usage
df -h
```

---

### Database data lost after restart

Data is safe as long as the `postgres_data` Docker volume exists.
```bash
# Check volumes
docker volume ls | grep autohire
```

If `autohire_postgres_data` is listed, your data is intact.

---

## File Reference

| File | Purpose |
|------|---------|
| `docker-compose.yaml` | Defines all services (postgres, app, migrate) |
| `dockerfile` | Builds the Next.js app image |
| `prisma/migrate.sh` | Smart migration script (handles fresh/existing/failed states) |
| `prisma/schema.prisma` | Database schema |
| `prisma/migrations/` | Migration history |
| `.env` | Secrets — never committed to git |
| `public/uploads/` | Uploaded resumes — stored in Docker volume |

docker compose run --rm migrate sh -c "
    npm ci --ignore-scripts &&
    npx prisma generate &&
    npx prisma migrate resolve --applied 0000000000000_init &&
    npx prisma migrate deploy
  "