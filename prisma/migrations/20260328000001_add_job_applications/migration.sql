-- Migration: Add job_applications table
-- Enables one candidate to apply to multiple job positions

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_candidateId_jobId_key" ON "job_applications"("candidateId", "jobId");

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: migrate existing candidate jobId links into job_applications
INSERT INTO "job_applications" ("id", "candidateId", "jobId", "appliedAt")
SELECT
    'japp_' || substr(md5(c."id" || c."jobId"), 1, 20),
    c."id",
    c."jobId",
    c."appliedAt"
FROM candidates c
WHERE c."jobId" IS NOT NULL
ON CONFLICT ("candidateId", "jobId") DO NOTHING;
