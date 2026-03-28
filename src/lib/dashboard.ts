import { apiFetch } from "@/lib/auth"
import type { WorkType } from "@/lib/time-entries"

// --- Types ---

export interface DashboardActiveTimer {
  timerId: string
  ticketId: string
  ticketNumber: number
  ticketTitle: string
  workType: WorkType
  startedAt: string
  elapsedSeconds: number
}

export interface DashboardTimeEntry {
  entryId: string
  ticketId: string
  ticketNumber: number
  ticketTitle: string
  workType: WorkType
  startTime: string
  endTime: string
  durationMinutes: number
  description: string | null
  isBillable: boolean
}

export interface DashboardGap {
  gapStart: string
  gapEnd: string
  durationMinutes: number
}

export interface DashboardWorkTypeSummary {
  workType: WorkType
  minutes: number
}

export interface DashboardDailyTotals {
  totalMinutesRaw: number
  totalMinutesBillable: number
  byWorkType: DashboardWorkTypeSummary[]
}

export interface TodayDashboardData {
  date: string
  activeTimers: DashboardActiveTimer[]
  timeEntries: DashboardTimeEntry[]
  gaps: DashboardGap[]
  dailyTotals: DashboardDailyTotals
}

export interface OpenTicketItem {
  ticketId: string
  ticketNumber: number
  title: string
  status: string
  priority: string
}

export interface AdminTechnicianSummary {
  userId: string
  displayName: string
  totalMinutesToday: number
  activeTimerCount: number
  lastActivity: string | null
}

// --- API Functions ---

export async function fetchTodayDashboard(userId?: string): Promise<TodayDashboardData> {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : ""
  const res = await apiFetch(`/time-tracking/today${params}`)

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Dashboard-Daten konnten nicht geladen werden")
  }

  return res.json()
}

export async function fetchMyOpenTickets(): Promise<OpenTicketItem[]> {
  const res = await apiFetch("/tickets?assignedToMe=true&status=open&limit=10")

  if (!res.ok) {
    throw new Error("Offene Tickets konnten nicht geladen werden")
  }

  const data = await res.json()
  // The tickets API returns paginated data
  const tickets = data.data ?? data
  return Array.isArray(tickets)
    ? tickets.map((t: Record<string, unknown>) => ({
        ticketId: t.id as string,
        ticketNumber: t.ticketNumber as number,
        title: t.subject as string,
        status: t.status as string,
        priority: t.priority as string,
      }))
    : []
}

export async function fetchAdminTodayOverview(): Promise<AdminTechnicianSummary[]> {
  const res = await apiFetch("/admin/dashboard/today")

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Admin-Uebersicht konnte nicht geladen werden")
  }

  return res.json()
}
