import { apiFetch } from "@/lib/auth"

// --- Types ---

export type WorkType = "phone" | "remote" | "onsite"

export interface TimeEntry {
  id: string
  ticketId: string
  technicianId: string
  workType: WorkType
  startedAt: string
  stoppedAt: string | null
  isRunning: boolean
  rawSeconds: number | null
  billableMinutes: number | null
  description: string | null
  billableOverride: boolean
  overrideNote: string | null
  technician: {
    id: string
    firstName: string
    lastName: string
  }
  ticket: {
    id: string
    ticketNumber: number
    subject: string
    status: string
  }
}

// --- Constants ---

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  phone: "Telefon",
  remote: "Remote",
  onsite: "Vor-Ort",
}

export const WORK_TYPE_COLORS: Record<WorkType, string> = {
  phone: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  remote: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  onsite: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
}

export const ALL_WORK_TYPES: WorkType[] = ["phone", "remote", "onsite"]

// --- Rounding Logic ---

export function roundToBillableMinutes(rawSeconds: number): number {
  if (rawSeconds <= 0) return 15
  const rawMinutes = Math.ceil(rawSeconds / 60)
  return Math.ceil(rawMinutes / 15) * 15
}

// --- Formatting ---

export function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

// --- API Functions ---

export async function startTimer(ticketId: string, workType: WorkType): Promise<TimeEntry> {
  const res = await apiFetch("/time-entries/start", {
    method: "POST",
    body: JSON.stringify({ ticketId, workType }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Timer konnte nicht gestartet werden")
  }

  return res.json()
}

export async function stopTimer(id: string, description: string): Promise<TimeEntry> {
  const res = await apiFetch(`/time-entries/${id}/stop`, {
    method: "POST",
    body: JSON.stringify({ description }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Timer konnte nicht gestoppt werden")
  }

  return res.json()
}

export async function fetchActiveTimer(): Promise<TimeEntry | null> {
  const res = await apiFetch("/time-entries/active")

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error("Aktiver Timer konnte nicht geladen werden")
  }

  const data = await res.json()
  // API may return null or empty if no active timer
  return data ?? null
}

export async function fetchTimeEntries(ticketId: string): Promise<TimeEntry[]> {
  const res = await apiFetch(`/time-entries?ticketId=${encodeURIComponent(ticketId)}`)

  if (!res.ok) {
    throw new Error("Zeiteintraege konnten nicht geladen werden")
  }

  return res.json()
}

export async function updateTimeEntry(
  id: string,
  data: { description?: string; billableMinutes?: number; overrideNote?: string }
): Promise<TimeEntry> {
  const res = await apiFetch(`/time-entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Zeiteintrag konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const res = await apiFetch(`/time-entries/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Zeiteintrag konnte nicht geloescht werden")
  }
}
