"use client"
import { clsx } from "clsx"

function scoreColor(s: number) {
  if (s >= 8) return "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200"
  if (s >= 6) return "text-sky-700 bg-sky-50 ring-1 ring-sky-200"
  if (s >= 4) return "text-amber-700 bg-amber-50 ring-1 ring-amber-200"
  return "text-red-700 bg-red-50 ring-1 ring-red-200"
}
function barColor(s: number) {
  if (s >= 8) return "bg-emerald-500"
  if (s >= 6) return "bg-sky-500"
  if (s >= 4) return "bg-amber-500"
  return "bg-red-500"
}

export function ScoreBadge({ score, size = "sm" }: { score?: number | null; size?: "sm" | "md" }) {
  if (score == null) return (
    <span className={clsx("inline-flex items-center rounded font-mono text-slate-300 bg-slate-50", size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm")}>—</span>
  )
  return (
    <span className={clsx("inline-flex items-center rounded font-mono font-bold", scoreColor(score), size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm")}>
      {score.toFixed(1)}
    </span>
  )
}

export function ScoreBar({ score, label }: { score?: number | null; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{label}</span>
        <ScoreBadge score={score} size="sm" />
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-500", score != null ? barColor(score) : "bg-slate-200")}
          style={{ width: `${score != null ? (score / 10) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}
