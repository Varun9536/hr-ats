"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import AppShell from "@/components/AppShell"
import CandidateModal from "@/components/CandidateModal"
import { ScoreBadge } from "@/components/ScoreBadge"
import { Search, SlidersHorizontal, ChevronUp, ChevronDown, Plus, X, Download, RefreshCw, UserPlus, Filter } from "lucide-react"
import { Candidate, Status, CallStatus, STATUS_LABELS, STATUS_COLORS, CALL_STATUS_LABELS, CALL_STATUS_COLORS, PRIORITY_COLORS, ALL_STATUSES, ALL_CALL_STATUSES, ALL_SOURCES, ALL_PRIORITIES, SOURCE_LABELS } from "@/types"
import { clsx } from "clsx"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

function AddModal({ onClose, onAdded, jobs }: { onClose: () => void; onAdded: () => void; jobs: any[] }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", currentRole: "", location: "", source: "DIRECT", jobId: "", skills: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!form.name || !form.email) { setError("Name and email are required"); return }
    setSaving(true); setError("")
    const res = await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean), position: form.currentRole })
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "Failed"); return }
    onAdded(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 fade-in">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-900">Add Candidate</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["name","Full Name *","text"],["email","Email *","email"],["phone","Phone","tel"],["currentRole","Current Role","text"],["location","Location","text"]].map(([key, lbl, type]) => (
            <div key={key} className={key === "email" || key === "location" ? "col-span-2" : ""}>
              <label className="ats-label">{lbl}</label>
              <input type={type} className="ats-input" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="ats-label">Source</label>
            <select className="ats-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
              {ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          {jobs.length > 0 && (
            <div>
              <label className="ats-label">Job Position</label>
              <select className="ats-input" value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}>
                <option value="">— None —</option>
                {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-2">
            <label className="ats-label">Skills (comma-separated)</label>
            <input className="ats-input" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="react, python, sql…" />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Adding…" : "Add Candidate"}</button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function CandidatesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "")
  const [skillFilter, setSkillFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [sortBy, setSortBy] = useState("appliedAt")
  const [sortOrder, setSortOrder] = useState<"asc"|"desc">("desc")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [jobs, setJobs] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const highlightId = searchParams.get("highlight")

  const fetchCandidates = useCallback(async (pg = page) => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (statusFilter) p.set("status", statusFilter)
    if (skillFilter) p.set("skills", skillFilter)
    if (sourceFilter) p.set("source", sourceFilter)
    if (priorityFilter) p.set("priority", priorityFilter)
    p.set("sortBy", sortBy); p.set("sortOrder", sortOrder)
    p.set("page", String(pg)); p.set("pageSize", "50")
    const res = await fetch(`/api/candidates?${p}`)
    const data = await res.json()
    setCandidates(data.candidates || [])
    setPagination(data.pagination || {})
    setLoading(false)
  }, [search, statusFilter, skillFilter, sourceFilter, priorityFilter, sortBy, sortOrder, page])

  useEffect(() => {
    fetch("/api/jobs?active=true").then(r => r.json()).then(setJobs).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchCandidates(1), 300)
    return () => clearTimeout(t)
  }, [fetchCandidates])

  const matchedSkillsArr = skillFilter ? skillFilter.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : []

  function toggleSort(field: string) {
    if (sortBy === field) setSortOrder(o => o === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortOrder("desc") }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortBy !== field) return <ChevronUp size={11} className="text-slate-300" />
    return sortOrder === "asc" ? <ChevronUp size={11} className="text-sky-500" /> : <ChevronDown size={11} className="text-sky-500" />
  }

  async function quickUpdate(id: string, data: object) {
    await fetch(`/api/candidates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    fetchCandidates()
  }

  const activeFilters = [statusFilter, skillFilter, sourceFilter, priorityFilter].filter(Boolean).length

  return (
    <AppShell className="flex flex-col">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Candidates</h1>
            <p className="text-xs text-slate-400 mt-0.5">{pagination.total.toLocaleString()} total · page {pagination.page}/{pagination.totalPages}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/export" className="btn-secondary text-sm py-1.5"><Download size={13} />Export</a>
            <button onClick={() => fetchCandidates()} className="btn-secondary text-sm py-1.5"><RefreshCw size={13} /></button>
            {user && user.role !== "VIEWER" && user.role !== "INTERVIEWER" && (
              <button onClick={() => setShowAdd(true)} className="btn-primary text-sm py-1.5"><UserPlus size={14} />Add Candidate</button>
            )}
          </div>
        </div>

        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search name, email, company…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="ats-input pl-9 pr-8 py-2 text-sm" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="ats-input w-auto py-2 text-sm pr-8">
            <option value="">All Status</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>

          <button onClick={() => setShowFilters(f => !f)}
            className={clsx("btn-secondary text-sm py-2 gap-1.5", showFilters && "bg-sky-50 border-sky-300 text-sky-700")}>
            <Filter size={13} />
            Filters
            {activeFilters > 0 && <span className="bg-sky-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
          </button>

          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter(""); setSkillFilter(""); setSourceFilter(""); setPriorityFilter("") }}
              className="text-xs text-red-500 hover:text-red-700 font-medium">Clear all</button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-end gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <div>
              <label className="ats-label">Skill Match</label>
              <input className="ats-input w-48 py-1.5 text-sm" placeholder="react, python…"
                value={skillFilter} onChange={e => setSkillFilter(e.target.value)} />
            </div>
            <div>
              <label className="ats-label">Source</label>
              <select className="ats-input w-36 py-1.5 text-sm" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                <option value="">All Sources</option>
                {ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="ats-label">Priority</label>
              <select className="ats-input w-32 py-1.5 text-sm" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="">All</option>
                {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {skillFilter && <p className="text-xs text-emerald-600 font-medium self-end pb-2">✓ Highlighting matching candidates</p>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full ats-table">
          <thead>
            <tr>
              <th><button className="flex items-center gap-1 hover:text-slate-800" onClick={() => toggleSort("name")}>Candidate <SortIcon field="name" /></button></th>
              <th>Job / Role</th>
              <th>Status</th>
              <th>Call</th>
              <th>Priority</th>
              <th>Source</th>
              <th>Skills</th>
              <th><button className="flex items-center gap-1 hover:text-slate-800" onClick={() => toggleSort("technicalScore")}>Tech <SortIcon field="technicalScore" /></button></th>
              <th><button className="flex items-center gap-1 hover:text-slate-800" onClick={() => toggleSort("overallScore")}>Overall <SortIcon field="overallScore" /></button></th>
              <th><button className="flex items-center gap-1 hover:text-slate-800" onClick={() => toggleSort("appliedAt")}>Applied <SortIcon field="appliedAt" /></button></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-16 text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-slate-300" />Loading…
              </td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-16">
                <p className="text-slate-400 text-sm">No candidates match your filters.</p>
              </td></tr>
            ) : candidates.map((c) => {
              const hasMatch = matchedSkillsArr.length > 0 && c.skills.some(s => matchedSkillsArr.includes(s.toLowerCase()))
              const isFiltered = matchedSkillsArr.length > 0
              return (
                <tr key={c.id} onClick={() => setSelectedId(c.id)}
                  className={clsx("cursor-pointer transition-colors",
                    c.id === highlightId && "bg-sky-50",
                    isFiltered && hasMatch && "bg-emerald-50/40",
                    isFiltered && !hasMatch && "opacity-40")}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{c.email}</p>
                        {c.currentCompany && <p className="text-xs text-slate-400">{c.currentCompany}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.job ? (
                      <p className="text-xs font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded truncate max-w-[120px]">{c.job.title}</p>
                    ) : c.currentRole ? (
                      <p className="text-xs text-slate-500 truncate max-w-[120px]">{c.currentRole}</p>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {user?.role !== "VIEWER" ? (
                      <select value={c.status} onChange={e => quickUpdate(c.id, { status: e.target.value })}
                        className={clsx("status-pill cursor-pointer border-0 focus:ring-2 focus:ring-sky-500 focus:outline-none", STATUS_COLORS[c.status])}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    ) : (
                      <span className={clsx("status-pill", STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status]}</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {user?.role !== "VIEWER" ? (
                      <select value={c.callStatus} onChange={e => quickUpdate(c.id, { callStatus: e.target.value })}
                        className={clsx("status-pill cursor-pointer border-0 focus:ring-2 focus:ring-sky-500 focus:outline-none text-xs", CALL_STATUS_COLORS[c.callStatus])}>
                        {ALL_CALL_STATUSES.map(s => <option key={s} value={s}>{CALL_STATUS_LABELS[s]}</option>)}
                      </select>
                    ) : (
                      <span className={clsx("status-pill text-xs", CALL_STATUS_COLORS[c.callStatus])}>{CALL_STATUS_LABELS[c.callStatus]}</span>
                    )}
                  </td>
                  <td><span className={clsx("text-xs font-bold", PRIORITY_COLORS[c.priority])}>{c.priority}</span></td>
                  <td><span className="text-xs text-slate-500">{SOURCE_LABELS[c.source] || c.source}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {c.skills.slice(0, 3).map(s => (
                        <span key={s} className={clsx("skill-tag", matchedSkillsArr.includes(s.toLowerCase()) && "matched")}>{s}</span>
                      ))}
                      {c.skills.length > 3 && <span className="text-xs text-slate-400">+{c.skills.length - 3}</span>}
                    </div>
                  </td>
                  <td><ScoreBadge score={c.technicalScore} /></td>
                  <td><ScoreBadge score={c.overallScore} /></td>
                  <td>
                    <div>
                      <p className="text-xs text-slate-500">{new Date(c.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                      {c._count && (c._count.notes > 0 || c._count.interviews > 0) && (
                        <p className="text-xs text-slate-400">
                          {c._count.notes > 0 && `${c._count.notes} note${c._count.notes > 1 ? "s" : ""}`}
                          {c._count.notes > 0 && c._count.interviews > 0 && " · "}
                          {c._count.interviews > 0 && `${c._count.interviews} iv`}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-500">Showing {candidates.length} of {pagination.total}</p>
          <div className="flex gap-2">
            <button onClick={() => { setPage(p => p - 1); fetchCandidates(page - 1) }} disabled={page <= 1} className="btn-secondary text-sm py-1.5 disabled:opacity-40">← Prev</button>
            <span className="flex items-center text-sm text-slate-600 font-medium px-2">{page} / {pagination.totalPages}</span>
            <button onClick={() => { setPage(p => p + 1); fetchCandidates(page + 1) }} disabled={page >= pagination.totalPages} className="btn-secondary text-sm py-1.5 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {selectedId && (
        <CandidateModal
          candidateId={selectedId}
          matchedSkills={matchedSkillsArr}
          onClose={() => setSelectedId(null)}
          onUpdate={() => fetchCandidates()}
          onDelete={() => { setSelectedId(null); fetchCandidates() }}
        />
      )}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={() => fetchCandidates()} jobs={jobs} />}
    </AppShell>
  )
}
