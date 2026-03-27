"use client"

import * as React from "react"
import { z } from "zod/v4"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Check } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { ROLE_LABELS, apiFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
    newPassword: z.string().min(8, "Mindestens 8 Zeichen"),
    confirmPassword: z.string().min(1, "Passwort bestätigen"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: PasswordFormValues) {
    setIsSubmitting(true)
    setSuccess(false)
    setError(null)

    try {
      const res = await apiFetch("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.message ?? "Passwort konnte nicht geändert werden")
        return
      }

      setSuccess(true)
      form.reset()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError("Verbindung zum Server fehlgeschlagen")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mein Profil</h1>
        <p className="text-muted-foreground">
          Kontoinformationen und Passwort verwalten
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontoinformationen</CardTitle>
          <CardDescription>
            Ihre persönlichen Daten. Änderungen können nur durch einen Admin vorgenommen werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Vorname
              </label>
              <p className="text-sm">{user.firstName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Nachname
              </label>
              <p className="text-sm">{user.lastName}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              E-Mail
            </label>
            <p className="text-sm">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Rolle
            </label>
            <div className="mt-1">
              <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>
            Geben Sie Ihr aktuelles Passwort und ein neues Passwort ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aktuelles Passwort</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Neues Passwort</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Neues Passwort bestätigen</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Passwort ändern
                </Button>
                {success && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Passwort geändert
                  </span>
                )}
                {error && (
                  <span className="text-sm text-destructive">{error}</span>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
