// src/app/api/candidates/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { CreateCandidateSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"
import { calculateATSScore } from "@/lib/scoring"
import type { Status, Priority, Source, Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const sp = new URL(req.url).searchParams
  const search = sp.get("search") || ""
  const status = sp.get("status") as Status | null
  const priority = sp.get("priority") as Priority | null
  const source = sp.get("source") as Source | null
  const skills = sp.get("skills") || ""
  const jobId = sp.get("jobId") || ""
  const assignedTo = sp.get("assignedTo") || ""
  const sortBy = sp.get("sortBy") || "appliedAt"
  const sortOrder = (sp.get("sortOrder") || "desc") as "asc" | "desc"
  const page = Math.max(1, parseInt(sp.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "50")))
  const skillArray = skills ? skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : []

  const where: Prisma.CandidateWhereInput = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { currentRole: { contains: search, mode: "insensitive" } },
      { currentCompany: { contains: search, mode: "insensitive" } },
    ]
  }
  if (status) where.status = status
  if (priority) where.priority = priority
  if (source) where.source = source
  if (jobId) where.jobId = jobId
  if (assignedTo) where.assignedToId = assignedTo
  if (skillArray.length > 0) where.skills = { hasSome: skillArray }

  const validSort = ["appliedAt","updatedAt","name","overallScore","technicalScore","communicationScore","experienceYears"]
  const orderField = validSort.includes(sortBy) ? sortBy : "appliedAt"

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        job: { select: { id: true, title: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
        _count: { select: { notes: true, interviews: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ])

  return ok({
    candidates,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN","ADMIN","RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = CreateCandidateSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const { position, ...data } = parsed.data as any

  const [existing, phoneMatch] = await Promise.all([
    prisma.candidate.findUnique({ where: { email: data.email } }),
    data.phone ? prisma.candidate.findFirst({
      where: { phone: data.phone },
      select: { id: true, name: true, email: true, status: true, phone: true },
    }) : null,
  ])

  // If candidate already exists and a new job is provided, create a JobApplication instead of erroring
  if (existing) {
    if (!data.jobId) {
      return err("duplicate_email", 409, {
        duplicate: { id: existing.id, name: existing.name, email: existing.email, status: existing.status },
      })
    }
    // Check if they've already applied to this specific job
    const alreadyApplied = await prisma.jobApplication.findUnique({
      where: { candidateId_jobId: { candidateId: existing.id, jobId: data.jobId } },
    })
    if (alreadyApplied) {
      return err("duplicate_email", 409, {
        duplicate: { id: existing.id, name: existing.name, email: existing.email, status: existing.status },
      })
    }
    // Create the additional application record
    const application = await prisma.jobApplication.create({
      data: { candidateId: existing.id, jobId: data.jobId },
      include: { job: { select: { id: true, title: true } } },
    })
    await audit("CANDIDATE_APPLIED_JOB", "candidates", {
      userId: session.id, resourceId: existing.id,
      details: { jobId: data.jobId } as any,
    })
    return ok({ candidate: existing, application, alreadyExisted: true }, 200)
  }

  // Fetch job for scoring context if jobId provided
  const job = data.jobId ? await prisma.job.findUnique({ where: { id: data.jobId } }) : null

  // Auto-calculate ATS score
  const score = calculateATSScore({
    skills: data.skills || [],
    experienceYears: data.experienceYears,
    linkedIn: data.linkedIn,
    phone: data.phone,
    currentCompany: data.currentCompany,
    currentRole: position,
    jobRequiredSkills: job?.requiredSkills ?? [],
    jobMinExperience: job?.minExperience,
    jobSalaryMax: job?.salaryMax,
  })

  const candidate = await prisma.candidate.create({
    data: {
      ...data,
      currentRole: position,
      createdById: session.id,
      technicalScore: score.technicalScore,
      communicationScore: score.communicationScore,
      cultureFitScore: score.cultureFitScore,
      overallScore: score.overallScore,
    },
  })

  // Create primary JobApplication record if job was specified
  if (data.jobId) {
    await prisma.jobApplication.create({
      data: { candidateId: candidate.id, jobId: data.jobId },
    }).catch(() => {}) // non-fatal
  }

  await audit("CANDIDATE_CREATED", "candidates", { userId: session.id, resourceId: candidate.id })

  // Warn if another candidate has the same phone (not a blocker, just a heads-up)
  const phoneWarning = phoneMatch && phoneMatch.id !== candidate.id
    ? { id: phoneMatch.id, name: phoneMatch.name, email: phoneMatch.email, status: phoneMatch.status }
    : null

  return ok({ ...candidate, atsScore: score, phoneWarning }, 201)
}
