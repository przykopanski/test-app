"use client"

import * as React from "react"
import { ArrowLeft, AlertCircle, RefreshCw, Clock, Users } from "lucide-react"
import Link from "next/link"

import { RoleGuard } from "@/components/role-guard"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

import { TechnicianCard } from "@/components/technician-card"
import { TimelineEntry } from "@/components/timeline-entry"
import { GapIndicator } from "@/components/gap-indicator"
import { DailySummaryBar } from "@/components/daily-summary-bar"

import type { AdminTechnicianSummary, TodayDashboardData, DashboardGap } from "@/lib/dashboard"
import { fetchAdminTodayOverview, fetchTodayDashboard } from "@/lib/dashboard"
import { formatMinutes } from "@/lib/time-entries"

// Merge timeline entries and gaps for display
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

function AdminTodayContent() {
  const { user } = useAuth()
  const [technicians, setTechnicians] = React.useState<AdminTechnicianSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Detail view state
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [selectedName, setSelectedName] = React.useState<string>("")
  const [detailData, setDetailData] = React.useState<TodayDashboardData | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)

  const loadOverview = React.useCallback(async () => {
    setError(null)
    try {
      const data = await fetchAdminTodayOverview()
      setTechnicians(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Daten konnten nicht geladen werden")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // Polling every 30s
  React.useEffect(() => {
    const interval = setInterval(loadOverview, 30000)
    return () => clearInterval(interval)
  }, [loadOverview])

  async function handleSelectTechnician(userId: string) {
    const tech = technicians.find((t) => t.userId === userId)
    setSelectedUserId(userId)
    setSelectedName(tech?.displayName ?? "")
    setIsLoadingDetail(true)
    try {
      const data = await fetchTodayDashboard(userId)
      setDetailData(data)
    } catch {
      setDetailData(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function handleBackToOverview() {
    setSelectedUserId(null)
    setDetailData(null)
  }

  if (!user) return null

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Techniker-Uebersicht</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadOverview} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    )
  }

  // Detail view for a single technician
  if (selectedUserId && detailData) {
    const timeline = buildTimeline(detailData)
    const hasEntries = detailData.timeEntries.length > 0

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToOverview}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedName}</h1>
            <p className="text-muted-foreground">
              Tagesansicht (nur lesen) &mdash;{" "}
              {new Date().toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>

        {/* Active timers info */}
        {detailData.activeTimers.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium">
                {detailData.activeTimers.length} aktive{" "}
                {detailData.activeTimers.length === 1 ? "Timer" : "Timer"}
              </p>
              <div className="mt-2 space-y-1">
                {detailData.activeTimers.map((timer) => (
                  <p key={timer.timerId} className="text-sm text-muted-foreground">
                    #{timer.ticketNumber} {timer.ticketTitle}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasEntries ? (
          <>
            <section aria-label="Tagesablauf">
              <h2 className="mb-3 text-lg font-semibold">Tagesablauf</h2>
              <div className="space-y-2">
                {timeline.map((item, index) =>
                  item.type === "entry" && item.entry ? (
                    <TimelineEntry key={`entry-${item.entry.entryId}`} entry={item.entry} />
                  ) : item.type === "gap" && item.gap ? (
                    <div
                      key={`gap-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-3 dark:border-orange-700 dark:bg-orange-950/20"
                    >
                      <Clock className="h-4 w-4 text-orange-500" />
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Luecke:{" "}
                        {new Date(item.gap.gapStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(item.gap.gapEnd).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {" "}
                        ({formatMinutes(item.gap.durationMinutes)})
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </section>

            <section aria-label="Zusammenfassung">
              <h2 className="mb-3 text-lg font-semibold">Zusammenfassung</h2>
              <DailySummaryBar totals={detailData.dailyTotals} />
            </section>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Noch keine Zeiteintraege heute.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Detail loading state
  if (selectedUserId && isLoadingDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToOverview}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Total stats
  const totalMinutes = technicians.reduce((sum, t) => sum + t.totalMinutesToday, 0)
  const totalActiveTimers = technicians.reduce((sum, t) => sum + t.activeTimerCount, 0)

  // Overview grid
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Techniker-Uebersicht
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
        <Button variant="ghost" size="icon" onClick={loadOverview} aria-label="Aktualisieren">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Techniker</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicians.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamt heute</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(totalMinutes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive Timer</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveTimers}</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Technician grid */}
      {technicians.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <TechnicianCard
              key={tech.userId}
              technician={tech}
              onClick={handleSelectTechnician}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Keine Techniker gefunden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function AdminTodayPage() {
  return (
    <RoleGuard roles={["admin", "office"]}>
      <AdminTodayContent />
    </RoleGuard>
  )
}
