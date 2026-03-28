// src/app/api/candidates/[id]/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { UpdateCandidateSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

// Next.js 16: params is now a Promise
type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      job: { select: { id: true, title: true, department: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      notes: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      },
      interviews: {
        include: { interviewer: { select: { id: true, name: true, avatar: true } } },
        orderBy: { scheduledAt: "desc" },
      },
      activityLog: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!candidate) return err("Candidate not found", 404)

  // Fetch job applications separately — safe if migration hasn't run yet
  const applications = await prisma.jobApplication.findMany({
    where: { candidateId: id },
    include: { job: { select: { id: true, title: true, department: true } } },
    orderBy: { appliedAt: "asc" },
  }).catch(() => [])

  return ok({ ...candidate, applications })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)
  if (session.role === "VIEWER") return err("Insufficient permissions", 403)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = UpdateCandidateSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const existing = await prisma.candidate.findUnique({ where: { id } })
  if (!existing) return err("Candidate not found", 404)

  const candidate = await prisma.candidate.update({
    where: { id },
    data: parsed.data,
    include: {
      job: { select: { id: true, title: true } },
      assignedTo: { select: { id: true, name: true, avatar: true } },
      tags: { include: { tag: true } },
      _count: { select: { notes: true, interviews: true } },
    },
  })

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        candidateId: id,
        action: "STATUS_CHANGED",
        details: `${existing.status} → ${parsed.data.status}`,
        performedBy: session.name,
      },
    })
  }

  await audit("CANDIDATE_UPDATED", "candidates", { userId: session.id, resourceId: id, details: parsed.data as any })
  return ok(candidate)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const existing = await prisma.candidate.findUnique({ where: { id } })
  if (!existing) return err("Candidate not found", 404)

  await prisma.candidate.delete({ where: { id } })
  await audit("CANDIDATE_DELETED", "candidates", { userId: session.id, resourceId: id, details: { name: existing.name, email: existing.email } })
  return ok({ success: true })
}
