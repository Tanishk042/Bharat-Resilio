"use client"

import { useEffect, useState, useCallback } from "react"
import {
  getIncidents,
  getStatistics,
  getMeshIncidents,
} from "@/services/api"

export interface LiveIncident {
  incident_id: string
  hazard_type: string
  location: string
  severity: number
  status: "pending" | "verified" | "rejected" | string
  corroborations: number
  submitted_at?: number
  timestamp?: string
}

export interface LiveStats {
  total_incidents: number
  verified: number
  pending: number
  rejected: number
  corroboration_avg: number
  scenario?: Record<string, number>
  [key: string]: unknown
}

export interface LiveDataState {
  incidents: LiveIncident[]
  stats: LiveStats | null
  meshIncidents: LiveIncident[]
  loading: boolean
  refreshedAt: number | null
  refresh: () => Promise<void>
}

const EMPTY_STATS: LiveStats = {
  total_incidents: 0,
  verified: 0,
  pending: 0,
  rejected: 0,
  corroboration_avg: 0,
}

function toLiveIncidents(list: any[]): LiveIncident[] {
  if (!Array.isArray(list)) return []
  return list.map((i) => ({
    incident_id: String(i.incident_id ?? i.id ?? "inc-unknown"),
    hazard_type: String(i.hazard_type ?? i.kind ?? "unknown"),
    location: String(i.location ?? "Unknown"),
    severity: Number(i.severity ?? 5),
    status: String(i.status ?? "pending"),
    corroborations: Number(i.corroborations ?? 0),
    submitted_at: i.submitted_at ?? i.timestamp ?? undefined,
  }))
}

/**
 * Shared live-data hook: polls the oracle (8080), stats and the mesh so every
 * dashboard shows real incidents instead of placeholders. Polls every 15s.
 */
export function useResilioData(pollIntervalMs = 15000): LiveDataState {
  const [incidents, setIncidents] = useState<LiveIncident[]>([])
  const [meshIncidents, setMeshIncidents] = useState<LiveIncident[]>([])
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [incRes, statRes, meshRes] = await Promise.allSettled([
        getIncidents(),
        getStatistics(),
        getMeshIncidents(),
      ])

      if (incRes.status === "fulfilled") {
        const body = incRes.value as any
        setIncidents(toLiveIncidents(body.incidents ?? body))
      }
      if (statRes.status === "fulfilled") {
        const body = statRes.value as any
        setStats({
          ...EMPTY_STATS,
          ...(body as object),
        })
      }
      if (meshRes.status === "fulfilled") {
        const body = meshRes.value as any
        setMeshIncidents(toLiveIncidents(Array.isArray(body) ? body : body.incidents ?? []))
      }
      setRefreshedAt(Date.now())
    } catch (error) {
      console.error("[ResilioData] refresh failed", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, pollIntervalMs)
    return () => clearInterval(interval)
  }, [refresh, pollIntervalMs])

  return { incidents, meshIncidents, stats, loading, refreshedAt, refresh }
}

/** Combine oracle + mesh incidents into one deduped list. */
export function mergeIncidents(primary: LiveIncident[], secondary: LiveIncident[]): LiveIncident[] {
  const map = new Map<string, LiveIncident>()
  for (const inc of [...primary, ...secondary]) {
    const key = inc.incident_id
    if (!map.has(key)) map.set(key, inc)
  }
  return Array.from(map.values())
}