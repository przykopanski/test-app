"use client"

import * as React from "react"
import Link from "next/link"
import {
  Building2,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomerFormSheet } from "@/components/customer-form-sheet"

import type { Customer, CustomerFormValues } from "@/lib/customers"
import { fetchCustomers, createCustomer } from "@/lib/customers"

const PAGE_SIZE = 20

export default function CustomersPage() {
  const { hasRole } = useAuth()
  const canWrite = hasRole(["office", "admin"])

  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"active" | "all">("active")
  const [page, setPage] = React.useState(1)

  const [formOpen, setFormOpen] = React.useState(false)

  // Fetch customers
  const loadCustomers = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCustomers({ status: statusFilter })
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Client-side search filtering
  const filtered = React.useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customerNumber && c.customerNumber.toLowerCase().includes(q))
    )
  }, [customers, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when search/filter changes
  React.useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  // Create customer handler
  async function handleCreateCustomer(data: CustomerFormValues) {
    const created = await createCustomer(data)
    setCustomers((prev) => [created, ...prev])
    toast.success(`Kunde "${created.name}" wurde angelegt.`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Kunden</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadCustomers} variant="outline">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kunden</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "Kunde" : "Kunden"}
            {statusFilter === "all" ? " (inkl. archivierte)" : ""}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kunde
          </Button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nach Name oder Kundennummer suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Kunden durchsuchen"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "active" | "all")}
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Status-Filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Nur aktive</SelectItem>
            <SelectItem value="all">Alle anzeigen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Keine Kunden vorhanden</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Legen Sie Ihren ersten Kunden an, um loszulegen.
          </p>
          {canWrite && (
            <Button onClick={() => setFormOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Ersten Kunden anlegen
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Keine Treffer</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fuer &quot;{search}&quot; wurden keine Kunden gefunden.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Kundennr.</TableHead>
                  <TableHead className="hidden md:table-cell">Ort</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefon</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {customer.customerNumber || "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {customer.city || "--"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {customer.phone || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={customer.status === "active" ? "default" : "secondary"}
                      >
                        {customer.status === "active" ? "Aktiv" : "Archiviert"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Seite {page} von {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Vorherige Seite"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Naechste Seite"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create form */}
      <CustomerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateCustomer}
      />
    </div>
  )
}
