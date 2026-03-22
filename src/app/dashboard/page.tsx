"use client"
import { useEffect, useState } from "react"
import AppShell from "@/components/AppShell"
import Link from "next/link"
import { Users, CheckCircle2, XCircle, Clock, TrendingUp, ArrowRight, Download, RefreshCw, AlertTriangle, BarChart3 } from "lucide-react"
import { STATUS_COLORS, STATUS_LABELS } from "@/types"
import { clsx } from "clsx"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface DashData {
  totals: Record<string, number>
  trends: { addedThisWeek: number; addedThisMonth: number; weeklyTrend: { label: string; count: number }[] }
  conversionRate: number
  avgScores: { technicalScore: number | null; communicationScore: number | null; overallScore: number | null }
  topSkills: { skill: string; count: number }[]
  recentCandidates: any[]
  jobStats: any[]
  sourceBreakdown: { source: string; count: number }[]
}

const PIE_COLORS = ["#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#84cc16","#f43f5e"]

function StatCard({ label, value, icon: Icon, color, sub, href }: any) {
  const content = (
    <div className={clsx("ats-card p-5 hover:shadow-md transition-shadow", href && "cursor-pointer")}>
      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon size={17} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  if (loading || !data) return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </AppShell>
  )

  const { totals, trends, conversionRate, avgScores, topSkills, recentCandidates, jobStats, sourceBreakdown } = data
  const maxSkill = topSkills[0]?.count || 1

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {totals.addedThisWeek || trends.addedThisWeek} candidates added this week
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="btn-secondary text-sm"><RefreshCw size={13} />Refresh</button>
            <a href="/api/export" className="btn-secondary text-sm"><Download size={13} />Export CSV</a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Candidates" value={totals.total} icon={Users} color="bg-slate-700" href="/candidates" />
          <StatCard label="Selected" value={totals.selected} icon={CheckCircle2} color="bg-emerald-500"
            sub={`${conversionRate}% conversion`} href="/candidates?status=SELECTED" />
          <StatCard label="Rejected" value={totals.rejected} icon={XCircle} color="bg-red-500" href="/candidates?status=REJECTED" />
          <StatCard label="In Pipeline" value={totals.inProcess} icon={Clock} color="bg-sky-500"
            sub="Active candidates" href="/candidates" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Applied", key: "applied", color: "text-slate-600" },
            { label: "Screening", key: "screening", color: "text-purple-600" },
            { label: "Shortlisted", key: "shortlisted", color: "text-blue-600" },
            { label: "Interview", key: "interview", color: "text-amber-600" },
            { label: "Offer", key: "offer", color: "text-cyan-600" },
            { label: "On Hold", key: "onHold", color: "text-orange-600" },
          ].map(({ label, key, color }) => (
            <div key={key} className="ats-card p-3 text-center">
              <p className={clsx("text-xl font-bold tabular-nums", color)}>{(totals[key] || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Weekly Trend Chart */}
          <div className="col-span-2 ats-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={15} className="text-slate-400" />Weekly Trend</h2>
              <span className="text-xs text-slate-400">Last 4 weeks</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trends.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2} name="Candidates" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Source breakdown */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-slate-400" />Source Breakdown</h2>
            {sourceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceBreakdown} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={65} label={({ source, percent }) => `${source} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {sourceBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400 text-sm text-center py-8">No data yet</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Pipeline */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Pipeline Status</h2>
            <div className="space-y-2.5">
              {["APPLIED","SCREENING","SHORTLISTED","INTERVIEW","OFFER","SELECTED","REJECTED"].map(s => {
                const key = s.toLowerCase().replace("_","")
                const val = totals[key] || totals[s.toLowerCase()] || 0
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-20 shrink-0">
                      <span className={clsx("status-pill text-xs", STATUS_COLORS[s as any])}>{STATUS_LABELS[s as any]}</span>
                    </div>
                    <div className="flex-1 h-4 bg-slate-50 rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full",
                        s==="SELECTED"?"bg-emerald-500":s==="REJECTED"?"bg-red-400":s==="INTERVIEW"?"bg-amber-400":s==="SHORTLISTED"?"bg-blue-400":s==="OFFER"?"bg-cyan-500":"bg-slate-300"
                      )} style={{ width: totals.total ? `${(val/totals.total)*100}%` : "0%" }} />
                    </div>
                    <span className="w-7 text-right text-xs font-bold text-slate-600 tabular-nums">{val}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Skills */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Top Skills in Pool</h2>
            {topSkills.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No skills data</p>
            ) : (
              <div className="space-y-2.5">
                {topSkills.map(({ skill, count }) => (
                  <div key={skill} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-24 truncate capitalize">{skill}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${(count/maxSkill)*100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 w-5 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="ats-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700">Recent Activity</h2>
              <Link href="/candidates" className="text-xs text-sky-600 hover:underline flex items-center gap-1">All <ArrowRight size={11} /></Link>
            </div>
            {recentCandidates.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No candidates yet</p>
            ) : (
              <div className="space-y-2">
                {recentCandidates.map((c: any) => (
                  <Link key={c.id} href={`/candidates?highlight=${c.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>
                      {c.currentRole && <p className="text-xs text-slate-400 truncate">{c.currentRole}</p>}
                    </div>
                    <span className={clsx("status-pill text-xs shrink-0", STATUS_COLORS[c.status as any])}>
                      {STATUS_LABELS[c.status as any]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Avg scores */}
        {(avgScores.technicalScore || avgScores.overallScore) && (
          <div className="mt-6 ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Average Scores Across All Candidates</h2>
            <div className="grid grid-cols-3 gap-6">
              {[
                ["Technical", avgScores.technicalScore],
                ["Communication", avgScores.communicationScore],
                ["Overall", avgScores.overallScore],
              ].map(([label, val]) => (
                <div key={label as string} className="text-center">
                  <p className="text-3xl font-bold text-slate-900 tabular-nums">{val ? (val as number).toFixed(1) : "—"}</p>
                  <p className="text-sm text-slate-500 mt-1">{label as string}</p>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden mx-4">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${val ? ((val as number)/10)*100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
