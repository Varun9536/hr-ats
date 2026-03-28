// src/app/api/upload/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"
import { calculateATSScore } from "@/lib/scoring"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const SKILL_KEYWORDS = [
  "javascript","typescript","python","java","c++","c#","golang","go","rust","php","ruby","swift","kotlin","scala",
  "react","next.js","vue","angular","svelte","html","css","tailwind","sass","webpack","vite",
  "node.js","express","fastapi","django","flask","spring","laravel","rails","nestjs","graphql","rest api","grpc",
  "postgresql","mysql","mongodb","redis","sqlite","elasticsearch","cassandra","dynamodb","prisma","sequelize",
  "aws","gcp","azure","docker","kubernetes","terraform","ansible","ci/cd","github actions","jenkins","linux","nginx",
  "machine learning","deep learning","tensorflow","pytorch","pandas","numpy","sql","data science","nlp","llm",
  "agile","scrum","jira","figma","git","microservices","system design",
]

async function parseResumePDF(buffer: Buffer) {
  let rawText = ""
  try {
    const pdfParse = (await import("pdf-parse")).default
    const data = await pdfParse(buffer)
    rawText = data.text || ""
  } catch (e) {
    console.error("PDF parse error:", e)
  }

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean)
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/i)
  const email = emailMatch?.[0] || ""
  const phoneMatch = rawText.match(/(\+?[\d][\d\s\-().]{7,}\d)/g)
  const phone = phoneMatch?.[0]?.replace(/\s+/g, " ").trim() || ""
  const linkedInMatch = rawText.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i)
  const linkedIn = linkedInMatch ? `https://linkedin.com/in/${linkedInMatch[1]}` : ""

  let name = ""
  for (const line of lines.slice(0, 8)) {
    if (/[@\/\\\d]/.test(line)) continue
    if (/resume|curriculum|vitae|profile|summary|objective|address|phone/i.test(line)) continue
    if (line.length > 60 || line.length < 2) continue
    const words = line.split(/\s+/)
    if (words.length >= 2 && words.every((w) => /^[A-Za-z\-'.]+$/.test(w))) { name = line; break }
  }

  const expMatch = rawText.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i)
  const experienceYears = expMatch ? parseInt(expMatch[1]) : undefined

  const textLower = rawText.toLowerCase()
  const skills = SKILL_KEYWORDS.filter((s) => textLower.includes(s.toLowerCase()))

  return { name, email, phone, linkedIn, skills, experienceYears, rawText }
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN","ADMIN","RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let formData: FormData
  try { formData = await req.formData() } catch { return err("Invalid form data", 400) }

  const file = formData.get("resume") as File | null
  const position = formData.get("position") as string | undefined
  const jobId = formData.get("jobId") as string | undefined

  if (!file) return err("No file provided", 400)
  if (file.type !== "application/pdf") return err("Only PDF files are accepted", 400)
  if (file.size > MAX_FILE_SIZE) return err("File size exceeds 10MB limit", 400)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const parsed = await parseResumePDF(buffer)

  if (!parsed.email) {
    return err("Could not extract email from resume. Ensure the PDF contains selectable text.", 422)
  }

  // Save file
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadsDir, { recursive: true })
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const fileName = `${Date.now()}-${safeName}`
  await writeFile(path.join(uploadsDir, fileName), buffer)
  const resumePath = `/uploads/${fileName}`

  // Fetch job for scoring context
  const job = jobId ? await prisma.job.findUnique({ where: { id: jobId } }) : null

  // Calculate ATS score
  const score = calculateATSScore({
    skills: parsed.skills,
    experienceYears: parsed.experienceYears,
    linkedIn: parsed.linkedIn || null,
    phone: parsed.phone || null,
    resumeText: parsed.rawText,
    jobRequiredSkills: job?.requiredSkills ?? [],
    jobMinExperience: job?.minExperience,
    jobSalaryMax: job?.salaryMax,
  })

  const existing = await prisma.candidate.findUnique({ where: { email: parsed.email } })

  if (existing) {
    // Update resume/profile data but DO NOT overwrite the primary jobId —
    // that would silently remove the candidate's original job association.
    // If a new job is specified, create a JobApplication record instead.
    const updated = await prisma.candidate.update({
      where: { email: parsed.email },
      data: {
        resumePath,
        resumeText: parsed.rawText,
        skills: parsed.skills,
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.phone && { phone: parsed.phone }),
        ...(parsed.linkedIn && { linkedIn: parsed.linkedIn }),
        ...(parsed.experienceYears && { experienceYears: parsed.experienceYears }),
        ...(position && { currentRole: position }),
        // Intentionally NOT updating jobId — use JobApplication for additional jobs
        // Auto-update scores
        technicalScore: score.technicalScore,
        communicationScore: score.communicationScore,
        cultureFitScore: score.cultureFitScore,
        overallScore: score.overallScore,
      },
    })

    // If a job is specified and it differs from the candidate's primary job,
    // track it as an additional application (no-op if already exists)
    if (jobId && jobId !== existing.jobId) {
      await prisma.jobApplication.upsert({
        where: { candidateId_jobId: { candidateId: existing.id, jobId } },
        create: { candidateId: existing.id, jobId },
        update: {},
      })
    }

    await audit("RESUME_UPLOADED", "candidates", { userId: session.id, resourceId: updated.id, details: { updated: true } })
    return ok({ candidate: updated, updated: true, score })
  }

  const candidate = await prisma.candidate.create({
    data: {
      name: parsed.name || "Unknown",
      email: parsed.email,
      phone: parsed.phone || null,
      linkedIn: parsed.linkedIn || null,
      currentRole: position || null,
      experienceYears: parsed.experienceYears || null,
      resumePath,
      resumeText: parsed.rawText,
      skills: parsed.skills,
      createdById: session.id,
      ...(jobId && { jobId }),
      // Auto scores
      technicalScore: score.technicalScore,
      communicationScore: score.communicationScore,
      cultureFitScore: score.cultureFitScore,
      overallScore: score.overallScore,
    },
  })

  // Create primary JobApplication record
  if (jobId) {
    await prisma.jobApplication.create({
      data: { candidateId: candidate.id, jobId },
    }).catch(() => {}) // non-fatal
  }

  await audit("RESUME_UPLOADED", "candidates", { userId: session.id, resourceId: candidate.id, details: { new: true } })
  return ok({ candidate, updated: false, score }, 201)
}
