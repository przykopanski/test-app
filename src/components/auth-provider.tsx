"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import type { User, UserRole } from "@/lib/auth"
import { getStoredUser, setStoredUser, apiLogin, apiLogout, apiRefresh } from "@/lib/auth"

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  hasRole: (roles: UserRole | UserRole[]) => boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    async function initAuth() {
      // Erst gespeicherten User laden für schnelles UI
      const stored = getStoredUser()
      if (stored) {
        setUser(stored)
      }

      // Dann Token refreshen um Session zu validieren
      const refreshedUser = await apiRefresh()
      if (refreshedUser) {
        setUser(refreshedUser)
        setStoredUser(refreshedUser)
      } else if (stored) {
        // Refresh fehlgeschlagen → gespeicherten User entfernen
        setUser(null)
        setStoredUser(null)
      }

      setIsLoading(false)
    }
    initAuth()
  }, [])

  React.useEffect(() => {
    if (!isLoading && !user && pathname !== "/login") {
      router.replace("/login")
    }
  }, [isLoading, user, pathname, router])

  const login = React.useCallback(
    async (email: string, password: string) => {
      const result = await apiLogin(email, password)
      if (result.success) {
        setUser(result.user)
        setStoredUser(result.user)
        window.location.href = "/"
        return { success: true }
      }
      return { success: false, error: result.error }
    },
    []
  )

  const logout = React.useCallback(async () => {
    await apiLogout()
    setUser(null)
    window.location.href = "/login"
  }, [])

  const hasRole = React.useCallback(
    (roles: UserRole | UserRole[]) => {
      if (!user) return false
      const roleArray = Array.isArray(roles) ? roles : [roles]
      return roleArray.includes(user.role)
    },
    [user]
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasRole,
    }),
    [user, isLoading, login, logout, hasRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
