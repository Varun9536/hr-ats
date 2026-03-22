"use client"
import { useEffect, useState } from "react"
import AppShell from "@/components/AppShell"
import { Plus, X, Briefcase, Users, MapPin, Clock, ToggleLeft, ToggleRight, Pencil } from "lucide-react"
import { clsx } from "clsx"
import { useAuth } from "@/hooks/useAuth"

export default function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState<any>(null)
  const [form, setForm] = useState({ title: "", department: "", location: "", type: "FULL_TIME", description: "", requirements: "", requiredSkills: "", openings: "1", salaryMin: "", salaryMax: "", minExperience: "" })
  const [saving, setSaving] = useState(false)
  const canEdit = user && ["SUPER_ADMIN","ADMIN","RECRUITER"].includes(user.role)

  const loadJobs = () => {
    setLoading(true)
    fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d); setLoading(false) })
  }
  useEffect(() => { loadJobs() }, [])

  function openEdit(job: any) {
    setEditJob(job)
    setForm({ title: job.title, department: job.department || "", location: job.location || "", type: job.type, description: job.description || "", requirements: job.requirements || "", requiredSkills: job.requiredSkills.join(", "), openings: String(job.openings), salaryMin: job.salaryMin ? String(job.salaryMin) : "", salaryMax: job.salaryMax ? String(job.salaryMax) : "", minExperience: job.minExperience ? String(job.minExperience) : "" })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, requiredSkills: form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean), openings: Number(form.openings), salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined, salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined, minExperience: form.minExperience ? Number(form.minExperience) : undefined }
    if (editJob) {
      await fetch(`/api/jobs/${editJob.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    } else {
      await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    }
    setSaving(false); setShowForm(false); setEditJob(null)
    setForm({ title: "", department: "", location: "", type: "FULL_TIME", description: "", requirements: "", requiredSkills: "", openings: "1", salaryMin: "", salaryMax: "", minExperience: "" })
    loadJobs()
  }

  async function toggleActive(job: any) {
    await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !job.isActive }) })
    loadJobs()
  }

  const inputCls = "ats-input text-sm py-2"
  const labelCls = "ats-label"

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
            <p className="text-slate-500 text-sm">{jobs.filter(j => j.isActive).length} active positions</p>
          </div>
          {canEdit && (
            <button onClick={() => { setEditJob(null); setShowForm(true) }} className="btn-primary">
              <Plus size={15} />Post Job
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Briefcase size={32} className="mx-auto mb-3 text-slate-300" />
            <p>No jobs posted yet.</p>
            {canEdit && <button onClick={() => setShowForm(true)} className="mt-3 text-sky-600 text-sm hover:underline">Post your first job →</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <div key={job.id} className={clsx("ats-card p-5 flex flex-col gap-3 transition-opacity", !job.isActive && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">{job.title}</h3>
                    {job.department && <p className="text-xs text-slate-500 mt-0.5">{job.department}</p>}
                  </div>
                  <span className={clsx("status-pill shrink-0 text-xs", job.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {job.isActive ? "Active" : "Closed"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {job.location && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
                  <span className="flex items-center gap-1"><Clock size={11} />{job.type.replace("_"," ")}</span>
                  {job.minExperience && <span>{job.minExperience}+ yrs exp</span>}
                </div>

                {(job.salaryMin || job.salaryMax) && (
                  <p className="text-xs text-slate-600 font-medium">
                    ₹{job.salaryMin?.toLocaleString("en-IN")} – ₹{job.salaryMax?.toLocaleString("en-IN")} / yr
                  </p>
                )}

                {job.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 5).map((s: string) => <span key={s} className="skill-tag">{s}</span>)}
                    {job.requiredSkills.length > 5 && <span className="text-xs text-slate-400">+{job.requiredSkills.length - 5}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users size={12} />{job._count?.candidates || 0} candidates
                    {job.openings > 1 && ` · ${job.openings} openings`}
                  </span>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(job)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => toggleActive(job)} className={clsx("p-1.5 rounded transition-colors", job.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100")} title={job.isActive ? "Close job" : "Reopen job"}>
                        {job.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900">{editJob ? "Edit Job" : "Post New Job"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={labelCls}>Job Title *</label><input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><label className={labelCls}>Department</label><input className={inputCls} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
              <div><label className={labelCls}>Location</label><input className={inputCls} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><label className={labelCls}>Type</label>
                <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {["FULL_TIME","PART_TIME","CONTRACT","INTERNSHIP","REMOTE"].map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Openings</label><input type="number" min="1" className={inputCls} value={form.openings} onChange={e => setForm(f => ({ ...f, openings: e.target.value }))} /></div>
              <div><label className={labelCls}>Min Salary (₹/yr)</label><input type="number" className={inputCls} value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))} /></div>
              <div><label className={labelCls}>Max Salary (₹/yr)</label><input type="number" className={inputCls} value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))} /></div>
              <div><label className={labelCls}>Min Experience (yrs)</label><input type="number" min="0" className={inputCls} value={form.minExperience} onChange={e => setForm(f => ({ ...f, minExperience: e.target.value }))} /></div>
              <div className="col-span-2"><label className={labelCls}>Required Skills (comma-separated)</label><input className={inputCls} value={form.requiredSkills} onChange={e => setForm(f => ({ ...f, requiredSkills: e.target.value }))} placeholder="react, typescript, postgresql…" /></div>
              <div className="col-span-2"><label className={labelCls}>Description</label><textarea rows={3} className={clsx(inputCls, "resize-none")} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="col-span-2"><label className={labelCls}>Requirements</label><textarea rows={3} className={clsx(inputCls, "resize-none")} value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving || !form.title} className="btn-primary flex-1 justify-center">{saving ? "Saving…" : editJob ? "Update Job" : "Post Job"}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
