"use client"

import * as React from "react"
import Link from "next/link"
import { Play, Ticket, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useTimer } from "@/components/timer-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

import { TimerCard } from "@/components/timer-card"
import { TimelineEntry } from "@/components/timeline-entry"
import { GapIndicator } from "@/components/gap-indicator"
import { DailySummaryBar } from "@/components/daily-summary-bar"
import { StopTimerDialog } from "@/components/stop-timer-dialog"
import { AddTimeEntryDialog } from "@/components/add-time-entry-dialog"

import type { DashboardActiveTimer, DashboardGap, TodayDashboardData, OpenTicketItem } from "@/lib/dashboard"
import { fetchTodayDashboard, fetchMyOpenTickets } from "@/lib/dashboard"
import type { TimeEntry } from "@/lib/time-entries"
import { fetchActiveTimers } from "@/lib/time-entries"
import { PRIORITY_COLORS, STATUS_LABELS } from "@/lib/tickets"
import type { TicketPriority, TicketStatus } from "@/lib/tickets"

// Merge server timeline entries with gap indicators for chronological display
interface TimelineItem {
  type: "entry" | "gap"
  sortTime: string
  entry?: TodayDashboardData["timeEntries"][0]
  gap?: DashboardGap
}

function buildTimeline(data: TodayDashboardData): TimelineItem[] {
  const items: TimelineItem[] = []

  for (const entry of data.timeEntries) {
    items.push({ type: "entry", sortTime: entry.startTime, entry })
  }

  for (const gap of data.gaps) {
    items.push({ type: "gap", sortTime: gap.gapStart, gap })
  }

  items.sort((a, b) => new Date(a.sortTime).getTime() - new Date(b.sortTime).getTime())
  return items
}

