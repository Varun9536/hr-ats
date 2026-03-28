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

// Degree keywords ordered from most to least specific
const DEGREE_PATTERNS = [
  /\b(ph\.?d\.?|doctor(?:ate)? of philosophy)\b/i,
  /\b(m\.?b\.?a\.?|master of business administration)\b/i,
  /\b(m\.?tech\.?|m\.?e\.?|master of (?:technology|engineering))\b/i,
  /\b(m\.?sc\.?|m\.?s\.?|master of science)\b/i,
  /\b(m\.?a\.?|master of arts)\b/i,
  /\b(b\.?tech\.?|b\.?e\.?|bachelor of (?:technology|engineering))\b/i,
  /\b(b\.?sc\.?|b\.?s\.?|bachelor of science)\b/i,
  /\b(b\.?c\.?a\.?|bachelor of computer applications)\b/i,
  /\b(b\.?b\.?a\.?|bachelor of business administration)\b/i,
  /\b(b\.?a\.?|bachelor of arts)\b/i,
  /\b(diploma|associate degree)\b/i,
  /\b(10\+2|higher secondary|senior secondary|hsc|ssc|matriculation)\b/i,
]

// Section headers that indicate work history
const WORK_SECTION_HEADERS = /^(?:work\s+experience|experience|employment(?:\s+history)?|professional\s+experience|career\s+history|work\s+history)/i

// Section headers that indicate education
const EDU_SECTION_HEADERS = /^(?:education(?:al)?\s+(?:background|qualifications?)?|academic(?:\s+background)?|qualifications?|degrees?)/i

// Common Indian and global company patterns (job title indicators to exclude)
const COMPANY_EXCLUDES = /\b(?:engineer|developer|manager|analyst|intern|consultant|lead|senior|junior|associate|director|officer|head|president|coordinator|specialist|architect|designer|recruiter|hr|cto|ceo|cfo|vp|svp|evp)\b/i

export interface EducationEntry {
  degree: string
  institution: string
  year?: number
}

function extractEducation(text: string): EducationEntry[] {
  const entries: EducationEntry[] = []
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  // Find education section
  let inEduSection = false
  const eduLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (EDU_SECTION_HEADERS.test(line)) {
      inEduSection = true
      continue
    }
    // Stop at next major section (all caps, short, or known section header)
    if (inEduSection && i > 0 && (WORK_SECTION_HEADERS.test(line) || /^(?:skills?|projects?|achievements?|certifications?|languages?|awards?|publications?|hobbies|interests?|references?)/i.test(line))) {
      inEduSection = false
    }
    if (inEduSection) eduLines.push(line)
  }

  // If no explicit section found, scan entire text for degree mentions
  const scanLines = eduLines.length > 0 ? eduLines : lines

  for (let i = 0; i < scanLines.length; i++) {
    const line = scanLines[i]
    let matchedDegree = ""

    for (const pat of DEGREE_PATTERNS) {
      const m = line.match(pat)
      if (m) { matchedDegree = m[0].toUpperCase(); break }
    }

    if (!matchedDegree) continue

    // Look for institution in same line or adjacent lines
    let institution = ""
    const institutionPatterns = [
      /(?:from|at|,)\s+([A-Z][A-Za-z\s,.()\-&]+(?:University|College|Institute|School|Academy|IIT|IIM|NIT|BITS|BHU|DU|BITS))/i,
      /([A-Z][A-Za-z\s,.()\-&]*(?:University|College|Institute|School|Academy|IIT|IIM|NIT|BITS))/i,
    ]
    const contextText = [line, scanLines[i - 1] || "", scanLines[i + 1] || ""].join(" ")
    for (const pat of institutionPatterns) {
      const m = contextText.match(pat)
      if (m) { institution = m[1].trim(); break }
    }

    // Extract graduation year
    const yearMatch = contextText.match(/\b(19[89]\d|20[012]\d)\b/)
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined

    // Avoid duplicates
    if (!entries.some(e => e.degree === matchedDegree)) {
      entries.push({ degree: matchedDegree, institution, year })
    }
  }

  return entries.slice(0, 5)
}

function extractPreviousCompanies(text: string): string[] {
  const companies: string[] = []
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  let inWorkSection = false
  const workLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (WORK_SECTION_HEADERS.test(line)) { inWorkSection = true; continue }
    if (inWorkSection && /^(?:education|skills?|projects?|certifications?|languages?|achievements?|awards?)/i.test(line)) {
      inWorkSection = false
    }
    if (inWorkSection) workLines.push(line)
  }

  const scanLines = workLines.length > 0 ? workLines : lines

  // Pattern 1: "at Company Name" or "@ Company" or "Company Name |" with dates nearby
  const atPattern = /\bat\s+([A-Z][A-Za-z0-9\s,.()\-&]{2,40}?)(?:\s*[|·•,]|\s+(?:from|since|\d{4}))/gi
  // Pattern 2: lines with date ranges (indicating job entries)
  const dateRangePattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*(?:present|current|now)/i

  for (let i = 0; i < scanLines.length; i++) {
    const line = scanLines[i]

    // Check "at Company" pattern
    let m: RegExpExecArray | null
    const re = new RegExp(atPattern.source, "gi")
    while ((m = re.exec(line)) !== null) {
      const name = m[1].trim()
      if (name.length > 2 && !COMPANY_EXCLUDES.test(name) && !companies.includes(name)) {
        companies.push(name)
      }
    }

    // Check if line has a date range — then the PREVIOUS non-empty line is likely a company/role
    if (dateRangePattern.test(line) && i > 0) {
      // Look back for company name (skip job title lines containing role keywords)
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = scanLines[j].trim()
        if (!prev || COMPANY_EXCLUDES.test(prev)) continue
        if (/^[A-Z][A-Za-z0-9\s,.()\-&]{2,60}$/.test(prev) && !companies.includes(prev)) {
          companies.push(prev)
          break
        }
      }
    }
  }

  return companies.slice(0, 8)
}

