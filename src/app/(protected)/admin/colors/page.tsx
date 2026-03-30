"use client"

import * as React from "react"
import { Check, RotateCcw, Save, Loader2 } from "lucide-react"

import { RoleGuard } from "@/components/role-guard"
import { useColorSettings } from "@/hooks/useColorSettings"
import { apiFetch } from "@/lib/auth"
import type { TicketStatus, TicketPriority } from "@/lib/tickets"
import { STATUS_LABELS, ALL_STATUSES, PRIORITY_LABELS, ALL_PRIORITIES } from "@/lib/tickets"
import {
  ALL_COLOR_TOKENS,
  COLOR_TOKEN_LABELS,
  COLOR_BADGE_CLASSES,
  COLOR_SWATCH_CLASSES,
  DEFAULT_STATUS_COLORS,
  DEFAULT_PRIORITY_COLORS,
  statusColorKey,
  priorityColorKey,
  type ColorToken,
} from "@/lib/ticket-colors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { toast } from "sonner"

// --- Color Palette Picker ---

interface ColorPaletteProps {
  selected: ColorToken
  onSelect: (token: ColorToken) => void
}

function ColorPalette({ selected, onSelect }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_COLOR_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => onSelect(token)}
          className={`relative h-8 w-8 rounded-full transition-all ${COLOR_SWATCH_CLASSES[token]} ${
            selected === token
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : "hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-1 hover:ring-offset-background"
          }`}
          aria-label={`Farbe ${COLOR_TOKEN_LABELS[token]} auswaehlen`}
          title={COLOR_TOKEN_LABELS[token]}
        >
          {selected === token && (
            <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
          )}
        </button>
      ))}
    </div>
  )
}

// --- Color Row ---

interface ColorRowProps {
  label: string
  colorToken: ColorToken
  onColorChange: (token: ColorToken) => void
}

function ColorRow({ label, colorToken, onColorChange }: ColorRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-[160px] items-center gap-3">
        <Badge variant="outline" className={COLOR_BADGE_CLASSES[colorToken]}>
          {label}
        </Badge>
      </div>
      <ColorPalette selected={colorToken} onSelect={onColorChange} />
    </div>
  )
}

// --- Main Page Content ---

function ColorsPageContent() {
  const { statusColors, priorityColors, isLoading, error, refetch } = useColorSettings()
  const [localStatusColors, setLocalStatusColors] = React.useState<Record<TicketStatus, ColorToken> | null>(null)
  const [localPriorityColors, setLocalPriorityColors] = React.useState<Record<TicketPriority, ColorToken> | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isResettingStatus, setIsResettingStatus] = React.useState(false)
  const [isResettingPriority, setIsResettingPriority] = React.useState(false)

  // Initialize local state from loaded settings
  React.useEffect(() => {
    if (!isLoading) {
      setLocalStatusColors({ ...statusColors })
      setLocalPriorityColors({ ...priorityColors })
    }
  }, [isLoading, statusColors, priorityColors])

  const hasChanges = React.useMemo(() => {
    if (!localStatusColors || !localPriorityColors) return false
    for (const s of ALL_STATUSES) {
      if (localStatusColors[s] !== statusColors[s]) return true
    }
    for (const p of ALL_PRIORITIES) {
      if (localPriorityColors[p] !== priorityColors[p]) return true
    }
    return false
  }, [localStatusColors, localPriorityColors, statusColors, priorityColors])

  const handleSave = async () => {
    if (!localStatusColors || !localPriorityColors) return
    setIsSaving(true)
    try {
      // Save all color settings via individual PUT calls
      const promises: Promise<Response>[] = []
      for (const s of ALL_STATUSES) {
        promises.push(
          apiFetch(`/admin/settings/${statusColorKey(s)}`, {
            method: "PUT",
            body: JSON.stringify({ value: localStatusColors[s] }),
          })
        )
      }
      for (const p of ALL_PRIORITIES) {
        promises.push(
          apiFetch(`/admin/settings/${priorityColorKey(p)}`, {
            method: "PUT",
            body: JSON.stringify({ value: localPriorityColors[p] }),
          })
        )
      }

      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        throw new Error(`${failed.length} Einstellungen konnten nicht gespeichert werden`)
      }

      toast.success("Farbeinstellungen gespeichert")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetStatus = async () => {
    setIsResettingStatus(true)
    try {
      const promises = ALL_STATUSES.map((s) =>
        apiFetch(`/admin/settings/${statusColorKey(s)}`, {
          method: "PUT",
          body: JSON.stringify({ value: DEFAULT_STATUS_COLORS[s] }),
        })
      )
      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) throw new Error("Zuruecksetzen fehlgeschlagen")

      setLocalStatusColors({ ...DEFAULT_STATUS_COLORS })
      toast.success("Status-Farben auf Standard zurueckgesetzt")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Zuruecksetzen")
    } finally {
      setIsResettingStatus(false)
    }
  }

  const handleResetPriority = async () => {
    setIsResettingPriority(true)
    try {
      const promises = ALL_PRIORITIES.map((p) =>
        apiFetch(`/admin/settings/${priorityColorKey(p)}`, {
          method: "PUT",
          body: JSON.stringify({ value: DEFAULT_PRIORITY_COLORS[p] }),
        })
      )
      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) throw new Error("Zuruecksetzen fehlgeschlagen")

      setLocalPriorityColors({ ...DEFAULT_PRIORITY_COLORS })
      toast.success("Prioritaets-Farben auf Standard zurueckgesetzt")
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Zuruecksetzen")
    } finally {
      setIsResettingPriority(false)
    }
  }

  // Loading state
  if (isLoading || !localStatusColors || !localPriorityColors) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // Error state (still show UI with defaults)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Farbkonfiguration</h1>
        <p className="text-muted-foreground">
          Farben fuer Ticket-Status und -Prioritaet anpassen
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error} -- Es werden Standardfarben angezeigt.
        </div>
      )}

      {/* Ticket Status Section */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Ticket-Status</CardTitle>
            <CardDescription>
              Farben fuer die verschiedenen Ticket-Status konfigurieren
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isResettingStatus}>
                {isResettingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Zuruecksetzen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Status-Farben zuruecksetzen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Alle Status-Farben werden auf die Standardwerte zurueckgesetzt. Diese Aktion kann nicht rueckgaengig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetStatus}>
                  Zuruecksetzen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_STATUSES.map((status) => (
            <ColorRow
              key={status}
              label={STATUS_LABELS[status]}
              colorToken={localStatusColors[status]}
              onColorChange={(token) =>
                setLocalStatusColors((prev) => (prev ? { ...prev, [status]: token } : prev))
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Ticket Priority Section */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Ticket-Prioritaet</CardTitle>
            <CardDescription>
              Farben fuer die verschiedenen Ticket-Prioritaeten konfigurieren
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isResettingPriority}>
                {isResettingPriority ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Zuruecksetzen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Prioritaets-Farben zuruecksetzen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Alle Prioritaets-Farben werden auf die Standardwerte zurueckgesetzt. Diese Aktion kann nicht rueckgaengig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetPriority}>
                  Zuruecksetzen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_PRIORITIES.map((priority) => (
            <ColorRow
              key={priority}
              label={PRIORITY_LABELS[priority]}
              colorToken={localPriorityColors[priority]}
              onColorChange={(token) =>
                setLocalPriorityColors((prev) => (prev ? { ...prev, [priority]: token } : prev))
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="lg">
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  )
}

export default function ColorsPage() {
  return (
    <RoleGuard roles="admin">
      <ColorsPageContent />
    </RoleGuard>
  )
}
