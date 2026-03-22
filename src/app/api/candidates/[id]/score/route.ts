// src/app/api/candidates/[id]/score/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { ok, err } from "@/lib/apiHelper"
import { calculateATSScore } from "@/lib/scoring"
import { audit } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN", "RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { job: true },
  })

  if (!candidate) return err("Candidate not found", 404)

  const score = calculateATSScore({
    skills: candidate.skills,
    experienceYears: candidate.experienceYears,
    linkedIn: candidate.linkedIn,
    portfolio: candidate.portfolio,
    phone: candidate.phone,
    currentCompany: candidate.currentCompany,
    currentRole: candidate.currentRole,
    noticePeriod: candidate.noticePeriod,
    resumeText: candidate.resumeText,
    expectedSalary: candidate.expectedSalary,
    jobRequiredSkills: candidate.job?.requiredSkills ?? [],
    jobMinExperience: candidate.job?.minExperience,
    jobSalaryMax: candidate.job?.salaryMax,
  })

  // Save scores to DB
  const updated = await prisma.candidate.update({
    where: { id },
    data: {
      technicalScore: score.technicalScore,
      communicationScore: score.communicationScore,
      cultureFitScore: score.cultureFitScore,
      overallScore: score.overallScore,
    },
  })

  // Log activity
  await prisma.activityLog.create({
    data: {
      candidateId: id,
      action: "ATS_SCORED",
      details: `Auto-scored: Overall ${score.overallScore}/10, Match ${score.skillMatchPercent}%`,
      performedBy: session.name,
    },
  })

  await audit("CANDIDATE_SCORED", "candidates", {
    userId: session.id,
    resourceId: id,
    details: { overall: score.overallScore, skillMatch: score.skillMatchPercent } as any,
  })

  return ok({ scores: score, candidate: updated })
}
