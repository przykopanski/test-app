"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Timer } from "lucide-react"

import type { AdminTechnicianSummary } from "@/lib/dashboard"
import { formatMinutes } from "@/lib/time-entries"

interface TechnicianCardProps {
  technician: AdminTechnicianSummary
  onClick: (userId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function TechnicianCard({ technician, onClick }: TechnicianCardProps) {
  const hasActiveTimers = technician.activeTimerCount > 0

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={() => onClick(technician.userId)}
      role="button"
      tabIndex={0}
      aria-label={`Tagesansicht von ${technician.displayName} oeffnen`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(technician.userId)
        }
      }}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">
            {getInitials(technician.displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {technician.displayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {technician.totalMinutesToday > 0
              ? formatMinutes(technician.totalMinutesToday)
              : "Noch keine Zeiten"}
          </p>
        </div>

        {hasActiveTimers && (
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-primary/50 text-primary"
          >
            <Timer className="h-3 w-3 animate-pulse" />
            {technician.activeTimerCount}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
