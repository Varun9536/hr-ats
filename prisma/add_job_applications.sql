-- Migration: Add job_applications table for multi-job application support
-- Run this on the server: psql $DATABASE_URL -f add_job_applications.sql

CREATE TABLE IF NOT EXISTS "job_applications" (
    "id"          TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId"       TEXT NOT NULL,
    "appliedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_applications_candidateId_jobId_key" UNIQUE ("candidateId", "jobId"),
    CONSTRAINT "job_applications_candidateId_fkey"
        FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_applications_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: create JobApplication records for all candidates that have a jobId set
-- This preserves existing data in the new structure
INSERT INTO "job_applications" ("id", "candidateId", "jobId", "appliedAt")
SELECT
    'japp_' || substring(md5(random()::text), 1, 20),
    c."id",
    c."jobId",
    c."appliedAt"
FROM candidates c
WHERE c."jobId" IS NOT NULL
ON CONFLICT ("candidateId", "jobId") DO NOTHING;
