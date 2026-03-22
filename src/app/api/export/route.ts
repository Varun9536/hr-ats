// src/app/api/export/route.ts
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { err } from "@/lib/apiHelper"
import { audit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const session = await requireAuth(["SUPER_ADMIN","ADMIN","RECRUITER"]).catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const sp = new URL(req.url).searchParams
  const status = sp.get("status")
  const jobId = sp.get("jobId")

  const candidates = await prisma.candidate.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(jobId ? { jobId } : {}),
    },
    include: {
      job: { select: { title: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { appliedAt: "desc" },
  })

  // Build CSV
  const headers = [
    "Name","Email","Phone","Location","Current Role","Current Company",
    "Experience (yrs)","Expected Salary","Notice Period","Status","Priority",
    "Source","Job","Assigned To","Technical Score","Communication Score",
    "Culture Fit Score","Overall Score","Skills","Call Status","Applied At",
  ]

  const escape = (val: unknown) => {
    if (val == null) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = candidates.map((c) => [
    c.name, c.email, c.phone, c.location, c.currentRole, c.currentCompany,
    c.experienceYears, c.expectedSalary, c.noticePeriod,
    c.status, c.priority, c.source,
    c.job?.title, c.assignedTo?.name,
    c.technicalScore, c.communicationScore, c.cultureFitScore, c.overallScore,
    c.skills.join("; "), c.callStatus,
    new Date(c.appliedAt).toISOString().split("T")[0],
  ].map(escape).join(","))

  const csv = [headers.join(","), ...rows].join("\n")

  await audit("EXPORT_CSV", "candidates", { userId: session.id, details: { count: candidates.length } })

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidates-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
