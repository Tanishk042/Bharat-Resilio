"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { INDIA_CITIES } from "@/lib/india-geo"

export type Recipient = "family" | "authorities" | "both"

export interface MeshLocationPacket {
  id: string
  deviceId: string
  deviceName: string
  lat: number
  lng: number
  label: string
  accuracy: number
  note: string
  recipients: Recipient
  timestamp: number
  source: "self" | "tab" | "mesh-node" | "oracle"
  nodeId?: string
  simulated?: boolean
}

interface MeshLocationState {
  lat: number | null
  lng: number | null
  label: string
  accuracy: number
  locating: boolean
  simulated: boolean
  packets: MeshLocationPacket[]
  familyTabs: string[]
  familyCode: string
  meshOnline: boolean
  oracleOnline: boolean
  sending: boolean
  lastResult: string | null
}

import { MESH_A_BASE, API_BASE } from "@/lib/config"

const MESH_BASE = process.env.NEXT_PUBLIC_MESH_BASE_URL || MESH_A_BASE
const ORACLE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE

const CHANNEL = "resilio-location-mesh"
const CHANNEL_ONLINE_MS = 12000

function makeDeviceId(): string {
  const existing = globalThis.localStorage?.getItem("resilio-device-id")
  if (existing) return existing
  const id = `dev-${Math.random().toString(36).slice(2, 10)}`
  globalThis.localStorage?.setItem("resilio-device-id", id)
  return id
}

function makeFamilyCode(): string {
  const existing = globalThis.localStorage?.getItem("resilio-family-code")
  if (existing) return existing
  const code = `RES-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`
  globalThis.localStorage?.setItem("resilio-family-code", code)
  return code
}

function nearestCity(lat: number, lng: number): string {
  let best = "India"
  let bestDist = Infinity
  for (const [name, city] of Object.entries(INDIA_CITIES)) {
    const dLat = lat - city.lat
    const dLng = lng - city.lng
    const dist = dLat * dLat + dLng * dLng
    if (dist < bestDist) {
      bestDist = dist
      best = name
    }
  }
  return best
}

