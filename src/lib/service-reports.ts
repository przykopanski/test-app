import { z } from "zod/v4"
import { apiFetch } from "@/lib/auth"

// --- Types ---

export type ServiceReportStatus = "draft" | "completed"

export interface ServiceReport {
  id: string
  ticketId: string
  description: string
  status: ServiceReportStatus
  lockedAt: string | null
  lockedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ServiceReportUnlock {
  id: string
  serviceReportId: string
  unlockedBy: {
    id: string
    firstName: string
    lastName: string
  }
  unlockedAt: string
  reason: string | null
}

// --- Schemas ---

export const serviceReportFormSchema = z.object({
  description: z.string().min(1, "Arbeitsbeschreibung ist erforderlich"),
})

export type ServiceReportFormValues = z.infer<typeof serviceReportFormSchema>

export const unlockReasonSchema = z.object({
  reason: z.string().optional(),
})

export type UnlockReasonValues = z.infer<typeof unlockReasonSchema>

// --- API Functions ---

export async function fetchServiceReport(ticketId: string): Promise<ServiceReport | null> {
  const res = await apiFetch(`/tickets/${ticketId}/service-report`)

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error("Einsatzbericht konnte nicht geladen werden")
  }

  return res.json()
}

export async function createServiceReport(
  ticketId: string,
  data: ServiceReportFormValues
): Promise<ServiceReport> {
  const res = await apiFetch(`/tickets/${ticketId}/service-report`, {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Einsatzbericht konnte nicht erstellt werden")
  }

  return res.json()
}

export async function updateServiceReport(
  ticketId: string,
  data: Partial<ServiceReportFormValues>
): Promise<ServiceReport> {
  const res = await apiFetch(`/tickets/${ticketId}/service-report`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Einsatzbericht konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function finalizeServiceReport(ticketId: string): Promise<ServiceReport> {
  const res = await apiFetch(`/tickets/${ticketId}/service-report`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Einsatzbericht konnte nicht finalisiert werden")
  }

  return res.json()
}

export async function unlockServiceReport(
  ticketId: string,
  reason?: string
): Promise<void> {
  const res = await apiFetch(`/tickets/${ticketId}/service-report/unlock`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Einsatzbericht konnte nicht entsperrt werden")
  }
}
