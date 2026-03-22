// src/app/api/auth/me/route.ts
export const runtime = "nodejs"

import { getSession } from "@/lib/auth"
import { ok, err } from "@/lib/apiHelper"

export async function GET() {
  const session = await getSession()
  if (!session) return err("Unauthorized", 401)
  return ok({ user: session })
}
