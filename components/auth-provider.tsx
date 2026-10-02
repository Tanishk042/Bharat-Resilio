"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AuthUser,
  Role,
  Session,
  clearSession,
  dashboardForRole,
  fetchMe,
  loadSession,
  loginUser as apiLogin,
  normalizeRole,
  registerUser as apiRegister,
  saveSession,
} from "@/services/auth"

interface AuthContextValue {
  session: Session | null
  user: AuthUser | null
  role: Role
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: {
    role: string
    name: string
    email: string
    password: string
    phone?: string
    organization?: string
    state?: string
    district?: string
    pincode?: string
  }) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = loadSession()
    if (!stored) {
      setLoading(false)
      return
    }
    setSession(stored)
    // Re-validate the persisted token in the background so expired/fake
    // sessions are dropped, while the cached session renders immediately.
    fetchMe(stored.token)
      .then((me) => setSession((prev) => (prev ? { token: prev.token, user: me } : prev)))
      .catch(() => {
        clearSession()
        setSession(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await apiLogin(email, password)
    saveSession(next)
    setSession(next)
    return next.user
  }, [])

  const register = useCallback(async (input: {
    role: string
    name: string
    email: string
    password: string
    phone?: string
    organization?: string
    state?: string
    district?: string
    pincode?: string
  }) => {
    const next = await apiRegister(input)
    saveSession(next)
    setSession(next)
    return next.user
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role: normalizeRole(session?.user?.role),
      loading,
      login,
      register,
      logout,
    }),
    [session, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/**
 * Route guard: renders children only when the signed-in user matches one of
 * the allowed roles (role values "ngo"/"authority" are treated as the same
 * authority space). Redirects to the login page when unauthenticated, or to
 * the signed-in user's dashboard when the role is not permitted.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<"civilian" | "donor" | "ngo" | "authority">
  children: React.ReactNode
}) {
  const { session, loading } = useAuth()
  const router = useRouter()
  const allowed = useMemo(() => {
    const norm = roles.map(normalizeRole)
    return new Set(norm)
  }, [roles])

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace("/login")
      return
    }
    if (!allowed.has(normalizeRole(session.user.role))) {
      router.replace(dashboardForRole(session.user.role))
    }
  }, [loading, session, allowed, router])

  if (loading || !session || !allowed.has(normalizeRole(session.user.role))) {
    return null
  }

  return <>{children}</>
}