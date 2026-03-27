"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Archive,
  ArchiveRestore,
  Trash2,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CustomerFormSheet } from "@/components/customer-form-sheet"
import { ContactFormSheet } from "@/components/contact-form-sheet"

import type { Customer, Contact, CustomerFormValues, ContactFormValues } from "@/lib/customers"
import {
  fetchCustomer,
  updateCustomer,
  archiveCustomer,
  createContact,
  updateContact,
  deleteContact,
} from "@/lib/customers"

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasRole } = useAuth()
  const canWrite = hasRole(["office", "admin"])
  const isAdmin = hasRole("admin")

  const customerId = params.id as string

  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [editFormOpen, setEditFormOpen] = React.useState(false)
  const [contactFormOpen, setContactFormOpen] = React.useState(false)
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null)
  const [isArchiving, setIsArchiving] = React.useState(false)

  const loadCustomer = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCustomer(customerId)
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  React.useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  // Edit customer
  async function handleUpdateCustomer(data: CustomerFormValues) {
    const updated = await updateCustomer(customerId, data)
    setCustomer(updated)
    toast.success("Kunde wurde aktualisiert.")
  }

  // Archive / unarchive
  async function handleArchiveToggle() {
    if (!customer) return
    setIsArchiving(true)
    try {
      const updated = await archiveCustomer(customerId)
      setCustomer(updated)
      toast.success(
        updated.status === "inactive"
          ? "Kunde wurde archiviert."
          : "Kunde wurde reaktiviert."
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Archivieren")
    } finally {
      setIsArchiving(false)
    }
  }

  // Add contact
  async function handleCreateContact(data: ContactFormValues) {
    const created = await createContact(customerId, data)
    setCustomer((prev) =>
      prev
        ? { ...prev, contacts: [...(prev.contacts ?? []), created] }
        : prev
    )
    toast.success(`Ansprechpartner ${created.firstName} ${created.lastName} hinzugefuegt.`)
  }

  // Edit contact
  async function handleUpdateContact(data: ContactFormValues) {
    if (!editingContact) return
    const updated = await updateContact(customerId, editingContact.id, data)
    setCustomer((prev) =>
      prev
        ? {
            ...prev,
            contacts: (prev.contacts ?? []).map((c) =>
              c.id === updated.id ? updated : c
            ),
          }
        : prev
    )
    setEditingContact(null)
    toast.success("Ansprechpartner wurde aktualisiert.")
  }

  // Delete contact
  async function handleDeleteContact(contact: Contact) {
    try {
      await deleteContact(customerId, contact.id)
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              contacts: (prev.contacts ?? []).filter((c) => c.id !== contact.id),
            }
          : prev
      )
      toast.success(
        `Ansprechpartner ${contact.firstName} ${contact.lastName} wurde geloescht.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Loeschen")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurueck
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ?? "Kunde konnte nicht gefunden werden."}
          </AlertDescription>
        </Alert>
        <Button onClick={loadCustomer} variant="outline">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  const contacts = customer.contacts ?? []

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/customers">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurueck zur Kundenliste
        </Link>
      </Button>

      {/* Customer header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.name}
              </h1>
              <Badge
                variant={customer.status === "active" ? "default" : "secondary"}
              >
                {customer.status === "active" ? "Aktiv" : "Archiviert"}
              </Badge>
            </div>
            {customer.customerNumber && (
              <p className="text-sm text-muted-foreground">
                Kundennr. {customer.customerNumber}
              </p>
            )}
          </div>
        </div>

        {canWrite && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditFormOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
                disabled={isArchiving}
              >
                {isArchiving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : customer.status === "active" ? (
                  <Archive className="mr-2 h-4 w-4" />
                ) : (
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                )}
                {customer.status === "active" ? "Archivieren" : "Reaktivieren"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kundendaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(customer.street || customer.city || customer.zip) && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  {customer.street && <p>{customer.street}</p>}
                  {(customer.zip || customer.city) && (
                    <p>
                      {customer.zip} {customer.city}
                    </p>
                  )}
                  {customer.country && (
                    <p className="text-muted-foreground">{customer.country}</p>
                  )}
                </div>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${customer.phone}`}
                  className="text-sm hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            )}

            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${customer.email}`}
                  className="text-sm hover:underline"
                >
                  {customer.email}
                </a>
              </div>
            )}

            {!customer.street &&
              !customer.city &&
              !customer.phone &&
              !customer.email && (
                <p className="text-sm text-muted-foreground">
                  Keine Kontaktdaten hinterlegt.
                </p>
              )}

            {customer.notes && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Notizen
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contacts section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Ansprechpartner</CardTitle>
              <CardDescription>
                {contacts.length}{" "}
                {contacts.length === 1 ? "Kontakt" : "Kontakte"}
              </CardDescription>
            </div>
            {canWrite && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingContact(null)
                  setContactFormOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Hinzufuegen
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <User className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Noch keine Ansprechpartner hinterlegt.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.position && (
                        <p className="text-xs text-muted-foreground">
                          {contact.position}
                        </p>
                      )}
                      <div className="mt-1 flex flex-col gap-0.5">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </a>
                        )}
                      </div>
                    </div>

                    {canWrite && (
                      <div className="ml-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingContact(contact)
                            setContactFormOpen(true)
                          }}
                          aria-label={`${contact.firstName} ${contact.lastName} bearbeiten`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label={`${contact.firstName} ${contact.lastName} loeschen`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Ansprechpartner loeschen?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Moechten Sie {contact.firstName} {contact.lastName}{" "}
                                wirklich loeschen? Dies kann nicht rueckgaengig
                                gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteContact(contact)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Loeschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit customer sheet */}
      <CustomerFormSheet
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        customer={customer}
        onSubmit={handleUpdateCustomer}
      />

      {/* Contact form sheet */}
      <ContactFormSheet
        open={contactFormOpen}
        onOpenChange={(open) => {
          setContactFormOpen(open)
          if (!open) setEditingContact(null)
        }}
        contact={editingContact}
        onSubmit={editingContact ? handleUpdateContact : handleCreateContact}
      />
    </div>
  )
}
