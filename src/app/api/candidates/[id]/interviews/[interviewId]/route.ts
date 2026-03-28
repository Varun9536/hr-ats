// src/app/api/candidates/[id]/interviews/[interviewId]/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { UpdateInterviewSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

type RouteParams = { params: Promise<{ id: string; interviewId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id, interviewId } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)
  if (session.role === "VIEWER") return err("Insufficient permissions", 403)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = UpdateInterviewSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const existing = await prisma.interview.findUnique({
    where: { id: interviewId },
  })
  if (!existing || existing.candidateId !== id) return err("Interview not found", 404)

  // Interviewers can only update their own interviews
  if (session.role === "INTERVIEWER" && existing.interviewerId !== session.id) {
    return err("You can only update interviews assigned to you", 403)
  }

  const data: any = { ...parsed.data }
  if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt)

  const interview = await prisma.interview.update({
    where: { id: interviewId },
    data,
    include: { interviewer: { select: { id: true, name: true, avatar: true } } },
  })

  // Log status transitions
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        candidateId: id,
        action: "INTERVIEW_STATUS_CHANGED",
        details: `${existing.type} interview: ${existing.status} → ${parsed.data.status}`,
        performedBy: session.name,
      },
    })
    // Log feedback submission
    if (parsed.data.status === "COMPLETED" && parsed.data.feedback) {
      await prisma.activityLog.create({
        data: {
          candidateId: id,
          action: "INTERVIEW_FEEDBACK_SUBMITTED",
          details: `${existing.type} interview rated ${parsed.data.rating ?? "—"}/5`,
          performedBy: session.name,
        },
      })
    }
  }

  await audit("INTERVIEW_UPDATED", "interviews", {
    userId: session.id, resourceId: interviewId,
    details: parsed.data as any,
  })

  return ok(interview)
}
