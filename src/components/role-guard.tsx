"use client"

import { useAuth } from "@/components/auth-provider"
import type { UserRole } from "@/lib/auth"

interface RoleGuardProps {
  roles: UserRole | UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { hasRole, isLoading } = useAuth()

  if (isLoading) return null

  if (!hasRole(roles)) {
    return fallback ?? (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Zugriff verweigert</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sie haben keine Berechtigung, diese Seite anzuzeigen.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
