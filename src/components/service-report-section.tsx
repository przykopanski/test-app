"use client"

import * as React from "react"
import {
  Loader2,
  FileText,
  Save,
  CheckCircle,
  Phone,
  Monitor,
  MapPin,
  Car,
  AlertTriangle,
  Lock,
  Ban,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { useAuth } from "@/components/auth-provider"
import { useTimer } from "@/components/timer-context"
import type { TimeEntry, WorkType } from "@/lib/time-entries"
import {
  fetchTimeEntries,
  formatMinutes,
  WORK_TYPE_LABELS,
} from "@/lib/time-entries"
import type { TicketMaterial } from "@/lib/materials"
import { fetchTicketMaterials, formatEur, calculateGross } from "@/lib/materials"
import type { ServiceReport, FinalizeData } from "@/lib/service-reports"
import {
  fetchServiceReport,
  createServiceReport,
  updateServiceReport,
  finalizeServiceReport,
} from "@/lib/service-reports"
import { ServiceReportUnlockDialog } from "@/components/service-report-unlock-dialog"
import { SignatureDialog } from "@/components/signature-dialog"

interface ServiceReportSectionProps {
  ticketId: string
  ticketStatus: string
}

const WORK_TYPE_ICONS: Record<WorkType, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  remote: <Monitor className="h-4 w-4" />,
  onsite: <MapPin className="h-4 w-4" />,
  travel: <Car className="h-4 w-4" />,
}

const WORK_TYPE_ORDER: WorkType[] = ["onsite", "travel", "remote", "phone"]

interface GroupedEntries {
  workType: WorkType
  entries: TimeEntry[]
  totalMinutes: number
  totalKm: number
}

function groupTimeEntries(entries: TimeEntry[]): GroupedEntries[] {
  const stopped = entries.filter((e) => !e.isRunning)
  const groups: GroupedEntries[] = []

  for (const workType of WORK_TYPE_ORDER) {
    const typeEntries = stopped.filter((e) => e.workType === workType)
    if (typeEntries.length === 0) continue

    const totalMinutes = typeEntries.reduce(
      (sum, e) => sum + (e.billableMinutes ?? 0),
      0
    )
    const totalKm = typeEntries.reduce(
      (sum, e) => sum + (e.distanceKm ?? 0),
      0
    )

    groups.push({ workType, entries: typeEntries, totalMinutes, totalKm })
  }

  return groups
}

