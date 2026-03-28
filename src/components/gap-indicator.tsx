"use client"

import { AlertTriangle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

import type { DashboardGap } from "@/lib/dashboard"
import { formatMinutes } from "@/lib/time-entries"

interface GapIndicatorProps {
  gap: DashboardGap
  onClick: (gap: DashboardGap) => void
}

function formatTimeOnly(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function GapIndicator({ gap, onClick }: GapIndicatorProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(gap)}
      className="group flex w-full items-center gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-3 text-left transition-colors hover:bg-orange-100/50 dark:border-orange-700 dark:bg-orange-950/20 dark:hover:bg-orange-950/40"
      aria-label={`Luecke von ${formatTimeOnly(gap.gapStart)} bis ${formatTimeOnly(gap.gapEnd)} - Klicken zum Nachtragen`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
          Luecke: {formatTimeOnly(gap.gapStart)} - {formatTimeOnly(gap.gapEnd)}
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400">
          {formatMinutes(gap.durationMinutes)} nicht erfasst
        </p>
      </div>

      <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="outline" size="sm" tabIndex={-1} asChild>
          <span>
            <Plus className="mr-1 h-3 w-3" />
            Nachtragen
          </span>
        </Button>
      </div>
    </button>
  )
}
