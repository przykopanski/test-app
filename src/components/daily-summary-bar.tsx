"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Clock, Receipt } from "lucide-react"

import type { DashboardDailyTotals } from "@/lib/dashboard"
import { formatMinutes, WORK_TYPE_LABELS, WORK_TYPE_COLORS } from "@/lib/time-entries"

interface DailySummaryBarProps {
  totals: DashboardDailyTotals
}

export function DailySummaryBar({ totals }: DailySummaryBarProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Raw total */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Gesamt</p>
              <p className="text-sm font-semibold">
                {formatMinutes(totals.totalMinutesRaw)}
              </p>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-8 sm:block" />

          {/* Billable total */}
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Abrechenbar</p>
              <p className="text-sm font-semibold text-primary">
                {formatMinutes(totals.totalMinutesBillable)}
              </p>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-8 sm:block" />

          {/* Work type breakdown */}
          <div className="flex flex-wrap items-center gap-2">
            {totals.byWorkType
              .filter((wt) => wt.minutes > 0)
              .map((wt) => (
                <Badge
                  key={wt.workType}
                  variant="outline"
                  className={`text-xs ${WORK_TYPE_COLORS[wt.workType]}`}
                >
                  {WORK_TYPE_LABELS[wt.workType]}: {formatMinutes(wt.minutes)}
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
