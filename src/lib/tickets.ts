import { z } from "zod/v4"
import { apiFetch } from "@/lib/auth"
import type { User } from "@/lib/auth"
import type { Customer, Contact } from "@/lib/customers"

// --- Types ---

export type TicketPriority = "low" | "medium" | "high" | "critical"
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "on_hold"

export interface Ticket {
  id: string
  ticketNumber: number
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  customer: Customer
  contact: Contact | null
  assignee: User | null
  createdBy: User
  createdAt: string
  updatedAt: string
}

export interface TicketNote {
  id: string
  text: string
  author: User
  isClosingNote: boolean
  createdAt: string
}

export interface TicketDetail extends Ticket {
  notes: TicketNote[]
}

export interface PaginatedTickets {
  data: Ticket[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// --- Constants ---

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
}

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  resolved: "Geloest",
  closed: "Geschlossen",
  on_hold: "Wartend",
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  resolved: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  on_hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
}

export const ALL_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"]
export const ALL_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed", "on_hold"]

// --- Schemas ---

export const ticketFormSchema = z.object({
  subject: z.string().min(1, "Betreff ist erforderlich").max(200, "Maximal 200 Zeichen"),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"] as const),
  status: z.enum(["open", "in_progress", "resolved", "closed", "on_hold"] as const),
  customerId: z.string().min(1, "Kunde ist erforderlich"),
  contactId: z.string().optional(),
  assigneeId: z.string().optional(),
})

export type TicketFormValues = z.infer<typeof ticketFormSchema>

export const ticketNoteSchema = z.object({
  text: z.string().min(1, "Notiz darf nicht leer sein"),
})

export type TicketNoteValues = z.infer<typeof ticketNoteSchema>

export const ticketCloseSchema = z.object({
  closingNote: z.string().min(1, "Abschlussnotiz ist erforderlich"),
})

export type TicketCloseValues = z.infer<typeof ticketCloseSchema>

// --- API Functions ---

export interface TicketFilterParams {
  page?: number
  limit?: number
  status?: TicketStatus
  priority?: TicketPriority
  assigneeId?: string
  customerId?: string
  search?: string
  sortBy?: "createdAt" | "priority" | "status"
  sortOrder?: "ASC" | "DESC"
}

export async function fetchTickets(params?: TicketFilterParams): Promise<PaginatedTickets> {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))
  if (params?.status) query.set("status", params.status)
  if (params?.priority) query.set("priority", params.priority)
  if (params?.assigneeId) query.set("assigneeId", params.assigneeId)
  if (params?.customerId) query.set("customerId", params.customerId)
  if (params?.search) query.set("search", params.search)
  if (params?.sortBy) query.set("sortBy", params.sortBy)
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder)

  const queryString = query.toString()
  const path = `/tickets${queryString ? `?${queryString}` : ""}`
  const res = await apiFetch(path)

  if (!res.ok) {
    throw new Error("Tickets konnten nicht geladen werden")
  }

  return res.json()
}

export async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await apiFetch(`/tickets/${id}`)

  if (!res.ok) {
    throw new Error("Ticket konnte nicht geladen werden")
  }

  return res.json()
}

export async function createTicket(data: TicketFormValues): Promise<Ticket> {
  const res = await apiFetch("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Ticket konnte nicht erstellt werden")
  }

  return res.json()
}

export async function updateTicket(id: string, data: Partial<TicketFormValues>): Promise<Ticket> {
  const res = await apiFetch(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Ticket konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function closeTicket(id: string, closingNote: string): Promise<Ticket> {
  const res = await apiFetch(`/tickets/${id}/close`, {
    method: "POST",
    body: JSON.stringify({ closingNote }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Ticket konnte nicht geschlossen werden")
  }

  return res.json()
}

export async function addTicketNote(ticketId: string, text: string): Promise<TicketNote> {
  const res = await apiFetch(`/tickets/${ticketId}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Notiz konnte nicht hinzugefuegt werden")
  }

  return res.json()
}

// --- Helper: fetch all users (for assignee dropdown) ---

export async function fetchActiveUsers(): Promise<User[]> {
  const res = await apiFetch("/users/active")

  if (!res.ok) {
    throw new Error("Benutzer konnten nicht geladen werden")
  }

  return res.json()
}
