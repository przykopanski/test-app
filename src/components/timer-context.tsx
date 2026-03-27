"use client"

import * as React from "react"
import type { TimeEntry } from "@/lib/time-entries"
import { fetchActiveTimers } from "@/lib/time-entries"
import { useAuth } from "@/components/auth-provider"

interface TimerContextValue {
  activeTimers: TimeEntry[]
  isLoadingTimer: boolean
  elapsedSecondsMap: Record<string, number>
  timerStoppedVersion: number
  setActiveTimers: React.Dispatch<React.SetStateAction<TimeEntry[]>>
  addActiveTimer: (timer: TimeEntry) => void
  removeActiveTimer: (timerId: string) => void
  refreshTimer: () => Promise<void>
  notifyTimerStopped: () => void
  hasActiveTimerForTicket: (ticketId: string) => boolean
}

const TimerContext = React.createContext<TimerContextValue | null>(null)

export function useTimer() {
  const context = React.useContext(TimerContext)
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider")
  }
  return context
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [activeTimers, setActiveTimers] = React.useState<TimeEntry[]>([])
  const [isLoadingTimer, setIsLoadingTimer] = React.useState(true)
  const [elapsedSecondsMap, setElapsedSecondsMap] = React.useState<Record<string, number>>({})
  const [timerStoppedVersion, setTimerStoppedVersion] = React.useState(0)

  const notifyTimerStopped = React.useCallback(() => {
    setTimerStoppedVersion((v) => v + 1)
  }, [])

  const addActiveTimer = React.useCallback((timer: TimeEntry) => {
    setActiveTimers((prev) => [...prev, timer])
  }, [])

  const removeActiveTimer = React.useCallback((timerId: string) => {
    setActiveTimers((prev) => prev.filter((t) => t.id !== timerId))
    setElapsedSecondsMap((prev) => {
      const next = { ...prev }
      delete next[timerId]
      return next
    })
  }, [])

  const hasActiveTimerForTicket = React.useCallback(
    (ticketId: string) => activeTimers.some((t) => t.ticketId === ticketId),
    [activeTimers]
  )

  // Load active timers on mount
  const refreshTimer = React.useCallback(async () => {
    if (!user || user.role !== "technician") {
      setActiveTimers([])
      setIsLoadingTimer(false)
      return
    }
    try {
      const timers = await fetchActiveTimers()
      setActiveTimers(timers)
    } catch {
      setActiveTimers([])
    } finally {
      setIsLoadingTimer(false)
    }
  }, [user])

  React.useEffect(() => {
    if (!isAuthLoading) {
      refreshTimer()
    }
  }, [isAuthLoading, refreshTimer])

  // Compute elapsed seconds for all active timers every second
  React.useEffect(() => {
    const running = activeTimers.filter((t) => t.isRunning && t.startedAt)
    if (running.length === 0) {
      setElapsedSecondsMap({})
      return
    }

    function computeAll() {
      const now = Date.now()
      const map: Record<string, number> = {}
      for (const timer of running) {
        const startTime = new Date(timer.startedAt).getTime()
        map[timer.id] = Math.max(0, Math.floor((now - startTime) / 1000))
      }
      setElapsedSecondsMap(map)
    }

    computeAll()
    const interval = setInterval(computeAll, 1000)
    return () => clearInterval(interval)
  }, [activeTimers])

  const value = React.useMemo<TimerContextValue>(
    () => ({
      activeTimers,
      isLoadingTimer,
      elapsedSecondsMap,
      timerStoppedVersion,
      setActiveTimers,
      addActiveTimer,
      removeActiveTimer,
      refreshTimer,
      notifyTimerStopped,
      hasActiveTimerForTicket,
    }),
    [activeTimers, isLoadingTimer, elapsedSecondsMap, timerStoppedVersion, addActiveTimer, removeActiveTimer, refreshTimer, notifyTimerStopped, hasActiveTimerForTicket]
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}