export default function TodayDashboardPage() {
  const { user } = useAuth()
  const {
    activeTimers: contextTimers,
    elapsedSecondsMap,
    timerStoppedVersion,
    refreshTimer,
  } = useTimer()

  const [dashboardData, setDashboardData] = React.useState<TodayDashboardData | null>(null)
  const [openTickets, setOpenTickets] = React.useState<OpenTicketItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Stop timer dialog
  const [stoppingTimer, setStoppingTimer] = React.useState<TimeEntry | null>(null)

  // Add time entry dialog (for gap backfill)
  const [gapDialogOpen, setGapDialogOpen] = React.useState(false)
  const [selectedGap, setSelectedGap] = React.useState<DashboardGap | null>(null)

  const loadData = React.useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const [dashboard, tickets] = await Promise.all([
        fetchTodayDashboard(),
        fetchMyOpenTickets(),
      ])
      setDashboardData(dashboard)
      setOpenTickets(tickets)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Daten konnten nicht geladen werden")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Initial load
  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Reload when a timer is stopped
  React.useEffect(() => {
    if (timerStoppedVersion > 0) {
      loadData()
    }
  }, [timerStoppedVersion, loadData])

  // Polling every 30s
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadData()
      refreshTimer()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadData, refreshTimer])

  // Handle stop timer: we need a TimeEntry object for StopTimerDialog
  function handleStopTimer(timer: DashboardActiveTimer) {
    // Find matching timer in context
    const contextTimer = contextTimers.find((t) => t.id === timer.timerId)
    if (contextTimer) {
      setStoppingTimer(contextTimer)
    } else {
      // Fallback: build a minimal TimeEntry-like object
      toast.error("Timer-Daten nicht gefunden. Bitte Seite neu laden.")
    }
  }

  function handleGapClick(gap: DashboardGap) {
    setSelectedGap(gap)
    setGapDialogOpen(true)
  }

  function handleEntryCreated() {
    loadData()
    refreshTimer()
  }

  if (!user) return null

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Heute</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    )
  }

  const hasEntries = dashboardData && dashboardData.timeEntries.length > 0
  const hasActiveTimers = contextTimers.length > 0
  const timeline = dashboardData ? buildTimeline(dashboardData) : []

  // Use dashboard active timers for display (they include ticket info),
  // but elapsed seconds from the context (client-side counter)
  const displayTimers = dashboardData?.activeTimers ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Heute
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadData} aria-label="Aktualisieren">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Timers Section */}
      <section aria-label="Aktive Timer">
        <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Aktive Timer
          {hasActiveTimers && (
            <Badge variant="secondary" className="text-xs">
              {contextTimers.length}
            </Badge>
          )}
        </h2>

        {hasActiveTimers ? (
          <div className="space-y-2">
            {displayTimers.map((timer) => (
              <TimerCard
                key={timer.timerId}
                timer={timer}
                elapsedSeconds={elapsedSecondsMap[timer.timerId] ?? 0}
                onStop={handleStopTimer}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-sm font-medium">Kein aktiver Timer</p>
                <p className="text-sm text-muted-foreground">
                  Starten Sie einen Timer auf einem offenen Ticket.
                </p>
              </div>
              {openTickets.length > 0 && (
                <Button asChild variant="outline" size="sm" className="mt-3 sm:mt-0">
                  <Link href={`/tickets/${openTickets[0].ticketId}`}>
                    <Play className="mr-2 h-3 w-3" />
                    #{openTickets[0].ticketNumber} oeffnen
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      {/* Day Timeline or Empty State */}
      {hasEntries ? (
        <>
          {/* Timeline */}
          <section aria-label="Tagesablauf">
            <h2 className="mb-3 text-lg font-semibold">Tagesablauf</h2>
            <div className="space-y-2">
              {timeline.map((item, index) =>
                item.type === "entry" && item.entry ? (
                  <TimelineEntry key={`entry-${item.entry.entryId}`} entry={item.entry} />
                ) : item.type === "gap" && item.gap ? (
                  <GapIndicator
                    key={`gap-${index}`}
                    gap={item.gap}
                    onClick={handleGapClick}
                  />
                ) : null
              )}
            </div>
          </section>

          {/* Daily Summary */}
          {dashboardData && (
            <section aria-label="Tages-Zusammenfassung">
              <h2 className="mb-3 text-lg font-semibold">Zusammenfassung</h2>
              <DailySummaryBar totals={dashboardData.dailyTotals} />
            </section>
          )}
        </>
      ) : (
        /* Empty Day State */
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">
              Noch keine Zeiten heute erfasst
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Starten Sie Ihren ersten Timer, indem Sie ein offenes Ticket oeffnen und den Timer starten.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {openTickets.length > 0 ? (
                <Button asChild>
                  <Link href={`/tickets/${openTickets[0].ticketId}`}>
                    <Play className="mr-2 h-4 w-4" />
                    #{openTickets[0].ticketNumber} oeffnen
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/tickets">
                    <Ticket className="mr-2 h-4 w-4" />
                    Tickets anzeigen
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* My Open Tickets */}
      <section aria-label="Meine offenen Tickets">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Meine offenen Tickets
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/tickets?assigneeId=me&status=open">Alle anzeigen</Link>
          </Button>
        </div>

        {openTickets.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {openTickets.map((ticket) => (
                  <Link
                    key={ticket.ticketId}
                    href={`/tickets/${ticket.ticketId}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-12">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="flex-1 text-sm truncate">{ticket.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PRIORITY_COLORS[ticket.priority as TicketPriority] ?? ""}`}
                    >
                      {ticket.priority}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Keine offenen Tickets zugewiesen.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Stop Timer Dialog */}
      <StopTimerDialog
        timer={stoppingTimer}
        open={!!stoppingTimer}
        onOpenChange={(open) => {
          if (!open) setStoppingTimer(null)
        }}
        onStopped={handleEntryCreated}
      />

      {/* Add Time Entry Dialog (gap backfill) */}
      <AddTimeEntryDialog
        open={gapDialogOpen}
        onOpenChange={setGapDialogOpen}
        prefillStart={selectedGap?.gapStart}
        prefillEnd={selectedGap?.gapEnd}
        openTickets={openTickets}
        onCreated={handleEntryCreated}
      />
    </div>
  )
}
