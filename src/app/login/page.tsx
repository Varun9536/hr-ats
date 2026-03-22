"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from "lucide-react"
import { clsx } from "clsx"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const expired = searchParams.get("expired") === "1"
  const from = searchParams.get("from") || "/"

  // If already logged in, redirect
  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (r.ok) router.replace(from) })
  }, [from, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password) { setError("Please fill in all fields"); return }
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.")
        setLoading(false)
        return
      }

      router.replace(from)
    } catch {
      setError("Network error. Please check your connection.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500 rounded-2xl mb-4 shadow-lg shadow-sky-500/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AutoHire ATS</h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise Applicant Tracking System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {expired && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm rounded-lg px-4 py-3 mb-6">
              <AlertCircle size={15} />
              Your session has expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError("") }}
                className={clsx(
                  "w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition-all",
                  error ? "border-red-500/50 focus:ring-red-500/30" : "border-white/10 focus:ring-sky-500/50 focus:border-sky-500/50"
                )}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError("") }}
                  className={clsx(
                    "w-full bg-white/5 border rounded-lg px-4 py-3 pr-11 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 transition-all",
                    error ? "border-red-500/50 focus:ring-red-500/30" : "border-white/10 focus:ring-sky-500/50 focus:border-sky-500/50"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 text-sm"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <LogIn size={16} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Contact your administrator to get access.
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Protected by session-based auth · 8h token expiry
        </p>
      </div>
    </div>
  )
}
