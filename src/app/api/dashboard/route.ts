// src/app/api/dashboard/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { err } from "@/lib/apiHelper"

export async function GET() {
  const session = await requireAuth().catch(() => null)
  if (!session) return err("Unauthorized", 401)

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    total, selected, rejected, applied, shortlisted, interview, offer, screening, onHold, withdrawn,
    addedThisWeek, addedThisMonth,
    recentCandidates, allForSkills, jobStats, avgScores, sourceBreakdown,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.candidate.count({ where: { status: "SELECTED" } }),
    prisma.candidate.count({ where: { status: "REJECTED" } }),
    prisma.candidate.count({ where: { status: "APPLIED" } }),
    prisma.candidate.count({ where: { status: "SHORTLISTED" } }),
    prisma.candidate.count({ where: { status: "INTERVIEW" } }),
    prisma.candidate.count({ where: { status: "OFFER" } }),
    prisma.candidate.count({ where: { status: "SCREENING" } }),
    prisma.candidate.count({ where: { status: "ON_HOLD" } }),
    prisma.candidate.count({ where: { status: "WITHDRAWN" } }),
    prisma.candidate.count({ where: { appliedAt: { gte: sevenDaysAgo } } }),
    prisma.candidate.count({ where: { appliedAt: { gte: thirtyDaysAgo } } }),
    prisma.candidate.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, name: true, status: true, updatedAt: true,
        currentRole: true, overallScore: true, priority: true,
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.candidate.findMany({ select: { skills: true } }),
    prisma.job.findMany({
      where: { isActive: true },
      select: {
        id: true, title: true, department: true,
        _count: { select: { candidates: true } },
      },
      take: 5,
    }),
    prisma.candidate.aggregate({
      _avg: { technicalScore: true, communicationScore: true, cultureFitScore: true, overallScore: true },
    }),
    prisma.candidate.groupBy({
      by: ["source"],
      _count: { source: true },
      orderBy: { _count: { source: "desc" } },
    }),
  ])

  // Weekly trend (last 4 weeks)
  const weeklyTrend = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const count = await prisma.candidate.count({
      where: { appliedAt: { gte: weekStart, lt: weekEnd } },
    })
    weeklyTrend.push({
      label: `Week ${4 - i}`,
      count,
      weekStart: weekStart.toISOString(),
    })
  }

  // Skill frequency
  const skillCount: Record<string, number> = {}
  for (const c of allForSkills) {
    for (const skill of c.skills) {
      skillCount[skill] = (skillCount[skill] || 0) + 1
    }
  }
  const topSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }))

  const inProcess = screening + applied + shortlisted + interview + offer + onHold
  const conversionRate = total > 0 ? Math.round((selected / total) * 100) : 0

  return NextResponse.json({
    totals: { total, selected, rejected, inProcess, applied, shortlisted, interview, offer, screening, onHold, withdrawn },
    trends: { addedThisWeek, addedThisMonth, weeklyTrend },
    conversionRate,
    avgScores: avgScores._avg,
    topSkills,
    recentCandidates,
    jobStats,
    sourceBreakdown: sourceBreakdown.map((s) => ({ source: s.source, count: s._count.source })),
  })
}
