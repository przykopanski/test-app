import { z } from "zod/v4"
import { apiFetch } from "@/lib/auth"

// --- Types ---

export type CustomerStatus = "active" | "inactive"

export interface Customer {
  id: string
  customerNumber: string | null
  name: string
  street: string
  city: string
  zip: string
  country: string
  phone: string
  email: string
  notes: string
  status: CustomerStatus
  createdAt: string
  updatedAt: string
  contacts?: Contact[]
}

export interface Contact {
  id: string
  customerId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  position: string
}

// --- Schemas ---

export const customerFormSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  customerNumber: z.string(),
  street: z.string(),
  city: z.string(),
  zip: z.string(),
  country: z.string(),
  phone: z.string(),
  email: z.union([z.email("Bitte gueltige E-Mail-Adresse eingeben"), z.literal("")]),
  notes: z.string(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export const contactFormSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  phone: z.string(),
  email: z.union([z.email("Bitte gueltige E-Mail-Adresse eingeben"), z.literal("")]),
  position: z.string(),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

// --- API Functions ---

export async function fetchCustomers(params?: {
  search?: string
  status?: "active" | "all"
}): Promise<Customer[]> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.status && params.status !== "all") query.set("status", params.status)

  const queryString = query.toString()
  const path = `/customers${queryString ? `?${queryString}` : ""}`
  const res = await apiFetch(path)

  if (!res.ok) {
    throw new Error("Kunden konnten nicht geladen werden")
  }

  return res.json()
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const res = await apiFetch(`/customers/${id}`)

  if (!res.ok) {
    throw new Error("Kunde konnte nicht geladen werden")
  }

  return res.json()
}

export async function createCustomer(data: CustomerFormValues): Promise<Customer> {
  const res = await apiFetch("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Kunde konnte nicht erstellt werden")
  }

  return res.json()
}

export async function updateCustomer(id: string, data: CustomerFormValues): Promise<Customer> {
  const res = await apiFetch(`/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Kunde konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function archiveCustomer(id: string): Promise<Customer> {
  const res = await apiFetch(`/customers/${id}/archive`, {
    method: "PATCH",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Kundenstatus konnte nicht geaendert werden")
  }

  return res.json()
}

export async function createContact(customerId: string, data: ContactFormValues): Promise<Contact> {
  const res = await apiFetch(`/customers/${customerId}/contacts`, {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Ansprechpartner konnte nicht erstellt werden")
  }

  return res.json()
}

export async function updateContact(
  customerId: string,
  contactId: string,
  data: ContactFormValues
): Promise<Contact> {
  const res = await apiFetch(`/customers/${customerId}/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Ansprechpartner konnte nicht aktualisiert werden")
  }

  return res.json()
}

export async function deleteContact(customerId: string, contactId: string): Promise<void> {
  const res = await apiFetch(`/customers/${customerId}/contacts/${contactId}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Ansprechpartner konnte nicht geloescht werden")
  }
}
