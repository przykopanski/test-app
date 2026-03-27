"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Customer, Contact } from "@/lib/customers"
import type { User } from "@/lib/auth"
import type { Ticket, TicketFormValues } from "@/lib/tickets"
import {
  ticketFormSchema,
  PRIORITY_LABELS,
  STATUS_LABELS,
  ALL_PRIORITIES,
  ALL_STATUSES,
} from "@/lib/tickets"
import { fetchCustomers } from "@/lib/customers"
import { fetchActiveUsers } from "@/lib/tickets"

interface TicketFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket?: Ticket | null
  onSubmit: (data: TicketFormValues) => Promise<void>
}

export function TicketFormSheet({
  open,
  onOpenChange,
  ticket,
  onSubmit,
}: TicketFormSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const isEditing = !!ticket

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      status: "open",
      customerId: "",
      contactId: "",
      assigneeId: "",
    },
  })

  const selectedCustomerId = form.watch("customerId")

  // Load customers and users when sheet opens
  React.useEffect(() => {
    if (!open) return

    setIsLoadingData(true)
    setLoadError(null)

    const customersPromise = fetchCustomers({ status: "active" }).then((active) => {
      // When editing, include the ticket's current customer even if archived
      if (ticket?.customer && !active.some((c) => c.id === ticket.customer.id)) {
        return [ticket.customer, ...active]
      }
      return active
    })

    Promise.all([
      customersPromise,
      fetchActiveUsers(),
    ])
      .then(([customersData, usersData]) => {
        setCustomers(customersData)
        setUsers(usersData)
      })
      .catch(() => {
        setLoadError("Daten konnten nicht geladen werden. Bitte erneut versuchen.")
      })
      .finally(() => {
        setIsLoadingData(false)
      })
  }, [open])

  // Update contacts when customer changes
  React.useEffect(() => {
    if (!selectedCustomerId) {
      setContacts([])
      return
    }

    const customer = customers.find((c) => c.id === selectedCustomerId)
    setContacts(customer?.contacts ?? [])

    // Clear contact selection if customer changed and current contact doesn't belong
    const currentContactId = form.getValues("contactId")
    if (currentContactId) {
      const contactBelongs = (customer?.contacts ?? []).some(
        (c) => c.id === currentContactId
      )
      if (!contactBelongs) {
        form.setValue("contactId", "")
      }
    }
  }, [selectedCustomerId, customers, form])

  // Reset form when sheet opens
  React.useEffect(() => {
    if (open && ticket) {
      form.reset({
        subject: ticket.subject,
        description: ticket.description ?? "",
        priority: ticket.priority,
        status: ticket.status,
        customerId: ticket.customer.id,
        contactId: ticket.contact?.id ?? "",
        assigneeId: ticket.assignee?.id ?? "",
      })
    } else if (open && !ticket) {
      form.reset({
        subject: "",
        description: "",
        priority: "medium",
        status: "open",
        customerId: "",
        contactId: "",
        assigneeId: "",
      })
    }
  }, [open, ticket, form])

  async function handleSubmit(data: TicketFormValues) {
    setIsSubmitting(true)
    try {
      // Clean optional empty strings to undefined
      const cleaned = {
        ...data,
        contactId: data.contactId || undefined,
        assigneeId: data.assigneeId || undefined,
      }
      await onSubmit(cleaned as TicketFormValues)
      onOpenChange(false)
    } catch {
      // Error handling is done by the parent via toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Ticket bearbeiten" : "Neues Ticket erstellen"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Ticketdaten aktualisieren."
              : "Erfassen Sie die Daten fuer das neue Ticket."}
          </SheetDescription>
        </SheetHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4 px-4 pb-4"
            >
              {/* Customer */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kunde *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kunde waehlen..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                            {customer.customerNumber
                              ? ` (${customer.customerNumber})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact (filtered by customer) */}
              {contacts.length > 0 && (
                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ansprechpartner</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Ansprechpartner waehlen..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Kein Ansprechpartner</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.firstName} {contact.lastName}
                              {contact.position ? ` - ${contact.position}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Betreff *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Kurze Beschreibung des Problems..."
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detaillierte Beschreibung..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioritaet *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ALL_PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PRIORITY_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ALL_STATUSES.filter((s) => s !== "closed").map(
                            (s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Assignee */}
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zustaendiger Techniker</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nicht zugewiesen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nicht zugewiesen</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Speichern" : "Erstellen"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
