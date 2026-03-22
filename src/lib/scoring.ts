// src/lib/scoring.ts
// Rule-based ATS scoring engine — no external API needed

// ─── Skill Categories for depth analysis ─────────────────────────────────────

const SKILL_WEIGHTS: Record<string, number> = {
  // High-value technical skills
  "kubernetes": 1.5, "aws": 1.5, "gcp": 1.5, "azure": 1.5,
  "machine learning": 1.5, "deep learning": 1.5, "system design": 1.5,
  "microservices": 1.3, "docker": 1.3, "terraform": 1.3,
  "typescript": 1.3, "rust": 1.3, "golang": 1.3,
  "postgresql": 1.2, "redis": 1.2, "elasticsearch": 1.2,
  "graphql": 1.2, "nestjs": 1.2, "next.js": 1.2,
  // Standard skills
  "react": 1.0, "node.js": 1.0, "python": 1.0, "java": 1.0,
  "javascript": 1.0, "css": 0.8, "html": 0.8, "git": 0.7,
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

export interface ATSScoreResult {
  technicalScore: number      // 0-10
  communicationScore: number  // 0-10
  cultureFitScore: number     // 0-10
  overallScore: number        // 0-10
  skillMatchPercent: number   // 0-100
  breakdown: {
    skillMatch: number
    experienceMatch: number
    skillDepth: number
    profileCompleteness: number
    seniorityBonus: number
  }
  summary: string
  strengths: string[]
  gaps: string[]
}

export interface ScoringInput {
  skills: string[]
  experienceYears?: number | null
  linkedIn?: string | null
  portfolio?: string | null
  phone?: string | null
  currentCompany?: string | null
  currentRole?: string | null
  noticePeriod?: string | null
  resumeText?: string | null
  expectedSalary?: number | null
  // Job context (optional — if linked to a job)
  jobRequiredSkills?: string[]
  jobMinExperience?: number | null
  jobSalaryMax?: number | null
}

function clamp(val: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, Math.round(val * 10) / 10))
}

function pct(val: number): number {
  return Math.min(100, Math.max(0, Math.round(val)))
}

