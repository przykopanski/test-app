"use client"

import * as React from "react"
import { Pencil, Trash2, AlertCircle, AlertTriangle, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useAuth } from "@/components/auth-provider"
import { useTimer } from "@/components/timer-context"
import type { TimeEntry } from "@/lib/time-entries"
import {
  fetchTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  formatMinutes,
  formatElapsedTime,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
} from "@/lib/time-entries"

interface TimeEntriesTableProps {
  ticketId: string
  serviceReportStatus?: "draft" | "completed" | null
}

export function TimeEntriesTable({ ticketId, serviceReportStatus }: TimeEntriesTableProps) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole("admin")
  const { timerStoppedVersion } = useTimer()

  const [entries, setEntries] = React.useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Edit dialog state
  const [editEntry, setEditEntry] = React.useState<TimeEntry | null>(null)
  const [editDescription, setEditDescription] = React.useState("")
  const [editBillableMinutes, setEditBillableMinutes] = React.useState("")
  const [editDistanceKm, setEditDistanceKm] = React.useState("")
  const [editOverrideNote, setEditOverrideNote] = React.useState("")
  const [isEditing, setIsEditing] = React.useState(false)

  // Delete dialog state
  const [deleteEntry, setDeleteEntry] = React.useState<TimeEntry | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const loadEntries = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchTimeEntries(ticketId)
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  React.useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Reload entries when a timer is stopped (via context)
  React.useEffect(() => {
    if (timerStoppedVersion > 0) {
      loadEntries()
    }
  }, [timerStoppedVersion, loadEntries])

  // Open edit dialog
  function handleOpenEdit(entry: TimeEntry) {
    setEditEntry(entry)
    setEditDescription(entry.description ?? "")
    setEditBillableMinutes(String(entry.billableMinutes ?? ""))
    setEditDistanceKm(entry.distanceKm != null ? String(entry.distanceKm) : "")
    setEditOverrideNote("")
  }

  // Save edit
  async function handleSaveEdit() {
    if (!editEntry) return

    const newBillable = parseInt(editBillableMinutes, 10)
    const billableChanged = !isNaN(newBillable) && newBillable !== editEntry.billableMinutes

    if (billableChanged && editOverrideNote.trim().length === 0) {
      toast.error("Bei Aenderung der abrechenbaren Zeit ist eine Notiz erforderlich.")
      return
    }

    setIsEditing(true)
    try {
      const payload: { description?: string; billableMinutes?: number; overrideNote?: string; distanceKm?: number } = {}
      if (editDescription.trim() !== editEntry.description) {
        payload.description = editDescription.trim()
      }
      if (billableChanged) {
        payload.billableMinutes = newBillable
        payload.overrideNote = editOverrideNote.trim()
      }
      if (editEntry.workType === "travel" && editDistanceKm !== "") {
        const newKm = parseFloat(editDistanceKm.replace(",", "."))
        if (!isNaN(newKm) && newKm !== editEntry.distanceKm) {
          payload.distanceKm = newKm
        }
      }

      await updateTimeEntry(editEntry.id, payload)
      toast.success("Zeiteintrag aktualisiert")
      setEditEntry(null)
      loadEntries()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setIsEditing(false)
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteEntry) return
    setIsDeleting(true)
    try {
      await deleteTimeEntry(deleteEntry.id)
      toast.success("Zeiteintrag geloescht")
      setDeleteEntry(null)
      loadEntries()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Loeschen")
    } finally {
      setIsDeleting(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Compute total billable
  const totalBillable = entries
    .filter((e) => !e.isRunning)
    .reduce((sum, e) => sum + (e.billableMinutes ?? 0), 0)

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zeiteintraege</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zeiteintraege</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadEntries} variant="outline" size="sm" className="mt-2">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zeiteintraege</CardTitle>
          <CardDescription>
            {entries.length} {entries.length === 1 ? "Eintrag" : "Eintraege"}
            {totalBillable > 0 && (
              <span className="ml-2 font-medium text-foreground">
                ({formatMinutes(totalBillable)} abrechenbar)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceReportStatus === "completed" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Der Einsatzbericht ist bereits abgeschlossen. Neue Zeiteintraege werden nicht im Bericht beruecksichtigt.
              </p>
            </div>
          )}
          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Noch keine Zeiteintraege vorhanden.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead className="hidden sm:table-cell">Techniker</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="hidden md:table-cell">km</TableHead>
                    <TableHead className="hidden md:table-cell">Rohzeit</TableHead>
                    <TableHead>Abrechenbar</TableHead>
                    <TableHead className="hidden lg:table-cell">Beschreibung</TableHead>
                    {isAdmin && <TableHead className="w-[80px]">Aktionen</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        <div>{formatDate(entry.startedAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(entry.startedAt)}
                          {entry.stoppedAt && ` - ${formatTime(entry.stoppedAt)}`}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {entry.technician.firstName} {entry.technician.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${WORK_TYPE_COLORS[entry.workType]}`}
                        >
                          {WORK_TYPE_LABELS[entry.workType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {entry.workType === "travel" && entry.distanceKm != null
                          ? `${entry.distanceKm.toLocaleString("de-DE")} km`
                          : "--"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {entry.isRunning ? (
                          <span className="text-primary animate-pulse">Laeuft...</span>
                        ) : entry.rawSeconds != null ? (
                          formatElapsedTime(entry.rawSeconds)
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {entry.isRunning ? (
                          <span className="text-primary animate-pulse">--</span>
                        ) : entry.billableMinutes != null ? (
                          <span className={entry.billableOverride ? "text-orange-600 dark:text-orange-400" : ""}>
                            {formatMinutes(entry.billableMinutes)}
                            {entry.billableOverride && " *"}
                          </span>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {entry.description ?? "--"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {!entry.isRunning && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(entry)}
                                aria-label="Zeiteintrag bearbeiten"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteEntry(entry)}
                                aria-label="Zeiteintrag loeschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
            <DialogDescription>
              Beschreibung oder abrechenbare Zeit anpassen.
            </DialogDescription>
          </DialogHeader>

          {editEntry && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-description">Beschreibung (min. 10 Zeichen)</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[80px]"
                />
                {editDescription.trim().length > 0 && editDescription.trim().length < 10 && (
                  <p className="text-xs text-destructive">
                    Noch {10 - editDescription.trim().length} Zeichen erforderlich.
                  </p>
                )}
              </div>

              {editEntry.workType === "travel" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-distance">Kilometer</Label>
                  <Input
                    id="edit-distance"
                    type="text"
                    inputMode="decimal"
                    placeholder="z.B. 23,5"
                    value={editDistanceKm}
                    onChange={(e) => setEditDistanceKm(e.target.value)}
                    disabled={serviceReportStatus === "completed"}
                  />
                  {serviceReportStatus === "completed" && (
                    <p className="text-xs text-muted-foreground">
                      Kilometer gesperrt — Einsatzbericht ist abgeschlossen.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-billable">Abrechenbare Minuten</Label>
                <Input
                  id="edit-billable"
                  type="number"
                  min={0}
                  step={15}
                  value={editBillableMinutes}
                  onChange={(e) => setEditBillableMinutes(e.target.value)}
                />
                {editEntry.billableMinutes != null &&
                  parseInt(editBillableMinutes, 10) !== editEntry.billableMinutes && (
                    <p className="text-xs text-muted-foreground">
                      Originalwert: {formatMinutes(editEntry.billableMinutes)}
                    </p>
                  )}
              </div>

              {editEntry.billableMinutes != null &&
                parseInt(editBillableMinutes, 10) !== editEntry.billableMinutes && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-override-note">
                      Begr&uuml;ndung (Pflichtfeld bei Aenderung)
                    </Label>
                    <Textarea
                      id="edit-override-note"
                      placeholder="Warum wird die abrechenbare Zeit geaendert?"
                      value={editOverrideNote}
                      onChange={(e) => setEditOverrideNote(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit} disabled={isEditing || editDescription.trim().length < 10}>
              {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zeiteintrag loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Zeiteintrag wird unwiderruflich geloescht. Dieser Vorgang kann nicht rueckgaengig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
