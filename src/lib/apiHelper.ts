// src/lib/apiHelper.ts
import { NextRequest, NextResponse } from "next/server"
import { getSession, requireAuth } from "./auth"
import { rateLimit } from "./rateLimit"
import type { SessionUser } from "./auth"
import type { UserRole } from "@prisma/client"

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

// Wrap a route handler with auth check
export function withAuth(
  handler: (req: NextRequest, session: SessionUser, ...args: any[]) => Promise<NextResponse>,
  roles?: UserRole[]
) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const session = await requireAuth(roles)
      return await handler(req, session, ...args)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return err("Unauthorized", 401)
      if (e.message === "FORBIDDEN") return err("Forbidden - insufficient permissions", 403)
      console.error("Route error:", e)
      return err("Internal server error", 500)
    }
  }
}

// Apply rate limiting to a request
export function checkRateLimit(key: string, max = 10, windowMs = 60_000) {
  const result = rateLimit(key, max, windowMs)
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }
  return null
}
