// src/lib/validations.ts
import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "RECRUITER", "INTERVIEWER", "VIEWER"]).default("RECRUITER"),
})

export const UpdateCandidateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  linkedIn: z.string().url().nullable().optional(),
  portfolio: z.string().url().nullable().optional(),
  currentCompany: z.string().max(200).nullable().optional(),
  currentRole: z.string().max(200).nullable().optional(),
  experienceYears: z.number().int().min(0).max(50).nullable().optional(),
  expectedSalary: z.number().int().min(0).nullable().optional(),
  noticePeriod: z.string().max(50).nullable().optional(),
  skills: z.array(z.string()).optional(),
  status: z.enum(["APPLIED","SCREENING","SHORTLISTED","INTERVIEW","OFFER","SELECTED","REJECTED","WITHDRAWN","ON_HOLD"]).optional(),
  callStatus: z.enum(["NOT_CALLED","SCHEDULED","CALLED","NOT_PICKED","CALLBACK_REQUESTED","VOICEMAIL_LEFT"]).optional(),
  source: z.enum(["DIRECT","LINKEDIN","NAUKRI","REFERRAL","CAMPUS","AGENCY","WEBSITE","OTHER"]).optional(),
  priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  technicalScore: z.number().min(0).max(10).nullable().optional(),
  communicationScore: z.number().min(0).max(10).nullable().optional(),
  cultureFitScore: z.number().min(0).max(10).nullable().optional(),
  overallScore: z.number().min(0).max(10).nullable().optional(),
  jobId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
})

export const CreateCandidateSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional(),
  position: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  source: z.enum(["DIRECT","LINKEDIN","NAUKRI","REFERRAL","CAMPUS","AGENCY","WEBSITE","OTHER"]).default("DIRECT"),
  skills: z.array(z.string()).default([]),
  jobId: z.string().optional(),
})

export const CreateJobSchema = z.object({
  title: z.string().min(2).max(200),
  department: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  type: z.enum(["FULL_TIME","PART_TIME","CONTRACT","INTERNSHIP","REMOTE"]).default("FULL_TIME"),
  description: z.string().optional(),
  requirements: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  minExperience: z.number().int().min(0).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  openings: z.number().int().min(1).default(1),
  closingDate: z.string().datetime().optional(),
})

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty").max(5000),
  isPrivate: z.boolean().default(false),
})

export const CreateInterviewSchema = z.object({
  candidateId: z.string(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(15).max(480).default(60),
  type: z.enum(["SCREENING","TECHNICAL","HR","CULTURE_FIT","FINAL","ASSIGNMENT"]).default("TECHNICAL"),
  mode: z.enum(["IN_PERSON","VIDEO","PHONE"]).default("VIDEO"),
  meetingLink: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
})
