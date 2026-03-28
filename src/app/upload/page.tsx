"use client"
import { useState, useRef, useEffect } from "react"
import AppShell from "@/components/AppShell"
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X, Brain, GraduationCap, Building2, ShieldCheck } from "lucide-react"
import { clsx } from "clsx"

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-sky-500" : score >= 4 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all duration-700", color)} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
    </div>
  )
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [position, setPosition] = useState("")
  const [jobId, setJobId] = useState("")
  const [jobs, setJobs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; candidate?: any; score?: any; isScanned?: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/jobs?active=true").then(r => r.json()).then(setJobs).catch(() => {})
  }, [])

  const ACCEPTED_MIME = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && ACCEPTED_MIME.includes(f.type)) { setFile(f); setResult(null) }
    else setResult({ success: false, message: "Only PDF and Word (.docx) files are accepted." })
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true); setResult(null)
    const fd = new FormData()
    fd.append("resume", file)
    if (position) fd.append("position", position)
    if (jobId) fd.append("jobId", jobId)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error || "Upload failed" })
      } else {
        setResult({ success: true, message: data.updated ? `Updated: ${data.candidate.name}` : `Added: ${data.candidate.name}`, candidate: data.candidate, score: data.score, isScanned: data.isScanned })
        setHistory((h: any[]) => [{ name: data.candidate.name, email: data.candidate.email, updated: data.updated, score: data.score, ts: new Date() }, ...h.slice(0, 9)])
        setFile(null); setPosition("")
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." })
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Upload Resume</h1>
          <p className="text-slate-500 text-sm mt-1">PDF upload → auto parse → <span className="text-sky-600 font-semibold">ATS score calculated instantly</span></p>
        </div>

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            {/* Drop zone */}
            <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
              onDrop={handleDrop} onClick={() => fileRef.current?.click()}
              className={clsx("border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all select-none",
                dragging ? "border-sky-400 bg-sky-50 scale-[1.01]" : file ? "border-sky-400 bg-sky-50/50" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/30")}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="hidden"
                onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setResult(null) } }} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-sky-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · {file.name.endsWith(".docx") || file.name.endsWith(".doc") ? "Word" : "PDF"}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setResult(null) }} className="ml-2 p-1.5 hover:bg-slate-200 rounded-lg">
                    <X size={13} className="text-slate-400" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UploadCloud size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Drop resume here</p>
                  <p className="text-xs text-slate-400 mt-1">PDF or Word (.docx) · max 10MB</p>
                </>
              )}
            </div>

            {/* Options */}
            <div className="ats-card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Options</p>
              <div>
                <label className="ats-label">Position / Role</label>
                <input type="text" placeholder="e.g. Senior Backend Engineer" value={position} onChange={e => setPosition(e.target.value)} className="ats-input text-sm" />
              </div>
              {jobs.length > 0 && (
                <div>
                  <label className="ats-label">Link to Job <span className="text-sky-600">(improves ATS score accuracy)</span></label>
                  <select value={jobId} onChange={e => setJobId(e.target.value)} className="ats-input text-sm">
                    <option value="">— None —</option>
                    {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary w-full justify-center py-3 text-base">
              {uploading ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Parsing & Scoring…</>
              ) : (
                <><UploadCloud size={17} />Upload & Score Resume</>
              )}
            </button>

            {result && (
              <div className={clsx("p-4 rounded-xl text-sm fade-in", result.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200")}>
                <div className="flex items-start gap-2 mb-3">
                  {result.success ? <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-semibold text-slate-800">{result.success ? "Success" : "Error"}</p>
                    <p className="text-slate-600">{result.message}</p>
                  </div>
                </div>

                {result.score && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 space-y-3">
                    {/* Overall score badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain size={14} className="text-sky-600" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">ATS Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx("text-2xl font-bold tabular-nums",
                          result.score.overallScore >= 8 ? "text-emerald-600" :
                          result.score.overallScore >= 6 ? "text-sky-600" :
                          result.score.overallScore >= 4 ? "text-amber-600" : "text-red-600")}>
                          {result.score.overallScore.toFixed(1)}
                        </span>
                        <span className="text-slate-400 text-sm">/10</span>
                        {result.score.skillMatchPercent !== undefined && (
                          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
                            {result.score.skillMatchPercent}% match
                          </span>
                        )}
                      </div>
                    </div>

                    <ScoreBar label="Technical" score={result.score.technicalScore} />
                    <ScoreBar label="Communication" score={result.score.communicationScore} />
                    <ScoreBar label="Culture Fit" score={result.score.cultureFitScore} />

                    {result.score.summary && (
                      <p className="text-xs text-slate-600 bg-white/60 rounded-lg p-2 italic">"{result.score.summary}"</p>
                    )}

                    {result.score.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-1">✓ Strengths</p>
                        {result.score.strengths.slice(0, 3).map((s: string, i: number) => (
                          <p key={i} className="text-xs text-slate-600">• {s}</p>
                        ))}
                      </div>
                    )}

                    {result.score.gaps?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Gaps</p>
                        {result.score.gaps.slice(0, 3).map((g: string, i: number) => (
                          <p key={i} className="text-xs text-slate-600">• {g}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Parse confidence */}
                {result.candidate?.parseConfidence !== undefined && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-emerald-200">
                    <ShieldCheck size={13} className="text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-600">Parse confidence:</span>
                    <span className={clsx("text-xs font-bold",
                      result.candidate.parseConfidence >= 0.8 ? "text-emerald-600" :
                      result.candidate.parseConfidence >= 0.5 ? "text-amber-600" : "text-red-600")}>
                      {Math.round(result.candidate.parseConfidence * 100)}%
                    </span>
                    {result.isScanned && (
                      <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Scanned PDF detected</span>
                    )}
                  </div>
                )}

                {/* Skills */}
                {result.candidate?.skills?.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Skills:</span> {result.candidate.skills.slice(0, 6).join(", ")}
                    {result.candidate.skills.length > 6 && ` +${result.candidate.skills.length - 6} more`}
                  </p>
                )}

                {/* Education */}
                {result.candidate?.education?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <GraduationCap size={12} />Education extracted
                    </p>
                    {result.candidate.education.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-slate-500">
                        • {e.degree}{e.institution ? ` — ${e.institution}` : ""}{e.year ? ` (${e.year})` : ""}
                      </p>
                    ))}
                  </div>
                )}

                {/* Previous companies */}
                {result.candidate?.previousCompanies?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <Building2 size={12} />Companies detected
                    </p>
                    <p className="text-xs text-slate-500">{result.candidate.previousCompanies.slice(0, 4).join(", ")}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="col-span-2 space-y-4">
            <div className="ats-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-sky-600" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">How ATS Scoring Works</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Skill Match", desc: "Skills vs job requirements", weight: "40%" },
                  { label: "Experience", desc: "Years vs job minimum", weight: "30%" },
                  { label: "Skill Depth", desc: "Total skills count + weight", weight: "20%" },
                  { label: "Profile", desc: "LinkedIn, phone, completeness", weight: "10%" },
                ].map(({ label, desc, weight }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">{weight}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                💡 Link to a job for more accurate scoring
              </p>
            </div>

            {/* Upload history */}
            {history.length > 0 && (
              <div className="ats-card p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Session Uploads</p>
                <div className="space-y-2.5">
                  {history.map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", h.updated ? "bg-amber-400" : "bg-emerald-400")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 truncate">{h.name}</p>
                        <p className="text-xs text-slate-400 truncate">{h.email}</p>
                      </div>
                      {h.score && (
                        <span className={clsx("shrink-0 text-xs font-bold tabular-nums px-1.5 py-0.5 rounded",
                          h.score.overallScore >= 8 ? "bg-emerald-100 text-emerald-700" :
                          h.score.overallScore >= 6 ? "bg-sky-100 text-sky-700" :
                          "bg-amber-100 text-amber-700")}>
                          {h.score.overallScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ats-card p-4 bg-amber-50 border-amber-100">
              <p className="text-xs font-bold text-amber-700 mb-1.5">Resume Quality Tips</p>
              <ul className="text-xs text-amber-600 leading-relaxed space-y-1">
                <li>• <span className="font-semibold">.docx files</span> give the best parsing accuracy</li>
                <li>• Text-selectable PDFs work well; scanned/image PDFs may not parse</li>
                <li>• Always verify extracted data in the candidate profile</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
