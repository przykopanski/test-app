"use client"

import * as React from "react"
import { z } from "zod/v4"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Pencil } from "lucide-react"

import { RoleGuard } from "@/components/role-guard"
import { ROLE_LABELS, apiFetch } from "@/lib/auth"
import type { User, UserRole } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const createUserSchema = z.object({
  email: z.email("Bitte gültige E-Mail-Adresse eingeben"),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  role: z.enum(["admin", "technician", "office"]),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

const editUserSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  role: z.enum(["admin", "technician", "office"]),
  isActive: z.boolean(),
})

type EditUserFormValues = z.infer<typeof editUserSchema>

function roleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default"
    case "technician":
      return "secondary"
    case "office":
      return "outline"
  }
}

function CreateUserDialog({
  onCreated,
}: {
  onCreated: (user: User) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "technician",
      password: "",
    },
  })

  async function onSubmit(values: CreateUserFormValues) {
    setIsSubmitting(true)
    try {
      const res = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        alert(body?.message ?? "Fehler beim Erstellen")
        return
      }
      const newUser = await res.json()
      onCreated(newUser)
      setOpen(false)
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Benutzer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
          <DialogDescription>
            Erstellen Sie ein neues Benutzerkonto mit einer Rolle.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Nachname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rolle</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="technician">Techniker</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initialpasswort</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Erstellen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  onUpdated,
}: {
  user: User
  onUpdated: (user: User) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      })
    }
  }, [open, user, form])

  async function onSubmit(values: EditUserFormValues) {
    setIsSubmitting(true)
    try {
      // Deaktivierung separat behandeln
      if (!values.isActive && user.isActive) {
        const deactivateRes = await apiFetch(`/users/${user.id}/deactivate`, {
          method: "POST",
        })
        if (!deactivateRes.ok) {
          const body = await deactivateRes.json().catch(() => null)
          alert(body?.message ?? "Fehler beim Deaktivieren")
          return
        }
      }

      const res = await apiFetch(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          role: values.role,
          ...(values.isActive !== user.isActive ? { isActive: values.isActive } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        alert(body?.message ?? "Fehler beim Speichern")
        return
      }
      const updated = await res.json()
      onUpdated(updated)
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Daten von {user.firstName} {user.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Nachname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rolle</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="technician">Techniker</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <FormLabel className="text-base">Aktiv</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Deaktivierte Benutzer können sich nicht anmelden
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function UserTable() {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadUsers() {
      try {
        const res = await apiFetch("/users")
        if (res.ok) {
          setUsers(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])

  function handleCreated(user: User) {
    setUsers((prev) => [user, ...prev])
  }

  function handleUpdated(updated: User) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? updated : u))
    )
  }

  if (loading) {
    return <div className="flex justify-center p-8">Laden...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Benutzerverwaltung
          </h1>
          <p className="text-muted-foreground">
            Benutzer anlegen, bearbeiten und deaktivieren
          </p>
        </div>
        <CreateUserDialog onCreated={handleCreated} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className={!user.isActive ? "opacity-60" : ""}
              >
                <TableCell className="font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant(user.role)}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.isActive ? "secondary" : "destructive"}
                  >
                    {user.isActive ? "Aktiv" : "Deaktiviert"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <EditUserDialog user={user} onUpdated={handleUpdated} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <RoleGuard roles="admin">
      <UserTable />
    </RoleGuard>
  )
}
