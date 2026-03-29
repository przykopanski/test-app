"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, AlertCircle, Loader2, Percent } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { RoleGuard } from "@/components/role-guard"
import type { VatRate, VatRateFormValues } from "@/lib/materials"
import {
  vatRateFormSchema,
  fetchAllVatRates,
  createVatRate,
  updateVatRate,
  deleteVatRate,
} from "@/lib/materials"

function VatRatesContent() {
  const [vatRates, setVatRates] = React.useState<VatRate[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editRate, setEditRate] = React.useState<VatRate | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<VatRateFormValues>({
    resolver: zodResolver(vatRateFormSchema),
    defaultValues: {
      label: "",
      rate: 0,
      isActive: true,
    },
  })

  const loadVatRates = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAllVatRates()
      setVatRates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadVatRates()
  }, [loadVatRates])

  function openAdd() {
    setEditRate(null)
    form.reset({ label: "", rate: 0, isActive: true })
    setDialogOpen(true)
  }

  function openEdit(rate: VatRate) {
    setEditRate(rate)
    form.reset({
      label: rate.label,
      rate: rate.rate,
      isActive: rate.isActive,
    })
    setDialogOpen(true)
  }

  async function handleSubmit(data: VatRateFormValues) {
    setIsSubmitting(true)
    try {
      if (editRate) {
        await updateVatRate(editRate.id, data)
        toast.success("MwSt.-Satz wurde aktualisiert.")
      } else {
        await createVatRate(data)
        toast.success("MwSt.-Satz wurde erstellt.")
      }
      setDialogOpen(false)
      loadVatRates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(rate: VatRate) {
    if (!confirm(`MwSt.-Satz "${rate.label}" wirklich loeschen?`)) return
    try {
      await deleteVatRate(rate.id)
      toast.success(`"${rate.label}" wurde geloescht.`)
      loadVatRates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Loeschen")
    }
  }

  // Quick toggle active/inactive
  async function handleToggleActive(rate: VatRate) {
    try {
      await updateVatRate(rate.id, { isActive: !rate.isActive })
      toast.success(
        rate.isActive
          ? `"${rate.label}" wurde deaktiviert.`
          : `"${rate.label}" wurde aktiviert.`
      )
      loadVatRates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Aendern")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MwSt.-Saetze</h1>
          <p className="text-muted-foreground">
            Verwalte die verfuegbaren Mehrwertsteuersaetze.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MwSt.-Saetze</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadVatRates} variant="outline">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MwSt.-Saetze</h1>
          <p className="text-muted-foreground">
            Verwalte die verfuegbaren Mehrwertsteuersaetze fuer Materialeintraege.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Satz hinzufuegen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alle MwSt.-Saetze</CardTitle>
          <CardDescription>
            {vatRates.length} {vatRates.length === 1 ? "Satz" : "Saetze"} konfiguriert
            {" "}({vatRates.filter((r) => r.isActive).length} aktiv)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vatRates.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Percent className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Noch keine MwSt.-Saetze konfiguriert.
              </p>
              <Button onClick={openAdd} variant="outline" size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Ersten Satz anlegen
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Prozentsatz</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">
                        {rate.label}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rate.rate}%
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rate.isActive}
                            onCheckedChange={() => handleToggleActive(rate)}
                            aria-label={`${rate.label} ${rate.isActive ? "deaktivieren" : "aktivieren"}`}
                          />
                          <Badge variant={rate.isActive ? "default" : "secondary"}>
                            {rate.isActive ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(rate)}
                            aria-label={`${rate.label} bearbeiten`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(rate)}
                            aria-label={`${rate.label} loeschen`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editRate ? "MwSt.-Satz bearbeiten" : "Neuer MwSt.-Satz"}
            </DialogTitle>
            <DialogDescription>
              {editRate
                ? "MwSt.-Satz aktualisieren."
                : "Neuen Mehrwertsteuersatz anlegen."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='z.B. "MwSt. 19%"'
                        {...field}
                        aria-label="MwSt.-Label"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prozentsatz (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        aria-label="Prozentsatz"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Aktiv</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Nur aktive Saetze erscheinen im Material-Formular.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Satz aktivieren"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editRate ? "Speichern" : "Erstellen"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VatRatesPage() {
  return (
    <RoleGuard roles={["admin"]}>
      <VatRatesContent />
    </RoleGuard>
  )
}
