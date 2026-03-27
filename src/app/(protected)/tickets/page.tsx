"use client"

import * as React from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Ticket as TicketIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
} from "lucide-react"
import { toast } from "sonner"

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
import { TicketFormSheet } from "@/components/ticket-form-sheet"
import { StartTimerDialog } from "@/components/start-timer-dialog"
import { useTimer } from "@/components/timer-context"
import { useAuth } from "@/components/auth-provider"

import type {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketFilterParams,
  TicketFormValues,
} from "@/lib/tickets"
import {
  fetchTickets,
  createTicket,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  ALL_PRIORITIES,
  ALL_STATUSES,
} from "@/lib/tickets"
import { fetchCustomers } from "@/lib/customers"
import { fetchActiveUsers } from "@/lib/tickets"
import type { Customer } from "@/lib/customers"
import type { User } from "@/lib/auth"

const PAGE_SIZE = 20

type SortField = "createdAt" | "priority" | "status"
type SortOrder = "ASC" | "DESC"

export default function TicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Filters
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<TicketStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = React.useState<TicketPriority | "all">("all")
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("all")
  const [customerFilter, setCustomerFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)
  const [sortBy, setSortBy] = React.useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("DESC")

  // Dropdown data
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [users, setUsers] = React.useState<User[]>([])

  const [formOpen, setFormOpen] = React.useState(false)

  // Timer (PROJ-4)
  const { activeTimer } = useTimer()
  const { hasRole } = useAuth()
  const isTechnician = hasRole("technician")
  const [timerDialogTicket, setTimerDialogTicket] = React.useState<{ id: string; subject: string } | null>(null)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, assigneeFilter, customerFilter])

  // Load dropdown data once
  React.useEffect(() => {
    Promise.all([
      fetchCustomers({ status: "active" }).catch(() => []),
      fetchActiveUsers().catch(() => []),
    ]).then(([c, u]) => {
      setCustomers(c)
      setUsers(u)
    })
  }, [])

  // Fetch tickets
  const loadTickets = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: TicketFilterParams = {
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
      }
      if (statusFilter !== "all") params.status = statusFilter
      if (priorityFilter !== "all") params.priority = priorityFilter
      if (assigneeFilter !== "all") params.assigneeId = assigneeFilter
      if (customerFilter !== "all") params.customerId = customerFilter
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

      const result = await fetchTickets(params)
      setTickets(result.data)
      setTotalCount(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, priorityFilter, assigneeFilter, customerFilter, debouncedSearch, sortBy, sortOrder])

  React.useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Create ticket handler
  async function handleCreateTicket(data: TicketFormValues) {
    try {
      await createTicket(data)
      toast.success("Ticket wurde erstellt.")
      loadTickets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ticket konnte nicht erstellt werden")
      throw err
    }
  }

  // Sort handler
  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(field)
      setSortOrder(field === "createdAt" ? "DESC" : "ASC")
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3" />
    return sortOrder === "ASC" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Loading state
  if (isLoading && tickets.length === 0) {
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
  if (error && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadTickets} variant="outline">
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
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? "Ticket" : "Tickets"}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Ticket
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Betreff oder Beschreibung durchsuchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Tickets durchsuchen"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Status-Filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Prioritaets-Filter">
            <SelectValue placeholder="Prioritaet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Prioritaeten</SelectItem>
            {ALL_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={assigneeFilter}
          onValueChange={setAssigneeFilter}
        >
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Techniker-Filter">
            <SelectValue placeholder="Techniker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Techniker</SelectItem>
            <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={customerFilter}
          onValueChange={setCustomerFilter}
        >
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Kunden-Filter">
            <SelectValue placeholder="Kunde" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kunden</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {totalCount === 0 && !debouncedSearch && statusFilter === "all" && priorityFilter === "all" && assigneeFilter === "all" && customerFilter === "all" ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <TicketIcon className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Keine Tickets vorhanden</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Erstellen Sie Ihr erstes Ticket, um loszulegen.
          </p>
          <Button onClick={() => setFormOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Erstes Ticket erstellen
          </Button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Keine Treffer</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Keine Tickets fuer die aktuellen Filter gefunden.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Betreff</TableHead>
                  <TableHead className="hidden md:table-cell">Kunde</TableHead>
                  <TableHead className="w-[100px]">
                    <button
                      onClick={() => handleSort("priority")}
                      className="inline-flex items-center font-medium hover:text-foreground"
                      aria-label="Nach Prioritaet sortieren"
                    >
                      Prioritaet
                      <SortIcon field="priority" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <button
                      onClick={() => handleSort("status")}
                      className="inline-flex items-center font-medium hover:text-foreground"
                      aria-label="Nach Status sortieren"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Zustaendig</TableHead>
                  <TableHead className="hidden sm:table-cell w-[100px]">
                    <button
                      onClick={() => handleSort("createdAt")}
                      className="inline-flex items-center font-medium hover:text-foreground"
                      aria-label="Nach Datum sortieren"
                    >
                      Datum
                      <SortIcon field="createdAt" />
                    </button>
                  </TableHead>
                  {isTechnician && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      #{ticket.ticketNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {ticket.customer?.status === "inactive"
                        ? `${ticket.customer.name} [archiviert]`
                        : ticket.customer?.name ?? "--"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={PRIORITY_COLORS[ticket.priority]}
                      >
                        {PRIORITY_LABELS[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[ticket.status]}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {ticket.assignee
                        ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                        : "Nicht zugewiesen"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </TableCell>
                    {isTechnician && (
                      <TableCell>
                        {ticket.status !== "closed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault()
                              setTimerDialogTicket({ id: ticket.id, subject: ticket.subject })
                            }}
                            disabled={!!activeTimer}
                            aria-label={`Timer starten fuer ${ticket.subject}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
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
      <TicketFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateTicket}
      />

      {/* Start timer dialog (PROJ-4) */}
      {timerDialogTicket && (
        <StartTimerDialog
          open={!!timerDialogTicket}
          onOpenChange={(open) => !open && setTimerDialogTicket(null)}
          ticketId={timerDialogTicket.id}
          ticketSubject={timerDialogTicket.subject}
        />
      )}
    </div>
  )
}
