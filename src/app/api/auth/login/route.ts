// src/app/api/auth/login/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createSession, cleanupExpiredSessions } from "@/lib/auth"
import { LoginSchema } from "@/lib/validations"
import { ok, err, getIP, checkRateLimit } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const ip = getIP(req)

  // Rate limit: 5 attempts per minute per IP
  const limited = checkRateLimit(`login:${ip}`, 5, 60_000)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err("Invalid JSON body", 400)
  }

  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return err("Validation failed", 400, parsed.error.flatten().fieldErrors)
  }

  const { email, password } = parsed.data

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  // Constant-time comparison to prevent user enumeration
  const dummyHash = "$2a$12$dummy.hash.for.timing.attack.prevention.placeholder"
  const passwordMatch = user
    ? await bcrypt.compare(password, user.password)
    : await bcrypt.compare(password, dummyHash).then(() => false)

  if (!user || !passwordMatch) {
    await audit("LOGIN_FAILED", "auth", { ipAddress: ip, details: { email } })
    return err("Invalid email or password", 401)
  }

  if (!user.isActive) {
    return err("Your account has been deactivated. Contact an administrator.", 403)
  }

  // Create session
  await createSession(
    { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    ip,
    req.headers.get("user-agent") || undefined
  )

  // Async cleanup - don't await
  cleanupExpiredSessions().catch(() => {})

  await audit("LOGIN_SUCCESS", "auth", { userId: user.id, ipAddress: ip })

  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  })
}
