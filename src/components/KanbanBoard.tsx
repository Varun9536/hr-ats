"use client"
import { useState, useRef } from "react"
import { Candidate, Status, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "@/types"
import { ScoreBadge } from "./ScoreBadge"
import { clsx } from "clsx"

const KANBAN_COLUMNS: { status: Status; color: string; dot: string }[] = [
  { status: "APPLIED",     color: "border-t-slate-400",   dot: "bg-slate-400" },
  { status: "SCREENING",   color: "border-t-purple-400",  dot: "bg-purple-400" },
  { status: "SHORTLISTED", color: "border-t-blue-500",    dot: "bg-blue-500" },
  { status: "INTERVIEW",   color: "border-t-amber-500",   dot: "bg-amber-500" },
  { status: "OFFER",       color: "border-t-cyan-500",    dot: "bg-cyan-500" },
  { status: "SELECTED",    color: "border-t-emerald-500", dot: "bg-emerald-500" },
]

const ARCHIVED_STATUSES: Status[] = ["ON_HOLD", "REJECTED", "WITHDRAWN"]

interface Props {
  candidates: Candidate[]
  loading: boolean
  onCardClick: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
  canEdit: boolean
}

export default function KanbanBoard({ candidates, loading, onCardClick, onStatusChange, canEdit }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<Status | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const dragCandidate = useRef<Candidate | null>(null)

  const grouped = (statuses: Status[]) => {
    const map: Record<string, Candidate[]> = {}
    for (const s of statuses) map[s] = []
    for (const c of candidates) {
      if (statuses.includes(c.status)) map[c.status].push(c)
    }
    return map
  }

  const pipelineGroups = grouped(KANBAN_COLUMNS.map(c => c.status))
  const archivedGroups = grouped(ARCHIVED_STATUSES)

  function onDragStart(c: Candidate) {
    setDraggingId(c.id)
    dragCandidate.current = c
  }

  function onDragEnd() {
    setDraggingId(null)
    setOverColumn(null)
    dragCandidate.current = null
  }

  function onDrop(status: Status) {
    if (!dragCandidate.current || dragCandidate.current.status === status) return
    onStatusChange(dragCandidate.current.id, status)
    setDraggingId(null)
    setOverColumn(null)
    dragCandidate.current = null
  }

  if (loading) return (
    <div className="flex items-center justify-center flex-1 py-20 text-slate-400 text-sm">
      Loading…
    </div>
  )

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
      {/* Pipeline columns */}
      <div className="flex gap-3 h-full min-h-[600px]" style={{ minWidth: KANBAN_COLUMNS.length * 220 }}>
        {KANBAN_COLUMNS.map(({ status, color, dot }) => {
          const cards = pipelineGroups[status] || []
          const isOver = overColumn === status
          return (
            <div key={status}
              className={clsx(
                "flex flex-col rounded-xl border-t-4 bg-slate-50 border border-slate-200 w-52 shrink-0 transition-colors",
                color,
                isOver && canEdit && "bg-sky-50 border-sky-200"
              )}
              onDragOver={e => { e.preventDefault(); setOverColumn(status) }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={() => onDrop(status)}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className={clsx("w-2 h-2 rounded-full shrink-0", dot)} />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {cards.length === 0 && (
                  <div className={clsx(
                    "border-2 border-dashed rounded-lg h-16 flex items-center justify-center text-xs text-slate-300 transition-colors",
                    isOver && canEdit ? "border-sky-300 text-sky-400" : "border-slate-200"
                  )}>
                    {isOver && canEdit ? "Drop here" : "Empty"}
                  </div>
                )}
                {cards.map(c => (
                  <KanbanCard
                    key={c.id}
                    candidate={c}
                    isDragging={draggingId === c.id}
                    canDrag={canEdit}
                    onClick={() => onCardClick(c.id)}
                    onDragStart={() => onDragStart(c)}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Archived section */}
      <div className="mt-4">
        <button
          onClick={() => setShowArchived(s => !s)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 font-semibold mb-3 transition-colors">
          <span className={clsx("transition-transform", showArchived ? "rotate-90" : "")}>▶</span>
          Archived — On Hold / Rejected / Withdrawn
          <span className="text-slate-400 font-normal">
            ({ARCHIVED_STATUSES.reduce((n, s) => n + (archivedGroups[s]?.length || 0), 0)})
          </span>
        </button>

        {showArchived && (
          <div className="flex gap-3" style={{ minWidth: ARCHIVED_STATUSES.length * 220 }}>
            {ARCHIVED_STATUSES.map(status => {
              const cards = archivedGroups[status] || []
              const isOver = overColumn === status
              return (
                <div key={status}
                  className={clsx(
                    "flex flex-col rounded-xl border-t-4 border-t-slate-300 bg-slate-50 border border-slate-200 w-52 shrink-0 max-h-80",
                    isOver && canEdit && "bg-sky-50 border-sky-200"
                  )}
                  onDragOver={e => { e.preventDefault(); setOverColumn(status) }}
                  onDragLeave={() => setOverColumn(null)}
                  onDrop={() => onDrop(status)}
                >
                  <div className="px-3 py-2.5 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                      {cards.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    {cards.map(c => (
                      <KanbanCard
                        key={c.id}
                        candidate={c}
                        isDragging={draggingId === c.id}
                        canDrag={canEdit}
                        onClick={() => onCardClick(c.id)}
                        onDragStart={() => onDragStart(c)}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanCard({ candidate: c, isDragging, canDrag, onClick, onDragStart, onDragEnd }: {
  candidate: Candidate
  isDragging: boolean
  canDrag: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable={canDrag}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        "bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-sky-300 transition-all select-none",
        isDragging && "opacity-40 scale-95 shadow-lg",
        canDrag && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Name + priority */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
        </div>
        <span className={clsx("text-xs font-bold shrink-0", PRIORITY_COLORS[c.priority])}>
          {c.priority === "URGENT" ? "🔴" : c.priority === "HIGH" ? "🟠" : ""}
        </span>
      </div>

      {/* Role / Company */}
      {(c.currentRole || c.job) && (
        <p className="text-xs text-slate-500 truncate mb-1.5">
          {c.job ? c.job.title : c.currentRole}
        </p>
      )}

      {/* Skills */}
      {c.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {c.skills.slice(0, 2).map(s => (
            <span key={s} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
          ))}
          {c.skills.length > 2 && <span className="text-xs text-slate-400">+{c.skills.length - 2}</span>}
        </div>
      )}

      {/* Score + date */}
      <div className="flex items-center justify-between mt-1">
        <ScoreBadge score={c.overallScore} />
        <span className="text-xs text-slate-400">
          {new Date(c.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  )
}
