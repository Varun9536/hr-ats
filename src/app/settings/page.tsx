"use client"
import { useState } from "react"
import AppShell from "@/components/AppShell"
import { Save, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { ROLE_LABELS, ROLE_COLORS } from "@/types"
import { clsx } from "clsx"

export default function SettingsPage() {
  const { user, refresh } = useAuth()
  const [form, setForm] = useState({ name: user?.name || "", currentPassword: "", newPassword: "", confirmPassword: "" })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSave() {
    setError(""); setSuccess("")
    if (form.newPassword && form.newPassword !== form.confirmPassword) { setError("New passwords do not match"); return }
    if (form.newPassword && form.newPassword.length < 8) { setError("New password must be at least 8 characters"); return }
    setSaving(true)
    const payload: any = {}
    if (form.name && form.name !== user?.name) payload.name = form.name
    if (form.newPassword) payload.password = form.newPassword

    if (Object.keys(payload).length === 0) { setSaving(false); setError("No changes to save"); return }

    const res = await fetch(`/api/users/${user?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "Update failed"); return }
    setSuccess("Profile updated successfully")
    setForm(f => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }))
    await refresh()
  }

  const inputCls = "ats-input text-sm py-2.5"
  const labelCls = "ats-label"

  return (
    <AppShell>
      <div className="p-6 max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your account preferences</p>
        </div>

        {/* Profile card */}
        <div className="ats-card p-6 mb-4">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className={clsx("status-pill mt-1 text-xs", ROLE_COLORS[user?.role || "VIEWER"])}>
                {ROLE_LABELS[user?.role || "VIEWER"]}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Display Name</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Email Address</label>
              <input className={inputCls} value={user?.email || ""} disabled className="ats-input text-sm py-2.5 bg-slate-50 text-slate-400 cursor-not-allowed" />
              <p className="text-xs text-slate-400 mt-1">Contact an admin to change your email.</p>
            </div>
          </div>
        </div>

        {/* Password card */}
        <div className="ats-card p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Change Password</h2>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className={clsx(inputCls, "pr-10")} value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 8 chars, uppercase, number" />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" className={inputCls} value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-4">
            <CheckCircle2 size={15} />{success}
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-2.5">
          <Save size={15} />{saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </AppShell>
  )
}
