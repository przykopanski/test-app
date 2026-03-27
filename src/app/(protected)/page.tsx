"use client"

import { useAuth } from "@/components/auth-provider"
import { ROLE_LABELS } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, Clock, Users, Building2 } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()

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
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Wird mit PROJ-3 verfügbar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Heutige Zeiten</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Wird mit PROJ-4 verfügbar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Wird mit PROJ-2 verfügbar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Benutzer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">3 aktiv, 1 deaktiviert</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