function calculateConfidence(parsed: {
  name: string; email: string; phone: string; skills: string[];
  experienceYears?: number; education: EducationEntry[]; previousCompanies: string[]
}): number {
  let score = 0
  let total = 0

  const check = (val: unknown, weight: number) => {
    total += weight
    if (val && (typeof val !== "string" || val.length > 0)) score += weight
  }
  const checkArr = (arr: unknown[], weight: number) => {
    total += weight
    if (arr.length > 0) score += weight
  }

  check(parsed.email, 30)         // email is most critical
  check(parsed.name, 20)
  check(parsed.phone, 15)
  checkArr(parsed.skills, 15)
  check(parsed.experienceYears, 10)
  checkArr(parsed.education, 5)
  checkArr(parsed.previousCompanies, 5)

  return Math.round((score / total) * 100) / 100
}

async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; isScanned: boolean }> {
  try {
    const pdfParse = (await import("pdf-parse")).default
    const data = await pdfParse(buffer)
    const text = data.text || ""
    // Heuristic: if very few characters per page, it's likely scanned/image-based
    const pages = data.numpages || 1
    const charsPerPage = text.replace(/\s/g, "").length / pages
    return { text, isScanned: charsPerPage < 100 }
  } catch (e) {
    console.error("PDF parse error:", e)
    return { text: "", isScanned: false }
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ""
  } catch (e) {
    console.error("DOCX parse error:", e)
    return ""
  }
}

async function parseResume(buffer: Buffer, mimeType: string) {
  let rawText = ""
  let isScanned = false

  if (mimeType === "application/pdf") {
    const result = await extractTextFromPDF(buffer)
    rawText = result.text
    isScanned = result.isScanned
  } else {
    // .docx / .doc
    rawText = await extractTextFromDocx(buffer)
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

  const education = extractEducation(rawText)
  const previousCompanies = extractPreviousCompanies(rawText)
  const parseConfidence = calculateConfidence({ name, email, phone, skills, experienceYears, education, previousCompanies })

  return { name, email, phone, linkedIn, skills, experienceYears, rawText, education, previousCompanies, parseConfidence, isScanned }
}

const ACCEPTED_TYPES: Record<string, boolean> = {
  "application/pdf": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true, // .docx
  "application/msword": true, // .doc
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
  if (!ACCEPTED_TYPES[file.type]) return err("Only PDF and Word (.docx) files are accepted", 400)
  if (file.size > MAX_FILE_SIZE) return err("File size exceeds 10MB limit", 400)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const parsed = await parseResume(buffer, file.type)

  if (!parsed.email) {
    const hint = parsed.isScanned
      ? "This appears to be a scanned/image-based PDF. Please use a text-selectable PDF or .docx file."
      : "Could not extract email from resume. Ensure the file contains selectable text."
    return err(hint, 422)
  }

  // Save file
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadsDir, { recursive: true })
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const fileName = `${Date.now()}-${safeName}`
  await writeFile(path.join(uploadsDir, fileName), buffer)
  const resumePath = `/api/files/${fileName}`

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
    const updated = await prisma.candidate.update({
      where: { email: parsed.email },
      data: {
        resumePath,
        resumeText: parsed.rawText,
        skills: parsed.skills,
        education: parsed.education.length > 0 ? (parsed.education as object[]) : undefined,
        previousCompanies: parsed.previousCompanies,
        parseConfidence: parsed.parseConfidence,
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.phone && { phone: parsed.phone }),
        ...(parsed.linkedIn && { linkedIn: parsed.linkedIn }),
        ...(parsed.experienceYears && { experienceYears: parsed.experienceYears }),
        ...(position && { currentRole: position }),
        technicalScore: score.technicalScore,
        communicationScore: score.communicationScore,
        cultureFitScore: score.cultureFitScore,
        overallScore: score.overallScore,
      },
    })

    if (jobId && jobId !== existing.jobId) {
      await prisma.jobApplication.upsert({
        where: { candidateId_jobId: { candidateId: existing.id, jobId } },
        create: { candidateId: existing.id, jobId },
        update: {},
      })
    }

    await audit("RESUME_UPLOADED", "candidates", { userId: session.id, resourceId: updated.id, details: { updated: true } })
    return ok({ candidate: updated, updated: true, score, parseConfidence: parsed.parseConfidence, isScanned: parsed.isScanned })
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
      education: parsed.education.length > 0 ? (parsed.education as object[]) : undefined,
      previousCompanies: parsed.previousCompanies,
      parseConfidence: parsed.parseConfidence,
      createdById: session.id,
      ...(jobId && { jobId }),
      technicalScore: score.technicalScore,
      communicationScore: score.communicationScore,
      cultureFitScore: score.cultureFitScore,
      overallScore: score.overallScore,
    },
  })

  if (jobId) {
    await prisma.jobApplication.create({
      data: { candidateId: candidate.id, jobId },
    }).catch(() => {})
  }

  await audit("RESUME_UPLOADED", "candidates", { userId: session.id, resourceId: candidate.id, details: { new: true } })
  return ok({ candidate, updated: false, score, parseConfidence: parsed.parseConfidence, isScanned: parsed.isScanned }, 201)
}
