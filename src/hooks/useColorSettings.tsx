"use client"

import * as React from "react"
import { apiFetch } from "@/lib/auth"
import type { TicketStatus, TicketPriority } from "@/lib/tickets"
import {
  DEFAULT_STATUS_COLORS,
  DEFAULT_PRIORITY_COLORS,
  getBadgeClasses,
  statusColorKey,
  priorityColorKey,
  type ColorToken,
} from "@/lib/ticket-colors"

interface ColorSettings {
  statusColors: Record<TicketStatus, ColorToken>
  priorityColors: Record<TicketPriority, ColorToken>
  getStatusClasses: (status: TicketStatus) => string
  getPriorityClasses: (priority: TicketPriority) => string
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ColorSettingsContext = React.createContext<ColorSettings | null>(null)

export function useColorSettings(): ColorSettings {
  const context = React.useContext(ColorSettingsContext)
  if (!context) {
    // Fallback for components outside provider (should not happen in practice)
    return {
      statusColors: { ...DEFAULT_STATUS_COLORS },
      priorityColors: { ...DEFAULT_PRIORITY_COLORS },
      getStatusClasses: (status: TicketStatus) =>
        getBadgeClasses(DEFAULT_STATUS_COLORS[status]),
      getPriorityClasses: (priority: TicketPriority) =>
        getBadgeClasses(DEFAULT_PRIORITY_COLORS[priority]),
      isLoading: false,
      error: null,
      refetch: async () => {},
    }
  }
  return context
}

function parseColorSettings(data: Record<string, string>): {
  statusColors: Record<TicketStatus, ColorToken>
  priorityColors: Record<TicketPriority, ColorToken>
} {
  const statuses: TicketStatus[] = ["open", "in_progress", "resolved", "closed", "on_hold"]
  const priorities: TicketPriority[] = ["low", "medium", "high", "critical"]

  const statusColors = { ...DEFAULT_STATUS_COLORS }
  for (const s of statuses) {
    const val = data[statusColorKey(s)]
    if (val) statusColors[s] = val as ColorToken
  }

  const priorityColors = { ...DEFAULT_PRIORITY_COLORS }
  for (const p of priorities) {
    const val = data[priorityColorKey(p)]
    if (val) priorityColors[p] = val as ColorToken
  }

  return { statusColors, priorityColors }
}

export function ColorSettingsProvider({ children }: { children: React.ReactNode }) {
  const [statusColors, setStatusColors] = React.useState<Record<TicketStatus, ColorToken>>({
    ...DEFAULT_STATUS_COLORS,
  })
  const [priorityColors, setPriorityColors] = React.useState<Record<TicketPriority, ColorToken>>({
    ...DEFAULT_PRIORITY_COLORS,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchColors = React.useCallback(async () => {
    try {
      setError(null)
      const res = await apiFetch("/color-settings")
      if (!res.ok) {
        throw new Error("Farbeinstellungen konnten nicht geladen werden")
      }
      const data = await res.json()
      const parsed = parseColorSettings(data)
      setStatusColors(parsed.statusColors)
      setPriorityColors(parsed.priorityColors)
    } catch (err) {
      console.error("Failed to load color settings, using defaults:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Farbeinstellungen")
      // Keep defaults on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchColors()
  }, [fetchColors])

  const getStatusClasses = React.useCallback(
    (status: TicketStatus) => getBadgeClasses(statusColors[status]),
    [statusColors]
  )

  const getPriorityClasses = React.useCallback(
    (priority: TicketPriority) => getBadgeClasses(priorityColors[priority]),
    [priorityColors]
  )

  const value = React.useMemo<ColorSettings>(
    () => ({
      statusColors,
      priorityColors,
      getStatusClasses,
      getPriorityClasses,
      isLoading,
      error,
      refetch: fetchColors,
    }),
    [statusColors, priorityColors, getStatusClasses, getPriorityClasses, isLoading, error, fetchColors]
  )

  return (
    <ColorSettingsContext.Provider value={value}>
      {children}
    </ColorSettingsContext.Provider>
  )
}
