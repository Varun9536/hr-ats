// src/app/api/files/[...path]/route.ts
// Serves uploaded files (resumes) from the uploads directory.
// Needed because Next.js standalone mode doesn't serve public/uploads dynamically.
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")

const MIME_TYPES: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc":  "application/msword",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  // Prevent path traversal: only allow filenames, no directory traversal
  const fileName = segments.join("/")
  if (fileName.includes("..") || fileName.includes("/")) {
    // Only allow single-level filenames (no subdirectories)
    if (segments.length !== 1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const safeName = path.basename(fileName)
  const filePath = path.join(UPLOADS_DIR, safeName)

  // Ensure the resolved path is still inside UPLOADS_DIR
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const buffer = await readFile(filePath)
    const ext = path.extname(safeName).toLowerCase()
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
