"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

import type { Contact, ContactFormValues } from "@/lib/customers"
import { contactFormSchema } from "@/lib/customers"

interface ContactFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null
  onSubmit: (data: ContactFormValues) => Promise<void>
}

export function ContactFormSheet({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: ContactFormSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const isEditing = !!contact

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      position: "",
    },
  })

  React.useEffect(() => {
    if (open && contact) {
      form.reset({
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        position: contact.position ?? "",
      })
    } else if (open && !contact) {
      form.reset({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        position: "",
      })
    }
  }, [open, contact, form])

  async function handleSubmit(data: ContactFormValues) {
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
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditing
              ? "Ansprechpartner bearbeiten"
              : "Ansprechpartner hinzufuegen"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Kontaktdaten aktualisieren."
              : "Erfassen Sie die Daten des neuen Ansprechpartners."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 px-4 pb-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname *</FormLabel>
                    <FormControl>
                      <Input placeholder="Max" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nachname *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mustermann" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. IT-Leiter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <Input placeholder="max@firma.de" type="email" {...field} />
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
                {isEditing ? "Speichern" : "Hinzufuegen"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
