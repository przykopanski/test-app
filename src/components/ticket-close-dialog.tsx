"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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

import type { TicketCloseValues } from "@/lib/tickets"
import { ticketCloseSchema } from "@/lib/tickets"

interface TicketCloseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketNumber: number
  onConfirm: (closingNote: string) => Promise<void>
  hasOnsiteEntries?: boolean
  hasCompletedReport?: boolean
}

export function TicketCloseDialog({
  open,
  onOpenChange,
  ticketNumber,
  onConfirm,
  hasOnsiteEntries = false,
  hasCompletedReport = false,
}: TicketCloseDialogProps) {
  const showReportWarning = hasOnsiteEntries && !hasCompletedReport
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<TicketCloseValues>({
    resolver: zodResolver(ticketCloseSchema),
    defaultValues: {
      closingNote: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({ closingNote: "" })
    }
  }, [open, form])

  async function handleSubmit(data: TicketCloseValues) {
    setIsSubmitting(true)
    try {
      await onConfirm(data.closingNote)
      onOpenChange(false)
    } catch {
      // Error handling done by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ticket #{ticketNumber} schliessen?</DialogTitle>
          <DialogDescription>
            Bitte hinterlassen Sie eine Abschlussnotiz. Diese kann nach dem
            Speichern nicht mehr bearbeitet werden.
          </DialogDescription>
        </DialogHeader>

        {showReportWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Es gibt Vor-Ort-Zeiteintraege, aber kein finalisierter
              Einsatzbericht. Bitte erstellen und finalisieren Sie den Bericht,
              bevor Sie das Ticket schliessen.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="closingNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abschlussnotiz *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zusammenfassung der durchgefuehrten Arbeiten..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting || showReportWarning}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Ticket schliessen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
