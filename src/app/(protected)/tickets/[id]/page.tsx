"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  AlertCircle,
  Loader2,
  User,
  Building2,
  Send,
  Lock,
  Play,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TicketFormSheet } from "@/components/ticket-form-sheet"
import { TicketCloseDialog } from "@/components/ticket-close-dialog"
import { StartTimerDialog } from "@/components/start-timer-dialog"
import { TimeEntriesTable } from "@/components/time-entries-table"
import { useTimer } from "@/components/timer-context"
import { useAuth } from "@/components/auth-provider"

import type { TicketDetail, TicketFormValues } from "@/lib/tickets"
import {
  fetchTicket,
  updateTicket,
  closeTicket,
  addTicketNote,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/tickets"

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const [ticket, setTicket] = React.useState<TicketDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const { hasActiveTimerForTicket } = useTimer()
  const { hasRole } = useAuth()
  const isTechnician = hasRole("technician") || hasRole("admin")
  const [editFormOpen, setEditFormOpen] = React.useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false)
  const [startTimerOpen, setStartTimerOpen] = React.useState(false)
  const [noteText, setNoteText] = React.useState("")
  const [isSubmittingNote, setIsSubmittingNote] = React.useState(false)

  const loadTicket = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchTicket(ticketId)
      setTicket(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  React.useEffect(() => {
    loadTicket()
  }, [loadTicket])

  // Update ticket
  async function handleUpdateTicket(data: TicketFormValues) {
    try {
      await updateTicket(ticketId, data)
      toast.success("Ticket wurde aktualisiert.")
      loadTicket()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ticket konnte nicht aktualisiert werden")
      throw err
    }
  }

  // Close ticket
  async function handleCloseTicket(closingNote: string) {
    try {
      await closeTicket(ticketId, closingNote)
      toast.success("Ticket wurde geschlossen.")
      loadTicket()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ticket konnte nicht geschlossen werden")
      throw err
    }
  }

  // Add note
  async function handleAddNote() {
    if (!noteText.trim()) return
    setIsSubmittingNote(true)
    try {
      const newNote = await addTicketNote(ticketId, noteText.trim())
      setTicket((prev) =>
        prev ? { ...prev, notes: [...prev.notes, newNote] } : prev
      )
      setNoteText("")
      toast.success("Notiz wurde hinzugefuegt.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Hinzufuegen der Notiz")
    } finally {
      setIsSubmittingNote(false)
    }
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurueck
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ?? "Ticket konnte nicht gefunden werden."}
          </AlertDescription>
        </Alert>
        <Button onClick={loadTicket} variant="outline">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  const isClosed = ticket.status === "closed"

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/tickets">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurueck zur Ticketliste
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              #{ticket.ticketNumber}
            </span>
            <Badge
              variant="outline"
              className={PRIORITY_COLORS[ticket.priority]}
            >
              {PRIORITY_LABELS[ticket.priority]}
            </Badge>
            <Badge
              variant="outline"
              className={STATUS_COLORS[ticket.status]}
            >
              {STATUS_LABELS[ticket.status]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {ticket.subject}
          </h1>
        </div>

        <div className="flex gap-2">
          {!isClosed && (
            <>
              {isTechnician && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          onClick={() => setStartTimerOpen(true)}
                          disabled={hasActiveTimerForTicket(ticket.id)}
                          aria-label="Timer starten"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Timer starten
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {hasActiveTimerForTicket(ticket.id) && (
                      <TooltipContent>
                        Bereits ein Timer auf diesem Ticket aktiv
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditFormOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Bearbeiten
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCloseDialogOpen(true)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Schliessen
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Beschreibung</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.description ? (
                <p className="whitespace-pre-wrap text-sm">
                  {ticket.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine Beschreibung vorhanden.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notizen</CardTitle>
              <CardDescription>
                {ticket.notes.length}{" "}
                {ticket.notes.length === 1 ? "Notiz" : "Notizen"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Noch keine Notizen vorhanden.
                </p>
              ) : (
                <div className="space-y-3">
                  {ticket.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`rounded-lg border p-3 ${
                        note.isClosingNote
                          ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium">
                          {note.author.firstName} {note.author.lastName}
                          {note.isClosingNote && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px] py-0 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                            >
                              Abschlussnotiz
                            </Badge>
                          )}
                        </span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add note form */}
              {!isClosed && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Neue Notiz schreiben..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="min-h-[80px]"
                      aria-label="Neue Notiz"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || isSubmittingNote}
                      >
                        {isSubmittingNote ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Notiz hinzufuegen
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Time entries (PROJ-4) */}
          <TimeEntriesTable ticketId={ticketId} />
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer */}
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Kunde</p>
                  <Link
                    href={`/customers/${ticket.customer.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.customer.status === "inactive"
                      ? `${ticket.customer.name} [archiviert]`
                      : ticket.customer.name}
                  </Link>
                </div>
              </div>

              {/* Contact */}
              {ticket.contact && (
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Ansprechpartner</p>
                    <p className="font-medium">
                      {ticket.contact.firstName} {ticket.contact.lastName}
                    </p>
                    {ticket.contact.position && (
                      <p className="text-xs text-muted-foreground">
                        {ticket.contact.position}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Assignee */}
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Zustaendig</p>
                  <p className="font-medium">
                    {ticket.assignee
                      ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                      : "Nicht zugewiesen"}
                  </p>
                </div>
              </div>

              {/* Created by */}
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Erstellt von</p>
                  <p className="font-medium">
                    {ticket.createdBy.firstName} {ticket.createdBy.lastName}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Erstellt am</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aktualisiert am</span>
                  <span>{formatDate(ticket.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit form sheet */}
      <TicketFormSheet
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        ticket={ticket}
        onSubmit={handleUpdateTicket}
      />

      {/* Close dialog */}
      <TicketCloseDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        ticketNumber={ticket.ticketNumber}
        onConfirm={handleCloseTicket}
      />

      {/* Start timer dialog (PROJ-4) */}
      <StartTimerDialog
        open={startTimerOpen}
        onOpenChange={setStartTimerOpen}
        ticketId={ticketId}
        ticketSubject={ticket.subject}
      />
    </div>
  )
}
