"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { MESH_A_BASE } from "@/lib/config"

export interface MeshPeerInfo {
  nodeId: string
  host?: string
  port?: number
  role?: string
  connected?: boolean
  lastSeenAt?: number
  blocked?: boolean
}

export interface MeshIncident {
  id: string
  kind: string
  location: string
  severity: number
  description: string
  reporterNodeId: string
  updatedAt?: { counter: number; nodeId: string }
}

export interface MeshHealthState {
  connected: boolean
  nodeId: string | null
  meshPort: number
  apiPort: number
  availabilityPercent: number
  peers: MeshPeerInfo[]
  incidents: MeshIncident[]
  incidentCount: number
  lastUpdate: number | null
}

export interface MeshProviderProps {
  meshPort?: number
  apiPort?: number
  pollIntervalMs?: number
  children: ReactNode
}

const DEFAULT_STATE: MeshHealthState = {
  connected: false,
  nodeId: null,
  meshPort: 8101,
  apiPort: 8101,
  availabilityPercent: 0,
  peers: [],
  incidents: [],
  incidentCount: 0,
  lastUpdate: null,
}

const MeshHealthContext = createContext<MeshHealthState>(DEFAULT_STATE)

export function useMeshHealth(): MeshHealthState {
  return useContext(MeshHealthContext)
}

export function MeshHealthProvider({
  meshPort = 8101,
  apiPort = 8101,
  pollIntervalMs = 3000,
  children,
}: MeshProviderProps) {
  const [state, setState] = useState<MeshHealthState>({
    ...DEFAULT_STATE,
    meshPort,
    apiPort,
  })

  const refresh = useCallback(async () => {
    try {
      const [healthRes, incidentsRes] = await Promise.all([
        fetch(`${MESH_A_BASE}/health`, {
          signal: AbortSignal.timeout(2500),
        }),
        fetch(`${MESH_A_BASE}/state`, {
          signal: AbortSignal.timeout(2500),
        }),
      ])

      if (!healthRes.ok || !incidentsRes.ok) {
        throw new Error("mesh fetch failed")
      }

      const health = await healthRes.json()
      const incidents = await incidentsRes.json()

      const peers: MeshPeerInfo[] = Array.isArray(health.peers)
        ? health.peers.map((p: any) => ({
            nodeId: p.nodeId,
            host: p.host,
            port: p.port,
            role: p.role,
            connected: p.connected,
            lastSeenAt: p.lastSeenAt,
            blocked: p.blocked,
          }))
        : []

      const incidentList: MeshIncident[] = Array.isArray(incidents)
        ? incidents.map((i: any) => ({
            id: i.id,
            kind: i.kind,
            location: i.location,
            severity: i.severity,
            description: i.description,
            reporterNodeId: i.reporterNodeId,
            updatedAt: i.updatedAt,
          }))
        : []

      setState((prev) => ({
        ...prev,
        connected: true,
        nodeId: health.nodeId ?? prev.nodeId,
        availabilityPercent: health.availabilityPercent ?? 0,
        peers,
        incidents: incidentList,
        incidentCount: incidentList.length,
        lastUpdate: Date.now(),
      }))
    } catch {
      setState((prev) => ({
        ...prev,
        connected: false,
        lastUpdate: Date.now(),
      }))
    }
  }, [apiPort])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, pollIntervalMs)
    return () => clearInterval(interval)
  }, [refresh, pollIntervalMs])

  return (
    <MeshHealthContext.Provider value={state}>{children}</MeshHealthContext.Provider>
  )
}