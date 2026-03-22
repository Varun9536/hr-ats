// src/app/api/candidates/score-all/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { ok, err } from "@/lib/apiHelper"
import { calculateATSScore } from "@/lib/scoring"

export async function POST(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN", "RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  // Get all candidates with their job info
  const candidates = await prisma.candidate.findMany({
    include: { job: true },
  })

  let scored = 0
  const results = []

  for (const candidate of candidates) {
    try {
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

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          technicalScore: score.technicalScore,
          communicationScore: score.communicationScore,
          cultureFitScore: score.cultureFitScore,
          overallScore: score.overallScore,
        },
      })

      results.push({
        id: candidate.id,
        name: candidate.name,
        overall: score.overallScore,
        skillMatch: score.skillMatchPercent,
      })
      scored++
    } catch (e) {
      console.error(`Scoring failed for ${candidate.id}:`, e)
    }
  }

  return ok({
    scored,
    total: candidates.length,
    results: results.sort((a, b) => b.overall - a.overall),
  })
}
