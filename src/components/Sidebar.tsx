"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, UploadCloud, Briefcase,
  Settings, LogOut, ChevronRight, BarChart3, UserCog,
  ShieldCheck,
} from "lucide-react"
import { clsx } from "clsx"
import { useAuth } from "@/hooks/useAuth"
import { ROLE_COLORS, ROLE_LABELS } from "@/types"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/upload", label: "Upload Resume", icon: UploadCloud },
  { href: "/reports", label: "Reports", icon: BarChart3 },
]

const adminNav = [
  { href: "/settings/users", label: "Users", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <aside className="fixed left-0 top-0 h-screen flex flex-col bg-slate-900 text-white z-40"
      style={{ width: "var(--sidebar-w)" }}>

      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">AutoHire ATS</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              isActive(href)
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}>
            <Icon size={15} className="shrink-0" />
            {label}
          </Link>
        ))}

        {user && ["SUPER_ADMIN","ADMIN"].includes(user.role) && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Admin</span>
            </div>
            {adminNav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive(href)
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}>
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-800 p-3 shrink-0">
        {user && (
          <div className="mb-2 px-2 py-2 rounded-lg bg-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <span className={clsx("status-pill text-xs", ROLE_COLORS[user.role])}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
