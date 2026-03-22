// src/app/api/users/[id]/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"
import { z } from "zod"

type RouteParams = { params: Promise<{ id: string }> }

const UpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "RECRUITER", "INTERVIEWER", "VIEWER"]).optional(),
  password: z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const isSelf = session.id === id
  if (!isSelf && session.role !== "SUPER_ADMIN" && session.role !== "ADMIN") {
    return err("Forbidden", 403)
  }

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const data: any = { ...parsed.data }
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12)
  }
  if (isSelf && data.isActive === false) {
    return err("Cannot deactivate your own account", 400)
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })

  await audit("USER_UPDATED", "users", { userId: session.id, resourceId: id })
  return ok(user)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await requireAuth(["SUPER_ADMIN"]).catch(() => null)
  if (!session) return err("Forbidden", 403)
  if (session.id === id) return err("Cannot delete your own account", 400)

  await prisma.user.delete({ where: { id } })
  await audit("USER_DELETED", "users", { userId: session.id, resourceId: id })
  return ok({ success: true })
}
