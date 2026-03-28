"use client"
import { useState, useEffect } from "react"
import { X, Save, Trash2, ExternalLink, Lock, Clock, Phone, Linkedin, Globe, Send, Brain, RefreshCw } from "lucide-react"
import { Candidate, JobApplication, STATUS_LABELS, STATUS_COLORS, CALL_STATUS_LABELS, CALL_STATUS_COLORS, ALL_STATUSES, ALL_CALL_STATUSES, ALL_SOURCES, ALL_PRIORITIES, SOURCE_LABELS } from "@/types"
import { ScoreBar, ScoreBadge } from "./ScoreBadge"
import { clsx } from "clsx"
import { useAuth } from "@/hooks/useAuth"

interface Note { id: string; content: string; isPrivate: boolean; createdAt: string; author: { name: string; avatar?: string | null } }
interface Interview { id: string; scheduledAt: string; duration: number; type: string; mode: string; status: string; feedback?: string | null; rating?: number | null; meetingLink?: string | null; notes?: string | null; interviewer: { id: string; name: string } }

interface Props {
  candidateId: string
  matchedSkills: string[]
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

type Tab = "overview" | "notes" | "interviews" | "resume" | "activity"

export default function CandidateModal({ candidateId, matchedSkills, onClose, onUpdate, onDelete }: Props) {
  const { user } = useAuth()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>("overview")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [notePrivate, setNotePrivate] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const [rescoreResult, setRescoreResult] = useState<any>(null)
  const [form, setForm] = useState<Partial<Candidate>>({})

  const isViewer = user?.role === "VIEWER"
  const canEdit = !isViewer

  async function loadCandidate() {
    const res = await fetch(`/api/candidates/${candidateId}`)
    if (!res.ok) return
    const data = await res.json()
    setCandidate(data)
    setNotes(data.notes || [])
    setInterviews(data.interviews || [])
    setActivityLog(data.activityLog || [])
    setForm({
      name: data.name, phone: data.phone, location: data.location,
      linkedIn: data.linkedIn, portfolio: data.portfolio,
      currentCompany: data.currentCompany, currentRole: data.currentRole,
      experienceYears: data.experienceYears, expectedSalary: data.expectedSalary,
      noticePeriod: data.noticePeriod, status: data.status, callStatus: data.callStatus,
      source: data.source, priority: data.priority,
      technicalScore: data.technicalScore, communicationScore: data.communicationScore,
      cultureFitScore: data.cultureFitScore, overallScore: data.overallScore,
      skills: data.skills,
    })
  }

  useEffect(() => { loadCandidate() }, [candidateId])

  async function handleSave() {
    if (!candidate) return
    setSaving(true)
    await fetch(`/api/candidates/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setEditing(false)
    await loadCandidate()
    onUpdate()
  }

  async function handleRescore() {
    if (!candidate) return
    setRescoring(true)
    setRescoreResult(null)
    const res = await fetch(`/api/candidates/${candidate.id}/score`, { method: "POST" })
    const data = await res.json()
    setRescoring(false)
    if (res.ok) {
      setRescoreResult(data.scores)
      await loadCandidate()
      onUpdate()
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !candidate) return
    setAddingNote(true)
    await fetch(`/api/candidates/${candidate.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, isPrivate: notePrivate }),
    })
    setNewNote(""); setNotePrivate(false); setAddingNote(false)
    await loadCandidate()
  }

  async function handleQuickStatus(status: string) {
    if (!candidate) return
    await fetch(`/api/candidates/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await loadCandidate(); onUpdate()
  }

  async function handleDelete() {
    if (!candidate || !confirm(`Permanently delete ${candidate.name}?`)) return
    await fetch(`/api/candidates/${candidate.id}`, { method: "DELETE" })
    onDelete()
  }

  const inputCls = "ats-input"
  const labelCls = "ats-label"
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes", count: notes.length },
    { key: "interviews", label: "Interviews", count: interviews.length },
    { key: "resume", label: "Resume" },
    { key: "activity", label: "Activity" },
  ]

  if (!candidate) return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col slide-in">

        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {candidate.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{candidate.name}</h2>
                <p className="text-sm text-slate-500 truncate">{candidate.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEdit && (
                <button onClick={() => setEditing(!editing)}
                  className={clsx("text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors",
                    editing ? "bg-slate-100 border-slate-300 text-slate-700" : "border-slate-200 hover:bg-slate-50 text-slate-600")}>
                  {editing ? "Cancel" : "Edit"}
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
          </div>

          {/* Quick status bar */}
          {canEdit && !editing && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {ALL_STATUSES.map(s => (
                <button key={s} onClick={() => handleQuickStatus(s)}
                  className={clsx("status-pill cursor-pointer hover:opacity-80 transition-opacity", STATUS_COLORS[s],
                    candidate.status === s && "ring-2 ring-offset-1 ring-sky-500")}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-3 border-b -mb-4 pb-0">
            {tabs.map(({ key, label, count }) => (
              <button key={key} onClick={() => setTab(key)}
                className={clsx("px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  tab === key ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-700")}>
                {label}
                {count !== undefined && count > 0 && (
                  <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={clsx("status-pill", STATUS_COLORS[candidate.status])}>{STATUS_LABELS[candidate.status]}</span>
                <span className={clsx("status-pill", CALL_STATUS_COLORS[candidate.callStatus])}><Phone size={10} />{CALL_STATUS_LABELS[candidate.callStatus]}</span>
                {candidate.priority && (
                  <span className={clsx("status-pill", candidate.priority === "URGENT" ? "bg-red-100 text-red-700" : candidate.priority === "HIGH" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                    {candidate.priority}
                  </span>
                )}
                {candidate.source && <span className="status-pill bg-purple-50 text-purple-700">{SOURCE_LABELS[candidate.source]}</span>}
              </div>

              {/* Info */}
              {!editing && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    [Phone, candidate.phone],
                    [Clock, candidate.experienceYears ? `${candidate.experienceYears} yrs exp` : null],
                    [BriefcaseIcon, candidate.currentRole],
                    [BuildingIcon, candidate.currentCompany],
                    [MapPinIcon, candidate.location],
                    [ClockIcon2, candidate.noticePeriod ? `Notice: ${candidate.noticePeriod}` : null],
                  ].filter(([, v]) => v).map(([Icon, val]: any, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-600">
                      <Icon size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate text-sm">{val}</span>
                    </div>
                  ))}
                  {candidate.expectedSalary && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400 text-xs font-bold shrink-0">₹</span>
                      <span className="text-sm">{candidate.expectedSalary.toLocaleString("en-IN")}/yr</span>
                    </div>
                  )}
                </div>
              )}

              {/* Links */}
              {!editing && (candidate.linkedIn || candidate.portfolio) && (
                <div className="flex gap-3">
                  {candidate.linkedIn && (
                    <a href={candidate.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                      <Linkedin size={13} />LinkedIn
                    </a>
                  )}
                  {candidate.portfolio && (
                    <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-sky-600 hover:underline">
                      <Globe size={13} />Portfolio
                    </a>
                  )}
                </div>
              )}

              {/* ATS SCORE SECTION */}
              {!editing && (
                <div className="ats-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain size={15} className="text-sky-600" />
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">ATS Score</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {candidate.overallScore != null && (
                        <span className={clsx("text-xl font-bold tabular-nums",
                          candidate.overallScore >= 8 ? "text-emerald-600" :
                          candidate.overallScore >= 6 ? "text-sky-600" :
                          candidate.overallScore >= 4 ? "text-amber-600" : "text-red-600")}>
                          {candidate.overallScore.toFixed(1)}<span className="text-sm text-slate-400">/10</span>
                        </span>
                      )}
                      {canEdit && (
                        <button onClick={handleRescore} disabled={rescoring}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-semibold transition-colors disabled:opacity-50 border border-sky-200">
                          <RefreshCw size={11} className={rescoring ? "animate-spin" : ""} />
                          {rescoring ? "Scoring…" : "Re-score"}
                        </button>
                      )}
                    </div>
                  </div>

                  <ScoreBar score={candidate.technicalScore} label="Technical" />
                  <ScoreBar score={candidate.communicationScore} label="Communication" />
                  <ScoreBar score={candidate.cultureFitScore} label="Culture Fit" />
                  <ScoreBar score={candidate.overallScore} label="Overall" />

                  {/* Rescore result */}
                  {rescoreResult && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 fade-in">
                      <p className="text-xs font-semibold text-sky-700 flex items-center gap-1">
                        ✓ Score updated — {rescoreResult.skillMatchPercent}% skill match
                      </p>
                      {rescoreResult.summary && (
                        <p className="text-xs text-slate-500 italic">"{rescoreResult.summary}"</p>
                      )}
                      {rescoreResult.strengths?.length > 0 && (
                        <div>
                          {rescoreResult.strengths.slice(0, 2).map((s: string, i: number) => (
                            <p key={i} className="text-xs text-emerald-700">✓ {s}</p>
                          ))}
                        </div>
                      )}
                      {rescoreResult.gaps?.length > 0 && (
                        <div>
                          {rescoreResult.gaps.slice(0, 2).map((g: string, i: number) => (
                            <p key={i} className="text-xs text-amber-700">⚠ {g}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {candidate.overallScore == null && !rescoring && (
                    <p className="text-xs text-slate-400 text-center py-1">Click Re-score to calculate ATS score</p>
                  )}
                </div>
              )}

              {/* Skills */}
              {!editing && (
                <div>
                  <p className={labelCls}>Skills ({candidate.skills.length})</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {candidate.skills.length === 0 && <span className="text-sm text-slate-400">No skills extracted</span>}
                    {candidate.skills.map(skill => (
                      <span key={skill} className={clsx("skill-tag", matchedSkills.includes(skill.toLowerCase()) && "matched")}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Applications */}
              {!editing && (candidate.job || (candidate.applications && candidate.applications.length > 0)) && (
                <div className="space-y-1.5">
                  {candidate.job && (
                    <div className="flex items-center gap-2 text-sm bg-sky-50 text-sky-700 px-3 py-2 rounded-lg">
                      <BriefcaseIcon size={13} />
                      <span>Primary: <strong>{candidate.job.title}</strong>{candidate.job.department ? ` · ${candidate.job.department}` : ""}</span>
                    </div>
                  )}
                  {candidate.applications && candidate.applications
                    .filter(a => a.jobId !== candidate.jobId)
                    .map((a: JobApplication) => (
                      <div key={a.id} className="flex items-center gap-2 text-sm bg-slate-50 text-slate-600 px-3 py-2 rounded-lg border border-slate-100">
                        <BriefcaseIcon size={13} className="text-slate-400" />
                        <span>Also applied: <strong>{a.job?.title ?? a.jobId}</strong>{a.job?.department ? ` · ${a.job.department}` : ""}</span>
                        <span className="ml-auto text-xs text-slate-400">{new Date(a.appliedAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Edit form */}
              {editing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Full Name</label><input className={inputCls} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                    <div><label className={labelCls}>Location</label><input className={inputCls} value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                    <div><label className={labelCls}>LinkedIn</label><input className={inputCls} value={form.linkedIn || ""} onChange={e => setForm(f => ({ ...f, linkedIn: e.target.value }))} /></div>
                    <div><label className={labelCls}>Current Role</label><input className={inputCls} value={form.currentRole || ""} onChange={e => setForm(f => ({ ...f, currentRole: e.target.value }))} /></div>
                    <div><label className={labelCls}>Current Company</label><input className={inputCls} value={form.currentCompany || ""} onChange={e => setForm(f => ({ ...f, currentCompany: e.target.value }))} /></div>
                    <div><label className={labelCls}>Experience (yrs)</label><input type="number" className={inputCls} value={form.experienceYears ?? ""} onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value ? Number(e.target.value) : null }))} /></div>
                    <div><label className={labelCls}>Expected Salary (₹)</label><input type="number" className={inputCls} value={form.expectedSalary ?? ""} onChange={e => setForm(f => ({ ...f, expectedSalary: e.target.value ? Number(e.target.value) : null }))} /></div>
                    <div><label className={labelCls}>Notice Period</label><input className={inputCls} value={form.noticePeriod || ""} onChange={e => setForm(f => ({ ...f, noticePeriod: e.target.value }))} placeholder="e.g. 30 days" /></div>
                    <div><label className={labelCls}>Source</label>
                      <select className={inputCls} value={form.source || "DIRECT"} onChange={e => setForm(f => ({ ...f, source: e.target.value as any }))}>
                        {ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Call Status</label>
                      <select className={inputCls} value={form.callStatus || "NOT_CALLED"} onChange={e => setForm(f => ({ ...f, callStatus: e.target.value as any }))}>
                        {ALL_CALL_STATUSES.map(s => <option key={s} value={s}>{CALL_STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Priority</label>
                      <select className={inputCls} value={form.priority || "MEDIUM"} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}>
                        {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Skills (comma-separated)</label>
                    <input className={inputCls} value={Array.isArray(form.skills) ? form.skills.join(", ") : ""}
                      onChange={e => setForm(f => ({ ...f, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Manual Score Override (0–10)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[["technicalScore","Technical"],["communicationScore","Communication"],["cultureFitScore","Culture Fit"],["overallScore","Overall"]].map(([key, label]) => (
                        <div key={key}>
                          <label className={labelCls}>{label}</label>
                          <input type="number" min="0" max="10" step="0.5" className={inputCls}
                            value={(form as any)[key] ?? ""}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value !== "" ? Number(e.target.value) : null }))}
                            placeholder="—" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} disabled={saving} className="btn-primary"><Save size={14} />{saving ? "Saving…" : "Save Changes"}</button>
                    {["SUPER_ADMIN","ADMIN"].includes(user?.role || "") && (
                      <button onClick={handleDelete} className="btn-danger ml-auto"><Trash2 size={14} />Delete</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === "notes" && (
            <div className="space-y-4">
              {canEdit && (
                <div className="ats-card p-4">
                  <textarea rows={3} className={clsx(inputCls, "resize-none")} placeholder="Add a note…" value={newNote} onChange={e => setNewNote(e.target.value)} />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={notePrivate} onChange={e => setNotePrivate(e.target.checked)} className="rounded" />
                      <Lock size={11} /> Private note
                    </label>
                    <button onClick={handleAddNote} disabled={!newNote.trim() || addingNote} className="btn-primary py-1.5 text-xs">
                      <Send size={12} />{addingNote ? "Adding…" : "Add Note"}
                    </button>
                  </div>
                </div>
              )}
              {notes.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No notes yet.</p>}
              {notes.map(note => (
                <div key={note.id} className="ats-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{note.author.name}</span>
                      {note.isPrivate && <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded"><Lock size={10} />Private</span>}
                    </div>
                    <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── INTERVIEWS ── */}
          {tab === "interviews" && (
            <div className="space-y-3">
              {interviews.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No interviews scheduled.</p>}
              {interviews.map(iv => (
                <InterviewCard
                  key={iv.id}
                  interview={iv}
                  candidateId={candidateId}
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  onUpdate={loadCandidate}
                />
              ))}
            </div>
          )}

          {/* ── RESUME ── */}
          {tab === "resume" && (
            <div>
              {candidate.resumePath ? (
                <>
                  <div className="flex gap-3 mb-4">
                    <a href={candidate.resumePath} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm"><ExternalLink size={13} />Open PDF</a>
                    <a href={candidate.resumePath} download className="btn-secondary text-sm">↓ Download</a>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50" style={{ height: 500 }}>
                    <iframe src={candidate.resumePath} className="w-full h-full" title="Resume" />
                  </div>
                </>
              ) : <p className="text-center text-slate-400 text-sm py-12">No resume uploaded.</p>}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {tab === "activity" && (
            <div className="space-y-2">
              {activityLog.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No activity yet.</p>}
              {activityLog.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">{log.action.replace(/_/g," ")}</span>
                    {log.details && <span className="text-slate-500"> · {log.details}</span>}
                    {log.performedBy && <span className="text-slate-400"> by {log.performedBy}</span>}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Applied: {new Date(candidate.appliedAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(candidate.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}

// ── Interview Card with Feedback ─────────────────────────────────────────────
function InterviewCard({ interview: iv, candidateId, currentUserId, currentUserRole, onUpdate }: {
  interview: Interview
  candidateId: string
  currentUserId?: string
  currentUserRole?: string
  onUpdate: () => void
}) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState(iv.feedback || "")
  const [rating, setRating] = useState<number | null>(iv.rating ?? null)
  const [saving, setSaving] = useState(false)

  const canEdit = currentUserRole !== "VIEWER"
  const isInterviewer = currentUserRole === "INTERVIEWER"
  const isOwn = iv.interviewer.id === currentUserId
  const canUpdate = canEdit && (!isInterviewer || isOwn)
  const isPending = iv.status === "SCHEDULED" || iv.status === "RESCHEDULED"

  const STATUS_BADGE: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
    RESCHEDULED: "bg-amber-100 text-amber-700",
    NO_SHOW: "bg-slate-100 text-slate-500",
  }

  async function updateStatus(status: string) {
    await fetch(`/api/candidates/${candidateId}/interviews/${iv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    onUpdate()
  }

  async function submitFeedback() {
    if (!feedback.trim()) return
    setSaving(true)
    await fetch(`/api/candidates/${candidateId}/interviews/${iv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", feedback, rating }),
    })
    setSaving(false)
    setShowFeedback(false)
    onUpdate()
  }

  return (
    <div className="ats-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{iv.type.replace(/_/g, " ")} Interview</p>
          <p className="text-xs text-slate-500 mt-0.5">
            with {iv.interviewer.name} · {iv.mode.replace("_"," ")} · {iv.duration}min
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(iv.scheduledAt).toLocaleDateString()} at {new Date(iv.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          {iv.meetingLink && (
            <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-sky-600 hover:underline mt-0.5 inline-block">
              Join Meeting →
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={clsx("status-pill", STATUS_BADGE[iv.status] || "bg-slate-100 text-slate-500")}>
            {iv.status.replace("_"," ")}
          </span>
          {iv.rating && (
            <span className="text-xs font-semibold text-amber-600">
              {"★".repeat(iv.rating)}{"☆".repeat(5 - iv.rating)} {iv.rating}/5
            </span>
          )}
        </div>
      </div>

      {/* Existing feedback */}
      {iv.feedback && (
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Feedback</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{iv.feedback}</p>
        </div>
      )}

      {/* Action buttons for pending interviews */}
      {canUpdate && isPending && (
        <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-100">
          <button onClick={() => setShowFeedback(s => !s)}
            className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold hover:bg-emerald-100 transition-colors">
            ✓ Complete + Feedback
          </button>
          <button onClick={() => updateStatus("NO_SHOW")}
            className="text-xs px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
            No Show
          </button>
          <button onClick={() => updateStatus("CANCELLED")}
            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Add feedback to completed interview without feedback */}
      {canUpdate && iv.status === "COMPLETED" && !iv.feedback && (
        <div className="pt-1 border-t border-slate-100">
          <button onClick={() => setShowFeedback(s => !s)}
            className="text-xs px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg font-semibold hover:bg-sky-100 transition-colors">
            + Add Feedback
          </button>
        </div>
      )}

      {/* Feedback form */}
      {showFeedback && (
        <div className="space-y-3 pt-2 border-t border-slate-100 fade-in">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Rating</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  className={clsx("w-8 h-8 rounded-lg text-sm font-bold border transition-colors",
                    rating && rating >= n
                      ? "bg-amber-400 border-amber-500 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:border-amber-300")}>
                  {n}
                </button>
              ))}
              {rating && <button onClick={() => setRating(null)} className="text-xs text-slate-400 ml-1 hover:text-slate-600">clear</button>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Feedback</p>
            <textarea rows={4} className="ats-input resize-none text-sm w-full"
              placeholder="Write your interview feedback here…"
              value={feedback} onChange={e => setFeedback(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={submitFeedback} disabled={saving || !feedback.trim()}
              className="btn-primary text-xs py-1.5 disabled:opacity-50">
              <Save size={12} />{saving ? "Saving…" : "Submit Feedback"}
            </button>
            <button onClick={() => setShowFeedback(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline icon components to avoid import issues
function BriefcaseIcon({ size, className }: { size: number; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
}
function BuildingIcon({ size, className }: { size: number; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 7h.01"/><path d="M12 7h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/></svg>
}
function MapPinIcon({ size, className }: { size: number; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
}
function ClockIcon2({ size, className }: { size: number; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
