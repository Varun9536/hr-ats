// src/app/api/candidates/[id]/notes/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { CreateNoteSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const notes = await prisma.candidateNote.findMany({
    where: {
      candidateId: id,
      ...(["VIEWER", "INTERVIEWER"].includes(session.role) ? { isPrivate: false } : {}),
    },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  })
  return ok(notes)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN", "RECRUITER", "INTERVIEWER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = CreateNoteSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const note = await prisma.candidateNote.create({
    data: {
      candidateId: id,
      authorId: session.id,
      content: parsed.data.content,
      isPrivate: parsed.data.isPrivate,
    },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  await prisma.activityLog.create({
    data: {
      candidateId: id,
      action: "NOTE_ADDED",
      details: parsed.data.isPrivate ? "Private note added" : "Note added",
      performedBy: session.name,
    },
  })

  return ok(note, 201)
}
