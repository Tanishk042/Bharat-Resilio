"use client"

/**
 * Authentication integration for the Resilio frontend.
 *
 * Talks to the backend-api auth surface through the single-origin rewrite
 * path (/backend/auth/*). Sessions are persisted in localStorage as a signed
 * JWT + user payload; the token can be re-validated server-side at /auth/me.
 */

export type Role = "civilian" | "donor" | "ngo" | "authority"

export interface AuthUser {
  id: string
  role: string
  name: string
  email: string
  phone?: string
  organization?: string
  state?: string
  district?: string
  pincode?: string
}

export interface Session {
  token: string
  user: AuthUser
}

const SESSION_KEY = "resilio.auth"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "/backend").replace(/\/+$/, "")
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      data?.error === "already_registered"
        ? "An account with this email already exists. Please sign in."
        : data?.error === "invalid_credentials"
          ? "Incorrect email or password."
          : data?.detail
            ? String(data.detail)
            : String(data?.error ?? `Request failed (${res.status})`)
    throw new Error(message)
  }
  return data
}

export async function registerUser(input: {
  role: Role | string
  name: string
  email: string
  password: string
  phone?: string
  organization?: string
  state?: string
  district?: string
  pincode?: string
}): Promise<Session> {
  const data = await post("/auth/register", {
    role: input.role,
    name: input.name,
    email: input.email,
    password: input.password,
    phone: input.phone ?? "",
    organization: input.organization ?? "",
    state: input.state ?? "",
    district: input.district ?? "",
    pincode: input.pincode ?? "",
  })
  return { token: data.token, user: data.user }
}

export async function loginUser(email: string, password: string): Promise<Session> {
  const data = await post("/auth/login", { email, password })
  return { token: data.token, user: data.user }
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${apiBase()}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("session_expired")
  const data = await res.json()
  return data.user
}

// ---- session persistence (localStorage guarded for SSR) ----

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

/** Maps a stored/assigned role to its dashboard path. */
export function dashboardForRole(role: string | undefined): string {
  switch (role) {
    case "donor":
      return "/donor-dashboard"
    case "ngo":
    case "authority":
      return "/ngo-dashboard"
    case "civilian":
    default:
      return "/dashboard"
  }
}

/** Normalises an authority-role alias so UI labels stay consistent. */
export function normalizeRole(role: string | undefined): Role {
  if (role === "authority" || role === "ngo") return "authority"
  if (role === "donor") return "donor"
  return "civilian"
}