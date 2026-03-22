"use client"
import { useEffect, useState } from "react"
import AppShell from "@/components/AppShell"
import { Download, RefreshCw } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts"
import { STATUS_LABELS } from "@/types"
import { clsx } from "clsx"

const COLORS = ["#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#84cc16","#f43f5e","#6366f1"]

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  if (loading || !data) return (
    <AppShell><div className="p-8"><div className="h-8 w-40 bg-slate-200 rounded animate-pulse mb-6" /><div className="grid grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse" />)}</div></div></AppShell>
  )

  const statusData = Object.entries(data.totals)
    .filter(([k]) => ["applied","screening","shortlisted","interview","offer","selected","rejected"].includes(k))
    .map(([key, val]) => ({ name: STATUS_LABELS[key.toUpperCase() as any] || key, value: val as number }))
    .filter(d => d.value > 0)

  const sourceData = data.sourceBreakdown.map((s: any) => ({ name: s.source, value: s.count }))

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Hiring pipeline insights</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="btn-secondary text-sm"><RefreshCw size={13} />Refresh</button>
            <a href="/api/export" className="btn-primary text-sm"><Download size={13} />Export All CSV</a>
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Candidates", value: data.totals.total, color: "text-slate-900" },
            { label: "Conversion Rate", value: `${data.conversionRate}%`, color: "text-emerald-600" },
            { label: "Added This Month", value: data.trends.addedThisMonth, color: "text-sky-600" },
            { label: "In Active Pipeline", value: data.totals.inProcess, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="ats-card p-4 text-center">
              <p className={clsx("text-3xl font-bold tabular-nums", color)}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Pipeline status bar */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Candidates by Stage</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748b" }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" name="Candidates" radius={[0, 4, 4, 0]}>
                  {statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Source pie */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Candidate Sources</h2>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={11}>
                    {sourceData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400 text-sm text-center py-16">No source data yet</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Weekly trend */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Weekly Application Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.trends.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: "#0ea5e9" }} name="Applications" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Score averages */}
          <div className="ats-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Average Evaluation Scores</h2>
            {(data.avgScores.technicalScore || data.avgScores.overallScore) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: "Technical", score: data.avgScores.technicalScore ? parseFloat(data.avgScores.technicalScore.toFixed(2)) : 0 },
                  { name: "Communication", score: data.avgScores.communicationScore ? parseFloat(data.avgScores.communicationScore.toFixed(2)) : 0 },
                  { name: "Overall", score: data.avgScores.overallScore ? parseFloat(data.avgScores.overallScore.toFixed(2)) : 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}/10`, "Avg Score"]} />
                  <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400 text-sm text-center py-16">No score data yet. Score candidates to see averages.</p>}
          </div>
        </div>

        {/* Top skills */}
        {data.topSkills.length > 0 && (
          <div className="ats-card p-5 mt-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Top Skills in Talent Pool</h2>
            <div className="grid grid-cols-5 gap-3">
              {data.topSkills.map(({ skill, count }: any, i: number) => (
                <div key={skill} className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-xl font-bold text-slate-800 tabular-nums">{count}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize truncate">{skill}</p>
                  <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / data.topSkills[0].count) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Jobs Summary */}
        {data.jobStats.length > 0 && (
          <div className="ats-card p-5 mt-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Open Positions Pipeline</h2>
            <div className="space-y-2">
              {data.jobStats.map((job: any) => (
                <div key={job.id} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{job.title}</p>
                    {job.department && <p className="text-xs text-slate-400">{job.department}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, (job._count.candidates / 20) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-600 tabular-nums w-6 text-right">{job._count.candidates}</span>
                    <span className="text-xs text-slate-400">candidates</span>
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
