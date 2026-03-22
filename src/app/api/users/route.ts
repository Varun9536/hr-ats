// src/app/api/users/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { CreateUserSchema } from "@/lib/validations"
import { ok, err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, avatar: true },
    orderBy: { createdAt: "desc" },
  })
  return ok(users)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN", "ADMIN"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  let body: unknown
  try { body = await req.json() } catch { return err("Invalid JSON", 400) }

  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) return err("Validation failed", 400, parsed.error.flatten().fieldErrors)

  const { name, email, password, role } = parsed.data

  // Only SUPER_ADMIN can create SUPER_ADMIN or ADMIN
  if (["SUPER_ADMIN", "ADMIN"].includes(role) && session.role !== "SUPER_ADMIN") {
    return err("Insufficient permissions to create this role", 403)
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return err("A user with this email already exists", 409)

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), password: hashed, role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  await audit("USER_CREATED", "users", { userId: session.id, resourceId: user.id, details: { email, role } })
  return ok(user, 201)
}
