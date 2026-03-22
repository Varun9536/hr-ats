// src/lib/auth.ts
// Next.js 16: cookies() is now async
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { prisma } from "./prisma"
import type { UserRole } from "@prisma/client"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-to-a-long-random-secret-in-production"
)
const SESSION_COOKIE = "autohire_session"
const SESSION_DURATION = 8 * 60 * 60 // 8 hours in seconds

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string | null
}

export async function createSession(
  user: SessionUser,
  ipAddress?: string,
  userAgent?: string
) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET)

  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000)

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt, ipAddress, userAgent },
  })

  // Next.js 16: await cookies()
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    // Next.js 16: await cookies()
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    await jwtVerify(token, JWT_SECRET)

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, role: true,
            avatar: true, isActive: true,
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      await destroySession()
      return null
    }

    if (!session.user.isActive) {
      await destroySession()
      return null
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      avatar: session.user.avatar,
    }
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {})
    cookieStore.delete(SESSION_COOKIE)
  }
}

export async function requireAuth(requiredRoles?: UserRole[]): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error("UNAUTHORIZED")
  if (requiredRoles && !requiredRoles.includes(session.role)) {
    throw new Error("FORBIDDEN")
  }
  return session
}

export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["candidates:*", "jobs:*", "users:read", "reports:*", "interviews:*"],
  RECRUITER: ["candidates:*", "jobs:read", "interviews:*", "reports:read"],
  INTERVIEWER: ["candidates:read", "interviews:*"],
  VIEWER: ["candidates:read", "jobs:read"],
} as const

export function canPerform(role: UserRole, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role] as readonly string[]
  if (perms.includes("*")) return true
  if (perms.includes(action)) return true
  const [resource] = action.split(":")
  if (perms.includes(`${resource}:*`)) return true
  return false
}