export function ServiceReportSection({
  ticketId,
  ticketStatus,
}: ServiceReportSectionProps) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole("admin")
  const { timerStoppedVersion } = useTimer()

  const [report, setReport] = React.useState<ServiceReport | null | undefined>(
    undefined
  )
  const [entries, setEntries] = React.useState<TimeEntry[]>([])
  const [materials, setMaterials] = React.useState<TicketMaterial[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [description, setDescription] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [showSignatureDialog, setShowSignatureDialog] = React.useState(false)
  const [unlockDialogOpen, setUnlockDialogOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [reportData, entriesData, materialsData] = await Promise.all([
        fetchServiceReport(ticketId),
        fetchTimeEntries(ticketId),
        fetchTicketMaterials(ticketId),
      ])
      setReport(reportData)
      setEntries(entriesData)
      setMaterials(materialsData)
      if (reportData) {
        setDescription(reportData.description ?? "")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden")
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Reload when timer stopped
  React.useEffect(() => {
    if (timerStoppedVersion > 0) {
      loadData()
    }
  }, [timerStoppedVersion, loadData])

  async function handleCreate() {
    setIsCreating(true)
    try {
      const newReport = await createServiceReport(ticketId, {
        description: "",
      })
      setReport(newReport)
      setDescription("")
      toast.success("Einsatzbericht als Entwurf angelegt")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Bericht konnte nicht erstellt werden"
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function handleSaveDraft() {
    setIsSaving(true)
    try {
      const updated = await updateServiceReport(ticketId, {
        description: description.trim(),
      })
      setReport(updated)
      toast.success("Entwurf gespeichert")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Entwurf konnte nicht gespeichert werden"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleFinalize(data: FinalizeData) {
    try {
      // Save description first, then finalize with signature data
      await updateServiceReport(ticketId, {
        description: description.trim(),
      })
      const finalized = await finalizeServiceReport(ticketId, data)
      setReport(finalized)
      setShowSignatureDialog(false)
      toast.success("Einsatzbericht finalisiert")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Bericht konnte nicht finalisiert werden"
      )
    }
  }

  function handleUnlocked() {
    loadData()
  }

  const isClosed = ticketStatus === "closed"
  const grouped = groupTimeEntries(entries)

  // Loading
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Einsatzbericht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Einsatzbericht</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadData} variant="outline" size="sm" className="mt-2">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No report yet — show create button
  if (report === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Einsatzbericht</CardTitle>
          <CardDescription>
            Noch kein Einsatzbericht fuer dieses Ticket vorhanden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isClosed && (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Bericht anlegen
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Report exists
  const isDraft = report!.status === "draft"
  const isCompleted = report!.status === "completed"

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Einsatzbericht</CardTitle>
            <Badge
              variant="outline"
              className={
                isDraft
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              }
            >
              {isDraft ? "Entwurf" : "Abgeschlossen"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {isDraft ? (
            <div className="space-y-2">
              <Label htmlFor="report-description">
                Arbeitsbeschreibung (Kundenbericht)
              </Label>
              <Textarea
                id="report-description"
                placeholder="Beschreiben Sie die durchgefuehrten Arbeiten..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Arbeitsbeschreibung
              </p>
              <p className="whitespace-pre-wrap text-sm">
                {report!.description || "Keine Beschreibung"}
              </p>
            </div>
          )}

          <Separator />

          {/* Grouped time entries summary */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Zeiteintraege
            </p>
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine abgeschlossenen Zeiteintraege.
              </p>
            ) : (
              <div className="space-y-2">
                {grouped.map((group) => (
                  <div
                    key={group.workType}
                    className="rounded-lg border"
                  >
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        {WORK_TYPE_ICONS[group.workType]}
                        <span className="text-sm font-medium">
                          {WORK_TYPE_LABELS[group.workType]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({group.entries.length}{" "}
                          {group.entries.length === 1 ? "Eintrag" : "Eintraege"})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">
                          {formatMinutes(group.totalMinutes)}
                        </span>
                        {group.workType === "travel" && (
                          <span className="font-medium">
                            {group.totalKm.toLocaleString("de-DE")} km
                          </span>
                        )}
                      </div>
                    </div>
                    {group.workType === "travel" && group.entries.length > 0 && (
                      <div className="border-t px-3 pb-3 pt-2">
                        {group.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between py-1 text-xs text-muted-foreground"
                          >
                            <span>
                              {new Date(entry.startedAt).toLocaleDateString("de-DE")}{" "}
                              {new Date(entry.startedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                              {" – "}
                              {entry.stoppedAt
                                ? new Date(entry.stoppedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                                : "–"}
                            </span>
                            <div className="flex items-center gap-3">
                              <span>{formatMinutes(entry.billableMinutes ?? 0)}</span>
                              <span className="font-medium text-foreground">
                                {(entry.distanceKm ?? 0).toLocaleString("de-DE")} km
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Materials summary */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Materialien
            </p>
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Materialien erfasst.
              </p>
            ) : (
              <div className="space-y-1">
                {materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {mat.quantity}x {mat.name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatEur(
                        calculateGross(
                          mat.unitPriceNet,
                          mat.quantity,
                          mat.vatRateSnapshot
                        )
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature display for completed reports */}
          {isCompleted && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Unterschrift
                </p>
                {report!.signatureRefused ? (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300">
                      <Ban className="h-4 w-4" />
                      Unterschrift verweigert
                    </div>
                    <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                      Grund: {report!.refusalReason}
                    </p>
                    {report!.signedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(report!.signedAt).toLocaleDateString("de-DE")}{" "}
                        {new Date(report!.signedAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                ) : report!.signatureData ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border bg-white p-2">
                      <img
                        src={report!.signatureData}
                        alt={`Unterschrift von ${report!.signerName}`}
                        className="mx-auto h-auto max-h-[150px] w-auto max-w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{report!.signerName}</span>
                      {report!.signedAt && (
                        <span className="text-muted-foreground">
                          {new Date(report!.signedAt).toLocaleDateString("de-DE")}{" "}
                          {new Date(report!.signedAt).toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Keine Unterschrift vorhanden.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          {isDraft && !isClosed && (
            <>
              <Separator />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Entwurf speichern
                </Button>
                <Button
                  onClick={() => setShowSignatureDialog(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Bericht finalisieren
                </Button>
              </div>
            </>
          )}

          {/* Admin unlock */}
          {isCompleted && isAdmin && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlockDialogOpen(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Bericht entsperren
                </Button>
                <span className="text-xs text-muted-foreground">
                  Nur fuer Admins sichtbar
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Signature dialog (replaces the old AlertDialog confirmation) */}
      <SignatureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onConfirm={handleFinalize}
      />

      {/* Unlock dialog */}
      <ServiceReportUnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        ticketId={ticketId}
        onUnlocked={handleUnlocked}
      />
    </>
  )
}
