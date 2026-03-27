"use client"

import * as React from "react"
import type { TimeEntry } from "@/lib/time-entries"
import { fetchActiveTimer } from "@/lib/time-entries"
import { useAuth } from "@/components/auth-provider"

interface TimerContextValue {
  activeTimer: TimeEntry | null
  isLoadingTimer: boolean
  elapsedSeconds: number
  timerStoppedVersion: number
  setActiveTimer: (timer: TimeEntry | null) => void
  refreshTimer: () => Promise<void>
  notifyTimerStopped: () => void
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
  const [activeTimer, setActiveTimer] = React.useState<TimeEntry | null>(null)
  const [isLoadingTimer, setIsLoadingTimer] = React.useState(true)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const [timerStoppedVersion, setTimerStoppedVersion] = React.useState(0)

  const notifyTimerStopped = React.useCallback(() => {
    setTimerStoppedVersion((v) => v + 1)
  }, [])

  // Load active timer on mount
  const refreshTimer = React.useCallback(async () => {
    if (!user || user.role !== "technician") {
      setActiveTimer(null)
      setIsLoadingTimer(false)
      return
    }
    try {
      const timer = await fetchActiveTimer()
      setActiveTimer(timer)
    } catch {
      // Silently fail — timer bar just won't show
      setActiveTimer(null)
    } finally {
      setIsLoadingTimer(false)
    }
  }, [user])

  React.useEffect(() => {
    if (!isAuthLoading) {
      refreshTimer()
    }
  }, [isAuthLoading, refreshTimer])

  // Compute elapsed seconds every second
  React.useEffect(() => {
    if (!activeTimer?.isRunning || !activeTimer.startedAt) {
      setElapsedSeconds(0)
      return
    }

    function computeElapsed() {
      const startTime = new Date(activeTimer!.startedAt).getTime()
      const now = Date.now()
      setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)))
    }

    computeElapsed()
    const interval = setInterval(computeElapsed, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const value = React.useMemo<TimerContextValue>(
    () => ({
      activeTimer,
      isLoadingTimer,
      elapsedSeconds,
      timerStoppedVersion,
      setActiveTimer,
      refreshTimer,
      notifyTimerStopped,
    }),
    [activeTimer, isLoadingTimer, elapsedSeconds, timerStoppedVersion, refreshTimer, notifyTimerStopped]
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}
