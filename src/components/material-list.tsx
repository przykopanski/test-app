"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, AlertCircle, Package, Loader2, Info } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { MaterialFormDialog } from "@/components/material-form-dialog"
import type { TicketMaterial, MaterialFormValues } from "@/lib/materials"
import {
  fetchTicketMaterials,
  createTicketMaterial,
  updateTicketMaterial,
  deleteTicketMaterial,
  calculateGross,
  formatEur,
} from "@/lib/materials"

interface MaterialListProps {
  ticketId: string
  ticketStatus: string
}

export function MaterialList({ ticketId, ticketStatus }: MaterialListProps) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole("admin")
  const isClosed = ticketStatus === "closed"

  // Permissions
  const canAdd = !isClosed || isAdmin
  const canEdit = !isClosed || isAdmin
  const canDelete = isAdmin

  const [materials, setMaterials] = React.useState<TicketMaterial[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false)
  const [editMaterial, setEditMaterial] = React.useState<TicketMaterial | null>(null)

  // Delete state
  const [deleteMaterial, setDeleteMaterial] = React.useState<TicketMaterial | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const loadMaterials = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchTicketMaterials(ticketId)
      setMaterials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  React.useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  // Add material
  async function handleAdd(data: MaterialFormValues) {
    try {
      await createTicketMaterial(ticketId, data)
      toast.success("Material wurde hinzugefuegt.")
      loadMaterials()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Hinzufuegen")
      throw err
    }
  }

  // Edit material
  async function handleEdit(data: MaterialFormValues) {
    if (!editMaterial) return
    try {
      await updateTicketMaterial(ticketId, editMaterial.id, data)
      toast.success("Material wurde aktualisiert.")
      setEditMaterial(null)
      loadMaterials()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Aktualisieren")
      throw err
    }
  }

  // Delete material
  async function handleDelete() {
    if (!deleteMaterial) return
    setIsDeleting(true)
    try {
      await deleteTicketMaterial(ticketId, deleteMaterial.id)
      toast.success("Material wurde geloescht.")
      setDeleteMaterial(null)
      loadMaterials()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Loeschen")
    } finally {
      setIsDeleting(false)
    }
  }

  function openEdit(material: TicketMaterial) {
    setEditMaterial(material)
    setFormOpen(true)
  }

  function openAdd() {
    setEditMaterial(null)
    setFormOpen(true)
  }

  // Calculate totals
  const totalNet = materials.reduce(
    (sum, m) => sum + m.unitPriceNet * m.quantity,
    0
  )
  const totalGross = materials.reduce(
    (sum, m) => sum + calculateGross(m.unitPriceNet, m.quantity, m.vatRateSnapshot),
    0
  )

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
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
          <CardTitle className="text-base">Material</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadMaterials} variant="outline" size="sm" className="mt-2">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Material</CardTitle>
              <CardDescription>
                {materials.length}{" "}
                {materials.length === 1 ? "Position" : "Positionen"}
                {totalGross > 0 && (
                  <span className="ml-2 font-medium text-foreground">
                    ({formatEur(totalGross)} brutto)
                  </span>
                )}
              </CardDescription>
            </div>
            {canAdd ? (
              <Button size="sm" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Material hinzufuegen
              </Button>
            ) : (
              isClosed && !isAdmin && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>Ticket geschlossen. Nur Admins koennen Material bearbeiten.</span>
                </div>
              )
            )}
          </div>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Noch kein Material erfasst.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artikel</TableHead>
                      <TableHead className="text-right">Menge</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">EP netto</TableHead>
                      <TableHead className="hidden md:table-cell">MwSt.</TableHead>
                      <TableHead className="text-right">Brutto gesamt</TableHead>
                      {(canEdit || canDelete) && (
                        <TableHead className="w-[80px]">Aktionen</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => {
                      const gross = calculateGross(
                        material.unitPriceNet,
                        material.quantity,
                        material.vatRateSnapshot
                      )
                      return (
                        <TableRow key={material.id}>
                          <TableCell className="text-sm font-medium">
                            {material.name}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {material.quantity}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-right tabular-nums">
                            {formatEur(material.unitPriceNet)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {material.vatRateLabel} ({material.vatRateSnapshot}%)
                          </TableCell>
                          <TableCell className="text-sm text-right font-medium tabular-nums">
                            {formatEur(gross)}
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell>
                              <div className="flex gap-1">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEdit(material)}
                                    aria-label={`${material.name} bearbeiten`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteMaterial(material)}
                                    aria-label={`${material.name} loeschen`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals footer */}
              <div className="mt-3 flex justify-end">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-muted-foreground">Netto gesamt:</span>
                    <span className="tabular-nums">{formatEur(totalNet)}</span>
                  </div>
                  <div className="flex justify-between gap-8 font-semibold">
                    <span>Brutto gesamt:</span>
                    <span className="tabular-nums">{formatEur(totalGross)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <MaterialFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditMaterial(null)
        }}
        onSubmit={editMaterial ? handleEdit : handleAdd}
        material={editMaterial}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteMaterial}
        onOpenChange={(open) => !open && setDeleteMaterial(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Material loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteMaterial?.name}&quot; wird unwiderruflich geloescht. Dieser Vorgang kann nicht rueckgaengig gemacht werden.
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
