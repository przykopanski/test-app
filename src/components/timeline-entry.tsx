"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"

import type { DashboardTimeEntry } from "@/lib/dashboard"
import {
  formatMinutes,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
} from "@/lib/time-entries"

interface TimelineEntryProps {
  entry: DashboardTimeEntry
}

function formatTimeOnly(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TimelineEntry({ entry }: TimelineEntryProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 sm:p-4">
      {/* Time range */}
      <div className="flex-shrink-0 w-[90px] sm:w-[100px] text-right">
        <span className="font-mono text-sm tabular-nums">
          {formatTimeOnly(entry.startTime)}
        </span>
        <span className="text-muted-foreground text-sm"> - </span>
        <span className="font-mono text-sm tabular-nums">
          {formatTimeOnly(entry.endTime)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/tickets/${entry.ticketId}`}
            className="text-sm font-medium hover:underline truncate max-w-[250px] sm:max-w-none"
          >
            #{entry.ticketNumber} {entry.ticketTitle}
          </Link>
          <Badge
            variant="outline"
            className={`text-xs ${WORK_TYPE_COLORS[entry.workType]}`}
          >
            {WORK_TYPE_LABELS[entry.workType]}
          </Badge>
        </div>
        {entry.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {entry.description}
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="flex-shrink-0 text-right">
        <span className="text-sm font-medium">
          {formatMinutes(entry.durationMinutes)}
        </span>
        {entry.isBillable && (
          <p className="text-xs text-muted-foreground">abrechenbar</p>
        )}
      </div>
    </div>
  )
}
