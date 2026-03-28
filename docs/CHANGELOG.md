# AutoHire ATS — v2.1.0 Changelog

---

## UI Changes

### 1. Candidate Modal — Job Applications Section (`src/components/CandidateModal.tsx`)

**What changed:** The "Applied for" label in the Overview tab now shows all job applications, not just the primary one.

**Before:**
```
Applied for: Senior Frontend Developer
```

**After:**
```
Primary:      Senior Frontend Developer · Engineering
Also applied: Backend Engineer · Platform          12/03/2026
Also applied: Full Stack Developer · Product       15/03/2026
```

The primary job (blue background) is the candidate's original/first application. Additional jobs (grey background) are shown below with the date they applied. This section only appears if a job is linked — no visual change for candidates without a job.

---

### 2. Settings Page — Email Field Fix (`src/app/settings/page.tsx`)

**What changed:** Removed a duplicate `className` attribute on the email input that was causing a TypeScript error. No visual change — the field looks and behaves exactly the same.

---

### 3. Reports Page — Type Fix (`src/app/reports/page.tsx`)

**What changed:** Fixed a TypeScript type error in the status chart data mapping. No visual change — the Reports page looks and behaves exactly the same.

---

## Backend / Logic Changes

### 4. ATS Scoring Engine (`src/lib/scoring.ts`)

No UI changes. Score numbers on candidate cards and modals will change after the next re-score because the calculation is more accurate.

| Score | What changed |
|-------|-------------|
| **Communication** | Now reads resume text for keywords: stakeholder, presentation, negotiation, cross-functional, mentored, etc. Previously was just profile completeness. |
| **Culture Fit** | Baseline reduced from 5.0 to 3.5. Points must be earned via salary fit, notice period, stability signals. |
| **Technical** | Seniority is now a proper 5% weighted component (was an inconsistent 0–1 raw bonus). |
| **Skill Match (no job)** | Capped at 7.0 max when no job is linked. Was incorrectly giving 10/10 for candidates with 15+ skills. |

---

### 5. Dashboard — Culture Fit Average (`src/app/api/dashboard/route.ts`)

No UI changes needed — the existing dashboard tile was already wired up, but the API was never returning the culture fit average. Now it does.

---

### 6. Multi-Job Application Support

**API:** `src/app/api/candidates/route.ts`, `src/app/api/upload/route.ts`, `src/app/api/candidates/[id]/route.ts`

**Database:** New `job_applications` table

| Scenario | Before | After |
|----------|--------|-------|
| Add existing candidate to a new job | ❌ 409 error | ✅ Creates new application |
| Upload resume for existing candidate with different job | ❌ Silently overwrites job | ✅ Adds as new application |
| View candidate detail | Shows one job only | Shows all jobs applied to |

---

### 7. Pre-existing TypeScript Errors Fixed

Three TypeScript errors that existed in the original codebase (unrelated to new features):

| File | Error |
|------|-------|
| `src/app/settings/page.tsx` | Duplicate `className` attribute |
| `src/app/reports/page.tsx` | Implicit `any` type on STATUS_LABELS lookup |
| `src/lib/audit.ts` | `details` type mismatch with Prisma Json field |

---

## Server Deployment Steps (Docker + Git)

### Your current setup
- Docker with `docker-compose.yaml`
- Git for code updates
- Separate `.env` file on server (not tracked by git — safe)

---

### Step 1 — SSH into your server

```bash
ssh user@your-server-ip
```

---

### Step 2 — Go to the project folder

```bash
cd /path/to/hr-ats
```

---

### Step 3 — Pull the latest code

```bash
git pull
```

Your `.env` file is not touched by git pull. Docker will read it automatically.

---

### Step 4 — Rebuild and restart

```bash
docker compose down
docker compose up --build -d
```

This rebuilds the app image with all code changes and restarts all containers.

---

### Step 5 — Watch the migration log

```bash
docker compose logs migrate --follow
```

You should see:

```
==> Checking database state...
==> Existing installation detected (was using db push) — resolving init migration...
==> Applying new migrations...
==> Migrations complete.
```

Press `Ctrl+C` to exit the log view once done.

---

### Step 6 — Confirm everything is running

```bash
docker compose ps
```

Expected output:

```
NAME                 STATUS
autohire-postgres    running
autohire-app         running
autohire-migrate     exited (0)   ← exit code 0 = success
```

> The `migrate` container always exits after running — that is normal. Exit code `0` means success. Exit code non-zero means something went wrong — check logs with `docker compose logs migrate`.

---

### Step 7 — Verify in the app

- [ ] Open the app and log in
- [ ] Dashboard shows 4 score averages (Technical, Communication, **Culture Fit**, Overall)
- [ ] Open any candidate — the job section shows "Primary: ..." instead of "Applied for: ..."
- [ ] Try adding an existing candidate to a second job — should succeed without error
- [ ] Try re-uploading a resume for a different job — original job should remain unchanged

---

## Files Changed Summary

| File | Type | Change |
|------|------|--------|
| `src/components/CandidateModal.tsx` | UI | Multi-job applications display |
| `src/app/settings/page.tsx` | UI | Duplicate attribute fix (no visual change) |
| `src/app/reports/page.tsx` | UI | Type fix (no visual change) |
| `src/lib/scoring.ts` | Logic | ATS scoring overhaul |
| `src/app/api/dashboard/route.ts` | API | Added cultureFitScore to averages |
| `src/app/api/candidates/route.ts` | API | Multi-job application support |
| `src/app/api/upload/route.ts` | API | Fixed silent jobId overwrite |
| `src/app/api/candidates/[id]/route.ts` | API | Returns job applications in response |
| `src/lib/audit.ts` | Lib | Type fix |
| `src/types/index.ts` | Types | Added JobApplication type |
| `prisma/schema.prisma` | Schema | Added JobApplication model |
| `prisma/migrations/0000000000000_init/migration.sql` | Migration | Initial schema migration |
| `prisma/migrations/20260328000001_add_job_applications/migration.sql` | Migration | New table + data backfill |
| `prisma/migrate.sh` | Script | Smart migration runner |
| `docker-compose.yaml` | Docker | Updated migrate service |
