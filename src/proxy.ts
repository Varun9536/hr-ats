// src/middleware.ts
// Next.js 16: middleware runs on Edge by default — only use jose (not prisma/bcrypt here)
import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-to-a-long-random-secret-in-production"
)
const SESSION_COOKIE = "autohire_session"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    /\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Next.js 16: cookies() is async in route handlers, but in middleware
  // we access via request.cookies (synchronous, always available in middleware)
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 })
      : NextResponse.redirect(new URL("/login?expired=1", request.url))

    response.cookies.delete(SESSION_COOKIE)
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