export function calculateATSScore(input: ScoringInput): ATSScoreResult {
  const {
    skills = [],
    experienceYears,
    linkedIn,
    portfolio,
    phone,
    currentCompany,
    currentRole,
    noticePeriod,
    resumeText,
    jobRequiredSkills = [],
    jobMinExperience,
    jobSalaryMax,
  } = input

  const skillsLower = skills.map(s => s.toLowerCase())
  const requiredLower = jobRequiredSkills.map(s => s.toLowerCase())

  // ── 1. SKILL MATCH SCORE (0-10) ───────────────────────────────────────────
  let skillMatchScore = 5.0 // default when no job linked
  let skillMatchPercent = 50
  let matchedSkills: string[] = []
  let missingSkills: string[] = []

  if (requiredLower.length > 0) {
    matchedSkills = requiredLower.filter(req =>
      skillsLower.some(s => s.includes(req) || req.includes(s))
    )
    missingSkills = requiredLower.filter(req =>
      !skillsLower.some(s => s.includes(req) || req.includes(s))
    )
    skillMatchPercent = pct((matchedSkills.length / requiredLower.length) * 100)
    skillMatchScore = clamp((matchedSkills.length / requiredLower.length) * 10)
  } else {
    // No job — score based on total skill count
    skillMatchPercent = pct(Math.min(100, (skills.length / 15) * 100))
    skillMatchScore = clamp(Math.min(10, 3 + (skills.length / 15) * 7))
  }

  // ── 2. EXPERIENCE MATCH SCORE (0-10) ─────────────────────────────────────
  let experienceScore = 5.0
  const exp = experienceYears ?? 0

  if (jobMinExperience != null && jobMinExperience > 0) {
    if (exp >= jobMinExperience * 1.5) experienceScore = 10.0       // Over-qualified
    else if (exp >= jobMinExperience) experienceScore = 9.0          // Perfect match
    else if (exp >= jobMinExperience * 0.8) experienceScore = 7.0   // Slightly under
    else if (exp >= jobMinExperience * 0.5) experienceScore = 5.0   // Significantly under
    else experienceScore = 3.0                                        // Too junior
  } else {
    // No job min — score by raw experience
    if (exp >= 8) experienceScore = 10.0
    else if (exp >= 5) experienceScore = 8.5
    else if (exp >= 3) experienceScore = 7.0
    else if (exp >= 1) experienceScore = 5.5
    else experienceScore = 3.5
  }

  // ── 3. SKILL DEPTH SCORE (0-10) ──────────────────────────────────────────
  // Weighted by skill value
  let weightedSkillCount = 0
  for (const skill of skillsLower) {
    const weight = SKILL_WEIGHTS[skill] ?? 1.0
    weightedSkillCount += weight
  }

  let skillDepthScore = 3.0
  if (weightedSkillCount >= 25) skillDepthScore = 10.0
  else if (weightedSkillCount >= 18) skillDepthScore = 9.0
  else if (weightedSkillCount >= 12) skillDepthScore = 8.0
  else if (weightedSkillCount >= 8) skillDepthScore = 7.0
  else if (weightedSkillCount >= 5) skillDepthScore = 6.0
  else if (weightedSkillCount >= 3) skillDepthScore = 5.0
  else skillDepthScore = 3.0

  // ── 4. PROFILE COMPLETENESS (0-10) ───────────────────────────────────────
  let completenessScore = 0
  let completenessPoints = 0
  const maxPoints = 10

  if (phone) completenessPoints += 1.5
  if (linkedIn) completenessPoints += 2.0
  if (portfolio) completenessPoints += 1.5
  if (currentCompany) completenessPoints += 1.0
  if (currentRole) completenessPoints += 1.0
  if (noticePeriod) completenessPoints += 1.0
  if (experienceYears != null) completenessPoints += 1.0
  if (skills.length > 0) completenessPoints += 1.0

  completenessScore = clamp((completenessPoints / maxPoints) * 10)

  // ── 5. SENIORITY BONUS ────────────────────────────────────────────────────
  let seniorityBonus = 0
  const roleText = (currentRole || "").toLowerCase()
  const resumeTextLower = (resumeText || "").toLowerCase()

  if (/senior|lead|principal|architect|head|director|vp|chief/i.test(roleText)) seniorityBonus = 1.0
  else if (/mid|intermediate|engineer|developer/i.test(roleText)) seniorityBonus = 0.5
  else if (/junior|fresher|trainee|intern/i.test(roleText)) seniorityBonus = 0

  // Check resume for leadership indicators
  if (/led\s+team|managed\s+team|team\s+of\s+\d|mentored|architected/i.test(resumeTextLower)) {
    seniorityBonus = Math.max(seniorityBonus, 0.8)
  }

  // ── COMPUTE FINAL SCORES ──────────────────────────────────────────────────

  // Technical Score — weighted combination
  const technicalScore = clamp(
    (skillMatchScore * 0.40) +
    (experienceScore * 0.30) +
    (skillDepthScore * 0.20) +
    (seniorityBonus * 1.0) +
    (completenessScore * 0.10)
  )

  // Communication Score — profile quality indicators
  const communicationScore = clamp(
    (completenessScore * 0.50) +
    (linkedIn ? 2.0 : 0) +
    (portfolio ? 1.5 : 0) +
    (phone ? 1.0 : 0) +
    (noticePeriod ? 0.5 : 0) +
    (exp >= 2 ? 1.0 : 0.5)
  )

  // Culture Fit Score — stability + completeness + reasonable expectations
  let cultureFitScore = 5.0
  cultureFitScore += completenessScore * 0.3
  cultureFitScore += (exp >= 1 ? 1.0 : 0)
  cultureFitScore += (currentCompany ? 0.5 : 0)
  if (noticePeriod) {
    if (/immediate|0|zero/i.test(noticePeriod)) cultureFitScore += 1.0
    else if (/15|30/i.test(noticePeriod)) cultureFitScore += 0.8
    else if (/60/i.test(noticePeriod)) cultureFitScore += 0.5
    else if (/90/i.test(noticePeriod)) cultureFitScore += 0.2
  }
  // Salary expectation check
  if (jobSalaryMax && input.expectedSalary) {
    if (input.expectedSalary <= jobSalaryMax) cultureFitScore += 1.0
    else if (input.expectedSalary <= jobSalaryMax * 1.2) cultureFitScore += 0.5
  }
  cultureFitScore = clamp(cultureFitScore)

  // Overall Score — weighted average
  const overallScore = clamp(
    (technicalScore * 0.50) +
    (communicationScore * 0.25) +
    (cultureFitScore * 0.25)
  )

  // ── STRENGTHS & GAPS ─────────────────────────────────────────────────────
  const strengths: string[] = []
  const gaps: string[] = []

  if (skillMatchPercent >= 80) strengths.push(`Strong skill match (${skillMatchPercent}% of required skills)`)
  else if (skillMatchPercent >= 50) strengths.push(`Moderate skill match (${skillMatchPercent}% of required skills)`)

  if (exp >= (jobMinExperience ?? 3)) strengths.push(`${exp} years experience — meets requirement`)
  if (skills.length >= 15) strengths.push(`Broad skill set (${skills.length} skills)`)
  if (linkedIn) strengths.push("LinkedIn profile present")
  if (portfolio) strengths.push("Portfolio/website present")
  if (/immediate|0|30/i.test(noticePeriod || "")) strengths.push("Short notice period — quick joiner")
  if (seniorityBonus >= 0.8) strengths.push("Senior-level experience")

  if (missingSkills.length > 0) gaps.push(`Missing required skills: ${missingSkills.slice(0, 4).join(", ")}`)
  if (exp < (jobMinExperience ?? 0)) gaps.push(`Experience gap: ${exp} yrs vs ${jobMinExperience} yrs required`)
  if (!linkedIn) gaps.push("No LinkedIn profile")
  if (!phone) gaps.push("Phone number missing")
  if (skills.length < 5) gaps.push("Limited skills listed on resume")

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  let scoreLevel = ""
  if (overallScore >= 8.5) scoreLevel = "Excellent"
  else if (overallScore >= 7.0) scoreLevel = "Good"
  else if (overallScore >= 5.5) scoreLevel = "Average"
  else scoreLevel = "Below Average"

  const summary = `${scoreLevel} candidate. ${
    requiredLower.length > 0
      ? `Matches ${skillMatchPercent}% of required skills.`
      : `Has ${skills.length} skills listed.`
  } ${exp > 0 ? `${exp} years of experience.` : ""} ${
    strengths.length > 0 ? `Key strength: ${strengths[0]}.` : ""
  }`.trim()

  return {
    technicalScore,
    communicationScore,
    cultureFitScore,
    overallScore,
    skillMatchPercent,
    breakdown: {
      skillMatch: clamp(skillMatchScore),
      experienceMatch: clamp(experienceScore),
      skillDepth: clamp(skillDepthScore),
      profileCompleteness: clamp(completenessScore),
      seniorityBonus: clamp(seniorityBonus * 10),
    },
    summary,
    strengths,
    gaps,
  }
}
