"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { useTimer } from "@/components/timer-context"
import { ROLE_LABELS } from "@/lib/auth"
import { apiFetch } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, Clock, Users, Building2 } from "lucide-react"
import { fetchTickets } from "@/lib/tickets"
import { fetchCustomers } from "@/lib/customers"
import { fetchTodayTimeEntries } from "@/lib/time-entries"

interface DashboardStats {
  openTickets: number
  todayMinutes: number
  activeTimers: number
  customerCount: number
  userCount: number
  activeUsers: number
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeTimers, timerStoppedVersion } = useTimer()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!user) return
    try {
      const [ticketsRes, customers, todayEntries, usersRes] = await Promise.all([
        fetchTickets({ status: "open" }),
        fetchCustomers({ status: "active" }),
        fetchTodayTimeEntries(user.id),
        apiFetch("/users"),
      ])

      const allUsers = usersRes.ok ? await usersRes.json() : []
      const activeUsers = Array.isArray(allUsers) ? allUsers.filter((u: { isActive: boolean }) => u.isActive).length : 0

      const todayMinutes = todayEntries.reduce((sum, t) => {
        return sum + (t.billableMinutes ?? 0)
      }, 0)

      setStats({
        openTickets: ticketsRes.total,
        todayMinutes,
        activeTimers: activeTimers.length,
        customerCount: customers.length,
        userCount: Array.isArray(allUsers) ? allUsers.length : 0,
        activeUsers,
      })
    } catch {
      // silently fail, show --
    } finally {
      setLoading(false)
    }
  }, [user, activeTimers.length])

  useEffect(() => {
    loadStats()
  }, [loadStats, timerStoppedVersion])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Willkommen, {user.firstName}
        </h1>
        <p className="text-muted-foreground">
          Angemeldet als {ROLE_LABELS[user.role]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.openTickets ?? "--"}
            </div>
            <p className="text-xs text-muted-foreground">Offene und in Bearbeitung</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Heutige Zeiten</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats ? formatMinutes(stats.todayMinutes) : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.activeTimers > 0
                ? `${stats.activeTimers} Timer aktiv`
                : "Keine Timer aktiv"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.customerCount ?? "--"}
            </div>
            <p className="text-xs text-muted-foreground">Aktive Kunden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Benutzer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.userCount ?? "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.activeUsers} aktiv` : "--"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
