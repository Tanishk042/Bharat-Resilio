"use client"

import { useEffect, useRef, useCallback } from "react"
import { useMeshHealth, type MeshIncident } from "@/components/connectivity-provider"

/**
 * Keeps a live view of mesh incidents, combining the real-time polling feed
 * (from the MeshHealthProvider) with cached incidents so the UI stays useful
 * during network partitions. Starts a chain-connection info refresh as well.
 */
export function useIncidentFeed(apiPort = 8101, refreshMs = 5000) {
  const { incidents, connected } = useMeshHealth()
  const chainRef = useRef<"connecting" | "connected" | "offline">("connecting")

  useEffect(() => {
    const checkChain = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${apiPort + 100}/health`, {
          signal: AbortSignal.timeout(2500),
        })
        chainRef.current = res.ok ? "connected" : "offline"
      } catch {
        chainRef.current = "offline"
      }
    }
    checkChain()
    const interval = setInterval(checkChain, refreshMs)
    return () => clearInterval(interval)
  }, [apiPort, refreshMs])

  const watching = useCallback((incidentId: string) => {
    // Location for future watchlist persistence
    void incidentId
  }, [])

  return {
    incidents,
    connected,
    chainStatus: chainRef.current,
    watching,
  }
}

export type { MeshIncident }