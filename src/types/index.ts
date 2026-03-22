// src/types/index.ts

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "RECRUITER" | "INTERVIEWER" | "VIEWER"
export type Status = "APPLIED"|"SCREENING"|"SHORTLISTED"|"INTERVIEW"|"OFFER"|"SELECTED"|"REJECTED"|"WITHDRAWN"|"ON_HOLD"
export type CallStatus = "NOT_CALLED"|"SCHEDULED"|"CALLED"|"NOT_PICKED"|"CALLBACK_REQUESTED"|"VOICEMAIL_LEFT"
export type Source = "DIRECT"|"LINKEDIN"|"NAUKRI"|"REFERRAL"|"CAMPUS"|"AGENCY"|"WEBSITE"|"OTHER"
export type Priority = "LOW"|"MEDIUM"|"HIGH"|"URGENT"
export type JobType = "FULL_TIME"|"PART_TIME"|"CONTRACT"|"INTERNSHIP"|"REMOTE"
export type InterviewType = "SCREENING"|"TECHNICAL"|"HR"|"CULTURE_FIT"|"FINAL"|"ASSIGNMENT"
export type InterviewStatus = "SCHEDULED"|"COMPLETED"|"CANCELLED"|"RESCHEDULED"|"NO_SHOW"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string | null
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string | null
  location?: string | null
  linkedIn?: string | null
  portfolio?: string | null
  currentCompany?: string | null
  currentRole?: string | null
  experienceYears?: number | null
  expectedSalary?: number | null
  noticePeriod?: string | null
  resumePath?: string | null
  skills: string[]
  status: Status
  callStatus: CallStatus
  source: Source
  priority: Priority
  technicalScore?: number | null
  communicationScore?: number | null
  cultureFitScore?: number | null
  overallScore?: number | null
  jobId?: string | null
  assignedToId?: string | null
  job?: { id: string; title: string } | null
  assignedTo?: { id: string; name: string; avatar?: string | null } | null
  tags?: { tag: { id: string; name: string; color: string } }[]
  _count?: { notes: number; interviews: number }
  appliedAt: string
  updatedAt: string
}

export interface Job {
  id: string
  title: string
  department?: string | null
  location?: string | null
  type: JobType
  description?: string | null
  requiredSkills: string[]
  minExperience?: number | null
  salaryMin?: number | null
  salaryMax?: number | null
  isActive: boolean
  openings: number
  closingDate?: string | null
  _count?: { candidates: number }
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  avatar?: string | null
  lastLoginAt?: string | null
  createdAt: string
}

// ─── Labels & Colors ─────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<Status, string> = {
  APPLIED: "Applied", SCREENING: "Screening", SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview", OFFER: "Offer Sent", SELECTED: "Selected",
  REJECTED: "Rejected", WITHDRAWN: "Withdrawn", ON_HOLD: "On Hold",
}

export const STATUS_COLORS: Record<Status, string> = {
  APPLIED: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  SCREENING: "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
  SHORTLISTED: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  INTERVIEW: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  OFFER: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",
  SELECTED: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  REJECTED: "bg-red-100 text-red-700 ring-1 ring-red-200",
  WITHDRAWN: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  ON_HOLD: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
}

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  NOT_CALLED: "Not Called", SCHEDULED: "Scheduled", CALLED: "Called",
  NOT_PICKED: "Not Picked", CALLBACK_REQUESTED: "Callback Req.", VOICEMAIL_LEFT: "Voicemail",
}

export const CALL_STATUS_COLORS: Record<CallStatus, string> = {
  NOT_CALLED: "bg-gray-100 text-gray-500",
  SCHEDULED: "bg-blue-100 text-blue-700",
  CALLED: "bg-emerald-100 text-emerald-700",
  NOT_PICKED: "bg-red-100 text-red-600",
  CALLBACK_REQUESTED: "bg-amber-100 text-amber-700",
  VOICEMAIL_LEFT: "bg-purple-100 text-purple-700",
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-amber-600",
  URGENT: "text-red-600",
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin",
  RECRUITER: "Recruiter", INTERVIEWER: "Interviewer", VIEWER: "Viewer",
}

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN: "bg-purple-100 text-purple-700",
  RECRUITER: "bg-blue-100 text-blue-700",
  INTERVIEWER: "bg-amber-100 text-amber-700",
  VIEWER: "bg-gray-100 text-gray-600",
}

export const SOURCE_LABELS: Record<Source, string> = {
  DIRECT: "Direct", LINKEDIN: "LinkedIn", NAUKRI: "Naukri",
  REFERRAL: "Referral", CAMPUS: "Campus", AGENCY: "Agency",
  WEBSITE: "Website", OTHER: "Other",
}

export const ALL_STATUSES: Status[] = ["APPLIED","SCREENING","SHORTLISTED","INTERVIEW","OFFER","SELECTED","REJECTED","WITHDRAWN","ON_HOLD"]
export const ALL_CALL_STATUSES: CallStatus[] = ["NOT_CALLED","SCHEDULED","CALLED","NOT_PICKED","CALLBACK_REQUESTED","VOICEMAIL_LEFT"]
export const ALL_SOURCES: Source[] = ["DIRECT","LINKEDIN","NAUKRI","REFERRAL","CAMPUS","AGENCY","WEBSITE","OTHER"]
export const ALL_PRIORITIES: Priority[] = ["LOW","MEDIUM","HIGH","URGENT"]
