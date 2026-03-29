"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

import type { VatRate, TicketMaterial, MaterialFormValues } from "@/lib/materials"
import {
  materialFormSchema,
  calculateGross,
  formatEur,
  fetchActiveVatRates,
} from "@/lib/materials"

interface MaterialFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MaterialFormValues) => Promise<void>
  material?: TicketMaterial | null
}

export function MaterialFormDialog({
  open,
  onOpenChange,
  onSubmit,
  material,
}: MaterialFormDialogProps) {
  const isEditing = !!material
  const [vatRates, setVatRates] = React.useState<VatRate[]>([])
  const [vatRatesLoading, setVatRatesLoading] = React.useState(true)
  const [vatRatesError, setVatRatesError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      unitPriceNet: 0,
      vatRateId: "",
    },
  })

  // Load active VAT rates when dialog opens
  React.useEffect(() => {
    if (!open) return

    async function loadVatRates() {
      setVatRatesLoading(true)
      setVatRatesError(null)
      try {
        const rates = await fetchActiveVatRates()

        // When editing, if the material's VAT rate was deactivated,
        // include it in the list so the dropdown shows the old selection
        if (material?.vatRateId) {
          const hasCurrentRate = rates.some((r) => r.id === material.vatRateId)
          if (!hasCurrentRate) {
            rates.push({
              id: material.vatRateId,
              label: `${material.vatRateLabel} (deaktiviert)`,
              rate: material.vatRateSnapshot,
              isActive: false,
            })
          }
        }

        setVatRates(rates)
      } catch (err) {
        setVatRatesError(err instanceof Error ? err.message : "Fehler beim Laden der MwSt.-Saetze")
      } finally {
        setVatRatesLoading(false)
      }
    }

    loadVatRates()
  }, [open, material])

  // Reset form when dialog opens / material changes
  React.useEffect(() => {
    if (!open) return

    if (material) {
      form.reset({
        name: material.name,
        quantity: material.quantity,
        unitPriceNet: material.unitPriceNet,
        vatRateId: material.vatRateId ?? "",
      })
    } else {
      form.reset({
        name: "",
        quantity: 1,
        unitPriceNet: 0,
        vatRateId: "",
      })
    }
  }, [open, material, form])

  // Live gross calculation
  const watchedQuantity = form.watch("quantity")
  const watchedUnitPrice = form.watch("unitPriceNet")
  const watchedVatRateId = form.watch("vatRateId")

  const selectedVatRate = vatRates.find((r) => r.id === watchedVatRateId)
  const vatRateValue = selectedVatRate?.rate ?? (material?.vatRateSnapshot ?? 0)

  const grossPreview = calculateGross(
    Number(watchedUnitPrice) || 0,
    Number(watchedQuantity) || 0,
    vatRateValue
  )

  async function handleSubmit(data: MaterialFormValues) {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch {
      // Error handling done in parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const noVatRates = !vatRatesLoading && !vatRatesError && vatRates.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Material bearbeiten" : "Material hinzufuegen"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Materialeintrag aktualisieren."
              : "Neues Material zu diesem Ticket hinzufuegen."}
          </DialogDescription>
        </DialogHeader>

        {vatRatesError && (
          <Alert variant="destructive">
            <AlertDescription>{vatRatesError}</AlertDescription>
          </Alert>
        )}

        {noVatRates && (
          <Alert>
            <AlertDescription>
              Keine MwSt.-Saetze konfiguriert. Bitte Admin kontaktieren.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Artikelname */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artikelname</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="z.B. Netzwerkkabel Cat6"
                      {...field}
                      aria-label="Artikelname"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Menge + Einzelpreis in row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menge</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={9999}
                        step={1}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || "")}
                        aria-label="Menge"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPriceNet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Einzelpreis netto (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={999999.99}
                        step={0.01}
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value.replace(",", ".")
                          field.onChange(val === "" ? "" : parseFloat(val))
                        }}
                        aria-label="Einzelpreis netto in Euro"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* MwSt.-Satz */}
            <FormField
              control={form.control}
              name="vatRateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MwSt.-Satz</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={vatRatesLoading || noVatRates}
                  >
                    <FormControl>
                      <SelectTrigger aria-label="MwSt.-Satz auswaehlen">
                        <SelectValue
                          placeholder={
                            vatRatesLoading
                              ? "Laden..."
                              : "MwSt.-Satz waehlen"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vatRates.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.label} ({rate.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gross preview */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Brutto-Gesamtpreis</span>
                <span className="text-lg font-semibold">
                  {formatEur(grossPreview)}
                </span>
              </div>
              {selectedVatRate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatEur(Number(watchedUnitPrice) || 0)} x {Number(watchedQuantity) || 0} + {selectedVatRate.rate}% MwSt.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || noVatRates || vatRatesLoading}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Speichern" : "Hinzufuegen"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
