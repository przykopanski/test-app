import { z } from "zod/v4"
import { apiFetch } from "@/lib/auth"

// --- VAT Rate Types ---

export interface VatRate {
  id: string
  label: string
  rate: number
  isActive: boolean
}

// --- Material Types ---

export interface TicketMaterial {
  id: string
  ticketId: string
  name: string
  quantity: number
  unitPriceNet: number
  vatRateSnapshot: number
  vatRateLabel: string
  vatRateId: string | null
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
  updatedAt: string
}

// --- Schemas ---

export const materialFormSchema = z.object({
  name: z.string().min(2, "Artikelname muss mindestens 2 Zeichen haben").max(200, "Maximal 200 Zeichen"),
  quantity: z
    .number()
    .int("Menge muss eine ganze Zahl sein")
    .min(1, "Mindestens 1")
    .max(9999, "Maximal 9999"),
  unitPriceNet: z
    .number()
    .min(0, "Preis darf nicht negativ sein")
    .max(999999.99, "Maximal 999.999,99 EUR"),
  vatRateId: z.string().min(1, "MwSt.-Satz ist erforderlich"),
})

export type MaterialFormValues = z.infer<typeof materialFormSchema>

export const vatRateFormSchema = z.object({
  label: z.string().min(1, "Label ist erforderlich").max(50, "Maximal 50 Zeichen"),
  rate: z
    .number()
    .min(0, "Prozentsatz darf nicht negativ sein")
    .max(100, "Maximal 100%"),
  isActive: z.boolean(),
})

export type VatRateFormValues = z.infer<typeof vatRateFormSchema>

// --- Helper Functions ---

/**
 * Calculate gross price for a material entry.
 * unitPriceNet * quantity * (1 + vatRate/100)
 */
export function calculateGross(
  unitPriceNet: number,
  quantity: number,
  vatRate: number
): number {
  return unitPriceNet * quantity * (1 + vatRate / 100)
}

/**
 * Format a number as EUR currency string (German locale).
 */
export function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

// --- Material API Functions ---

export async function fetchTicketMaterials(ticketId: string): Promise<TicketMaterial[]> {
  const res = await apiFetch(`/tickets/${ticketId}/materials`)

  if (!res.ok) {
    throw new Error("Materialien konnten nicht geladen werden")
  }

  return res.json()
}

export async function createTicketMaterial(
  ticketId: string,
  data: MaterialFormValues
): Promise<TicketMaterial> {
  const res = await apiFetch(`/tickets/${ticketId}/materials`, {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Material konnte nicht hinzugefuegt werden")
  }

  return res.json()
}

export async function updateTicketMaterial(
  ticketId: string,
  materialId: string,
  data: Partial<MaterialFormValues>
): Promise<TicketMaterial> {
  const res = await apiFetch(`/tickets/${ticketId}/materials/${materialId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Material konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function deleteTicketMaterial(
  ticketId: string,
  materialId: string
): Promise<void> {
  const res = await apiFetch(`/tickets/${ticketId}/materials/${materialId}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Material konnte nicht geloescht werden")
  }
}

// --- VAT Rate API Functions ---

export async function fetchActiveVatRates(): Promise<VatRate[]> {
  const res = await apiFetch("/vat-rates")

  if (!res.ok) {
    throw new Error("MwSt.-Saetze konnten nicht geladen werden")
  }

  return res.json()
}

export async function fetchAllVatRates(): Promise<VatRate[]> {
  const res = await apiFetch("/admin/vat-rates")

  if (!res.ok) {
    throw new Error("MwSt.-Saetze konnten nicht geladen werden")
  }

  return res.json()
}

export async function createVatRate(data: VatRateFormValues): Promise<VatRate> {
  const res = await apiFetch("/admin/vat-rates", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "MwSt.-Satz konnte nicht erstellt werden")
  }

  return res.json()
}

export async function updateVatRate(
  id: string,
  data: Partial<VatRateFormValues>
): Promise<VatRate> {
  const res = await apiFetch(`/admin/vat-rates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "MwSt.-Satz konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function deleteVatRate(id: string): Promise<void> {
  const res = await apiFetch(`/admin/vat-rates/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "MwSt.-Satz konnte nicht geloescht werden")
  }
}
