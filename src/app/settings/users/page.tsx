"use client"
import { useEffect, useState } from "react"
import AppShell from "@/components/AppShell"
import { Plus, X, Pencil, Trash2, ToggleLeft, ToggleRight, ShieldAlert } from "lucide-react"
import { clsx } from "clsx"
import { useAuth } from "@/hooks/useAuth"
import { ROLE_LABELS, ROLE_COLORS, UserRole } from "@/types"

const ALL_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "RECRUITER", "INTERVIEWER", "VIEWER"]
const ROLE_DESC: Record<UserRole, string> = {
  SUPER_ADMIN: "Full access to everything including user deletion",
  ADMIN: "Can manage candidates, jobs, and view reports",
  RECRUITER: "Can create/edit candidates, upload resumes, manage jobs",
  INTERVIEWER: "Can view candidates and manage their own interviews",
  VIEWER: "Read-only access to candidates and jobs",
}

function UserForm({ user, onClose, onSaved, currentRole }: { user?: any; onClose: () => void; onSaved: () => void; currentRole: UserRole }) {
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", password: "", role: user?.role || "RECRUITER" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!user && (!form.name || !form.email || !form.password)) { setError("All fields required for new user"); return }
    setSaving(true); setError("")
    const payload: any = { name: form.name, role: form.role }
    if (!user) { payload.email = form.email; payload.password = form.password }
    if (user && form.password) payload.password = form.password

    const res = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
      method: user ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "Failed"); return }
    onSaved(); onClose()
  }

  const inputCls = "ats-input text-sm py-2"
  const labelCls = "ats-label"
  const canSetAdminRole = currentRole === "SUPER_ADMIN"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-900">{user ? "Edit User" : "Add Team Member"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div><label className={labelCls}>Full Name *</label><input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          {!user && <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>}
          <div>
            <label className={labelCls}>{user ? "New Password (leave blank to keep)" : "Password *"}</label>
            <input type="password" className={inputCls} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars, uppercase, number" />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ALL_ROLES.filter(r => canSetAdminRole || !["SUPER_ADMIN","ADMIN"].includes(r)).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">{ROLE_DESC[form.role as UserRole]}</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving…" : user ? "Update User" : "Add User"}</button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  const loadUsers = () => {
    setLoading(true)
    fetch("/api/users").then(r => r.json()).then(u => { setUsers(u); setLoading(false) })
  }
  useEffect(() => { loadUsers() }, [])

  async function toggleActive(u: any) {
    if (u.id === currentUser?.id) return
    await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) })
    loadUsers()
  }

  async function deleteUser(u: any) {
    if (!confirm(`Permanently delete ${u.name}?`)) return
    await fetch(`/api/users/${u.id}`, { method: "DELETE" })
    loadUsers()
  }

  if (!currentUser || !["SUPER_ADMIN","ADMIN"].includes(currentUser.role)) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <ShieldAlert size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">You don't have permission to manage users.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
            <p className="text-slate-500 text-sm">{users.filter(u => u.isActive).length} active users</p>
          </div>
          <button onClick={() => { setEditUser(null); setShowForm(true) }} className="btn-primary"><Plus size={15} />Add User</button>
        </div>

        {/* Role legend */}
        <div className="ats-card p-4 mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Role Permissions</p>
          <div className="grid grid-cols-5 gap-3">
            {ALL_ROLES.map(role => (
              <div key={role} className="text-center">
                <span className={clsx("status-pill text-xs", ROLE_COLORS[role])}>{ROLE_LABELS[role]}</span>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{ROLE_DESC[role]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ats-card overflow-hidden">
          <table className="w-full ats-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading…</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={clsx(!u.isActive && "opacity-50")}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {u.name}
                          {u.id === currentUser.id && <span className="ml-1.5 text-xs text-sky-600 font-normal">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className={clsx("status-pill", ROLE_COLORS[u.role as UserRole])}>{ROLE_LABELS[u.role as UserRole]}</span></td>
                  <td>
                    <span className={clsx("status-pill text-xs", u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td><span className="text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}</span></td>
                  <td><span className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditUser(u); setShowForm(true) }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                        <Pencil size={13} />
                      </button>
                      {u.id !== currentUser.id && (
                        <>
                          <button onClick={() => toggleActive(u)} className={clsx("p-1.5 rounded transition-colors", u.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100")} title={u.isActive ? "Deactivate" : "Activate"}>
                            {u.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                          {currentUser.role === "SUPER_ADMIN" && (
                            <button onClick={() => deleteUser(u)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <UserForm
          user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null) }}
          onSaved={loadUsers}
          currentRole={currentUser.role}
        />
      )}
    </AppShell>
  )
}
