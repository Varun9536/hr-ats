// src/app/api/auth/logout/route.ts
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { destroySession, getSession } from "@/lib/auth"
import { ok } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session) {
    await audit("LOGOUT", "auth", { userId: session.id })
  }
  await destroySession()
  return ok({ success: true })
}
