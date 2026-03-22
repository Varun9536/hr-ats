// src/app/api/candidates/[id]/interviews/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { CreateInterviewSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const interviews = await prisma.interview.findMany({
    where: { candidateId: id },
    include: { interviewer: { select: { id: true, name: true, avatar: true } } },
    orderBy: { scheduledAt: "desc" },
  })
  return ok(interviews)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN", "RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = CreateInterviewSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const interview = await prisma.interview.create({
    data: {
      candidateId: id,
      interviewerId: session.id,
      scheduledAt: new Date(parsed.data.scheduledAt),
      duration: parsed.data.duration,
      type: parsed.data.type,
      mode: parsed.data.mode,
      meetingLink: parsed.data.meetingLink,
      notes: parsed.data.notes,
    },
    include: { interviewer: { select: { id: true, name: true, avatar: true } } },
  })

  await prisma.activityLog.create({
    data: {
      candidateId: id,
      action: "INTERVIEW_SCHEDULED",
      details: `${parsed.data.type} interview scheduled`,
      performedBy: session.name,
    },
  })

  return ok(interview, 201)
}
