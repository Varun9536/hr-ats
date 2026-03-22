// src/app/api/jobs/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { CreateJobSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const active = new URL(req.url).searchParams.get("active")
  const jobs = await prisma.job.findMany({
    where: active === "true" ? { isActive: true } : undefined,
    include: { _count: { select: { candidates: true } } },
    orderBy: { createdAt: "desc" },
  })
  return ok(jobs)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN","ADMIN","RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = CreateJobSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const data = { ...parsed.data, closingDate: parsed.data.closingDate ? new Date(parsed.data.closingDate) : null }
  const job = await prisma.job.create({ data: data as any })
  await audit("JOB_CREATED", "jobs", { userId: session.id, resourceId: job.id })
  return ok(job, 201)
}
