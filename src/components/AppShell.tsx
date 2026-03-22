"use client"
import Sidebar from "./Sidebar"
import { useAuth } from "@/hooks/useAuth"
import { clsx } from "clsx"

interface Props {
  children: React.ReactNode
  className?: string
}

export default function AppShell({ children, className }: Props) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-400 font-medium">Loading AutoHire…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main
        className={clsx("flex-1 min-h-screen overflow-x-hidden", className)}
        style={{ marginLeft: "var(--sidebar-w)" }}
      >
        {children}
      </main>
    </div>
  )
}
