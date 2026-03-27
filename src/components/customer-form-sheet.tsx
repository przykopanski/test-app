"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

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

import type { Customer, CustomerFormValues } from "@/lib/customers"
import { customerFormSchema } from "@/lib/customers"

interface CustomerFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSubmit: (data: CustomerFormValues) => Promise<void>
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isEditing = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      customerNumber: "",
      street: "",
      city: "",
      zip: "",
      country: "",
      phone: "",
      email: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    if (open && customer) {
      form.reset({
        name: customer.name,
        customerNumber: customer.customerNumber ?? "",
        street: customer.street ?? "",
        city: customer.city ?? "",
        zip: customer.zip ?? "",
        country: customer.country ?? "",
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        notes: customer.notes ?? "",
      })
    } else if (open && !customer) {
      form.reset({
        name: "",
        customerNumber: "",
        street: "",
        city: "",
        zip: "",
        country: "",
        phone: "",
        email: "",
        notes: "",
      })
    }
  }, [open, customer, form])

  async function handleSubmit(data: CustomerFormValues) {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
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
            {isEditing ? "Kunde bearbeiten" : "Neuen Kunden anlegen"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Kundendaten aktualisieren."
              : "Erfassen Sie die Daten des neuen Kunden."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 px-4 pb-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Firmenname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kundennummer</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. K-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Adresse</p>
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Strasse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="PLZ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Ort" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Land" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input placeholder="+49 ..." type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl>
                    <Input placeholder="info@firma.de" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notizen</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Interne Notizen zum Kunden..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
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
                {isEditing ? "Speichern" : "Anlegen"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
