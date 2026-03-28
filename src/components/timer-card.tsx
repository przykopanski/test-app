"use client"

import * as React from "react"
import Link from "next/link"
import { Square, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

import type { DashboardActiveTimer } from "@/lib/dashboard"
import {
  formatElapsedTime,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
} from "@/lib/time-entries"

interface TimerCardProps {
  timer: DashboardActiveTimer
  elapsedSeconds: number
  onStop: (timer: DashboardActiveTimer) => void
}

export function TimerCard({ timer, elapsedSeconds, onStop }: TimerCardProps) {
  return (
    <Card
      className="border-primary/30 bg-primary/5"
      role="status"
      aria-label={`Aktiver Timer fuer Ticket #${timer.ticketNumber}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Timer className="h-5 w-5 text-primary animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <Link
            href={`/tickets/${timer.ticketId}`}
            className="block text-sm font-medium hover:underline truncate"
          >
            #{timer.ticketNumber} {timer.ticketTitle}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${WORK_TYPE_COLORS[timer.workType]}`}
            >
              {WORK_TYPE_LABELS[timer.workType]}
            </Badge>
            <span className="font-mono text-lg font-semibold tabular-nums text-primary">
              {formatElapsedTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onStop(timer)}
          aria-label="Timer stoppen"
        >
          <Square className="mr-2 h-3 w-3" />
          Stoppen
        </Button>
      </CardContent>
    </Card>
  )
}
