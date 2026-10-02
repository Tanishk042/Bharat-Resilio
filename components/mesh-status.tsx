"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Radio, Wifi, WifiOff, Blocks } from "lucide-react"
import { useMeshHealth } from "@/components/connectivity-provider"

interface MeshStatusProps {
  chainApiPort?: number
  className?: string
}

/**
 * Live connectivity banner for the custom mesh + chain network.
 * Shows availability %, peer count, and chain/oracle reachability so the
 * user always knows whether the P2P network is reachable.
 */
export function MeshStatus({ chainApiPort = 8201, className }: MeshStatusProps) {
  const { connected, availabilityPercent, peers, incidentCount } = useMeshHealth() as any
  const [chainConnected, setChainConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${chainApiPort}/health`, {
          signal: AbortSignal.timeout(2500),
        })
        const body = await res.json().catch(() => null)
        setChainConnected(res.ok && (body?.nodes != null || body?.chain != null || body?.validators != null))
      } catch {
        setChainConnected(false)
      }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [chainApiPort])

  const meshActive = connected && availabilityPercent > 0

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {meshActive ? (
            <Radio className="h-4 w-4 text-green-500 animate-pulse" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            {meshActive ? "Mesh Connected" : "Mesh Offline — using cached data"}
          </span>
          <Badge
            variant="outline"
            className={
              meshActive
                ? "text-green-500 border-green-500/50 ml-auto"
                : "text-muted-foreground ml-auto"
            }
          >
            {meshActive ? `${availabilityPercent?.toFixed(1) ?? 0}% avail` : "offline"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-sm font-bold">{peers?.length ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Mesh Peers</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-sm font-bold">{incidentCount ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Live Incidents</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className={`text-sm font-bold ${chainConnected ? "text-green-500" : "text-muted-foreground"}`}>
              {chainConnected === null ? "..." : chainConnected ? "Up" : "Down"}
            </div>
            <div className="text-[10px] text-muted-foreground">PoA Chain</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {chainConnected ? (
            <Blocks className="h-3 w-3 text-green-500" />
          ) : (
            <Wifi className="h-3 w-3" />
          )}
          <span>
            {meshActive
              ? "Live CRDT sync across P2P nodes — incidents are peer-verified."
              : "Showing last-known state from offline cache. Start the mesh to reconnect."}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}