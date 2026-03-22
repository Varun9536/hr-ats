// src/app/api/jobs/[id]/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const UpdateJobSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  openings: z.number().int().min(1).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  minExperience: z.number().int().min(0).optional(),
  closingDate: z.string().datetime().optional(),
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      candidates: {
        select: { id: true, name: true, status: true, overallScore: true, appliedAt: true },
        orderBy: { appliedAt: "desc" },
      },
      _count: { select: { candidates: true } },
    },
  })
  if (!job) return err("Job not found", 404)
  return ok(job)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN", "RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = UpdateJobSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const job = await prisma.job.update({ where: { id }, data: parsed.data as any })
  await audit("JOB_UPDATED", "jobs", { userId: session.id, resourceId: id })
  return ok(job)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  await prisma.job.delete({ where: { id } })
  await audit("JOB_DELETED", "jobs", { userId: session.id, resourceId: id })
  return ok({ success: true })
}