function shapeLabel(lat: number, lng: number): string {
  return `${nearestCity(lat, lng)} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

async function getPosition(timeoutMs = 10000): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unsupported"))
      return
    }
    const timer = setTimeout(() => reject(new Error("Timed out")), timeoutMs + 1500)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 0 })
      },
      () => {
        clearTimeout(timer)
        reject(new Error("Permission denied or location unavailable"))
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}

export function useMeshLocation(): {
  state: MeshLocationState
  locate: () => Promise<void>
  share: (recipients: Recipient, note: string) => Promise<boolean>
  joinFamilyCode: (code: string) => void
} {
  const [state, setState] = useState<MeshLocationState>({
    lat: null,
    lng: null,
    label: "",
    accuracy: 0,
    locating: false,
    simulated: false,
    packets: [],
    familyTabs: [],
    familyCode: "",
    meshOnline: false,
    oracleOnline: false,
    sending: false,
    lastResult: null,
  })
  const deviceId = useRef<string>(typeof window !== "undefined" ? makeDeviceId() : "dev-ssr")
  const deviceName = useRef<string>(`Device-${deviceId.current.slice(-4).toUpperCase()}`)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const tabsRef = useRef<Map<string, { name: string; lastSeen: number }>>(new Map())
  const familyCodeRef = useRef("")

  const withState = useCallback((patch: Partial<MeshLocationState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const addPackets = useCallback((incoming: MeshLocationPacket[]) => {
    setState((prev) => {
      const next = [...prev.packets]
      for (const p of incoming) {
        if (seenRef.current.has(p.id)) continue
        seenRef.current.add(p.id)
        next.unshift(p)
      }
      return { ...prev, packets: next.slice(0, 40) }
    })
  }, [])

  const pingFamilyPresence = useCallback(() => {
    try {
      channelRef.current?.postMessage({
        type: "presence",
        deviceId: deviceId.current,
        deviceName: deviceName.current,
        code: familyCodeRef.current,
      })
    } catch {
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return
    familyCodeRef.current = makeFamilyCode()
    withState({ familyCode: familyCodeRef.current })
    pingFamilyPresence()
  }, [withState, pingFamilyPresence])

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return
    const channel = new BroadcastChannel(CHANNEL)
    channelRef.current = channel
    channel.onmessage = (event) => {
      const msg = (event as unknown as { data?: Record<string, unknown> }).data
      if (!msg) return
      if (msg.type === "presence") {
        const id = String(msg.deviceId)
        if (id === deviceId.current) return
        if (msg.code && msg.code !== familyCodeRef.current) return
        tabsRef.current.set(id, { name: String(msg.deviceName ?? id), lastSeen: Date.now() })
        const names = Array.from(tabsRef.current.entries())
          .filter(([, info]) => Date.now() - info.lastSeen < CHANNEL_ONLINE_MS)
          .map(([, info]) => info.name)
        setState((prev) => ({ ...prev, familyTabs: names }))
        return
      }
      if (msg.type === "loc") {
        addPackets([msg.packet as MeshLocationPacket])
      }
    }
    pingFamilyPresence()
    const presenceInterval = setInterval(pingFamilyPresence, 3000)
    return () => {
      channel.close()
      channelRef.current = null
      clearInterval(presenceInterval)
    }
  }, [pingFamilyPresence, addPackets])

  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false
    const statusPing = async () => {
      try {
        const mesh = await fetch(`${MESH_BASE}/health`).then((r) => r.json())
        const oracle = await fetch(`${ORACLE_BASE}/health`).then((r) => r.json())
        if (cancelled) return
        withState({
          meshOnline: Boolean(mesh && mesh.nodeId),
          oracleOnline: Boolean(oracle && oracle.status === "healthy"),
        })
      } catch {
        if (!cancelled) withState({ meshOnline: false, oracleOnline: false })
      }
    }
    statusPing()
    const interval = setInterval(async () => {
      await statusPing()
      try {
        const records = await fetch(`${MESH_BASE}/state`).then((r) => r.json())
        const shares = (Array.isArray(records) ? records : [])
          .filter((r: any) => String(r.kind ?? r.hazard_type ?? "") === "location_share")
          .map((r: any) => {
            const m = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(String(r.location ?? ""))
            const lat = m ? Number(m[1]) : 0
            const lng = m ? Number(m[2]) : 0
            return {
              id: String(r.id ?? r.incident_id ?? `mesh-${Date.now()}`),
              deviceId: String(r.reporterNodeId ?? "mesh-node"),
              deviceName: "Mesh Node",
              lat,
              lng,
              label: String(r.location ?? "Unknown"),
              accuracy: 0,
              note: String(r.description ?? ""),
              recipients: /authorities/.test(String(r.description ?? "")) ? ("both" as Recipient) : ("family" as Recipient),
              timestamp: Number(r.submitted_at ?? r.timestamp ?? Date.now()),
              source: "mesh-node",
              nodeId: String(r.reporterNodeId ?? ""),
            } as MeshLocationPacket
          })
        addPackets(shares)
      } catch {}
    }, 6000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [withState, addPackets])

  const locate = useCallback(async () => {
    withState({ locating: true })
    try {
      const pos = await getPosition()
      withState({
        lat: pos.lat,
        lng: pos.lng,
        label: shapeLabel(pos.lat, pos.lng),
        accuracy: pos.accuracy,
        locating: false,
        simulated: false,
      })
    } catch {
      const lat = 28.6139
      const lng = 77.209
      withState({
        lat,
        lng,
        label: `${shapeLabel(lat, lng)} (simulated)`,
        accuracy: 0,
        locating: false,
        simulated: true,
        lastResult: "Location unavailable — using simulated coordinates for the demo.",
      })
    }
  }, [withState])

  const share = useCallback(
    async (recipients: Recipient, note: string): Promise<boolean> => {
      if (state.lat === null || state.lng === null) return false
      const id = `loc-${state.lat.toFixed(4)}-${state.lng.toFixed(4)}-${Date.now()}`
      const packet: MeshLocationPacket = {
        id,
        deviceId: deviceId.current,
        deviceName: deviceName.current,
        lat: state.lat,
        lng: state.lng,
        label: state.label,
        accuracy: state.accuracy,
        note,
        recipients,
        timestamp: Date.now(),
        source: "self",
        simulated: state.simulated,
      }
      seenRef.current.add(id)
      withState({ sending: true })
      const hops: string[] = []
      try {
        if (recipients === "family" || recipients === "both") {
          const channel = channelRef.current ?? (typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL) : null)
          if (channel) {
            try {
              channel.postMessage({
                type: "loc",
                packet: { ...packet },
                sentBy: deviceId.current,
              })
              hops.push("family tabs (BroadcastChannel)")
            } catch {
              channelRef.current = null
              hops.push("family tabs (unavailable)")
            }
          }
        }
        try {
          const meshRes = await fetch(`${MESH_BASE}/incidents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              kind: "location_share",
              location: `${state.label} ${state.lat.toFixed(6)},${state.lng.toFixed(6)}`,
              severity: 1,
              description: `${recipients}${note ? ` | ${note}` : ""}`,
            }),
          })
          if (meshRes.ok) hops.push(`mesh node (${MESH_BASE})`)
        } catch {
          hops.push("mesh (unreachable)")
        }
        if (recipients === "authorities" || recipients === "both") {
          try {
            const oracleRes = await fetch(`${ORACLE_BASE}/incident/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                incident_id: id,
                hazard_type: "location_share",
                location: `${state.label} ${state.lat.toFixed(6)},${state.lng.toFixed(6)}`,
                severity: 1,
                telemetry: { recipients, note, lat: state.lat, lng: state.lng },
              }),
            })
            if (oracleRes.ok) hops.push("authority oracle")
          } catch {
            hops.push("oracle (unreachable)")
          }
        }
        addPackets([packet])
        withState({
          sending: false,
          lastResult: `Sent via ${hops.join(" + ") || "no channel"} — packet ${id}`,
        })
        return true
      } catch (error) {
        withState({
          sending: false,
          lastResult: `Failed to send: ${error instanceof Error ? error.message : String(error)}`,
        })
        return false
      }
    },
    [state.lat, state.lng, state.label, state.accuracy, state.simulated, addPackets, withState],
  )

  const joinFamilyCode = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase()
      if (!normalized) return
      globalThis.localStorage?.setItem("resilio-family-code", normalized)
      familyCodeRef.current = normalized
      withState({ familyCode: normalized })
      pingFamilyPresence()
    },
    [withState, pingFamilyPresence],
  )

  return { state, locate, share, joinFamilyCode }
}