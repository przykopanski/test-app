export type UserRole = "admin" | "technician" | "office"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("auth_user")
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

export function setStoredUser(user: User | null): void {
  if (typeof window === "undefined") return
  if (user) {
    localStorage.setItem("auth_user", JSON.stringify(user))
  } else {
    localStorage.removeItem("auth_user")
  }
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      return { success: false, error: body?.message ?? "Ungültige Anmeldedaten" }
    }

    const data = await res.json()
    return { success: true, user: data.user }
  } catch {
    return { success: false, error: "Verbindung zum Server fehlgeschlagen" }
  }
}

export async function apiRefresh(): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    setStoredUser(data.user)
    return data.user
  } catch {
    return null
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
  } catch {
    // Logout lokal trotzdem durchführen
  }

  setStoredUser(null)
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

  let res = await doFetch()

  // Token abgelaufen → Refresh versuchen
  if (res.status === 401) {
    const user = await apiRefresh()
    if (user) {
      res = await doFetch()
    }
  }

  return res
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  technician: "Techniker",
  office: "Office",
}
