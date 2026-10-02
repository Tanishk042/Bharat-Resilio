"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, MapPin, Users, Zap, Radio, Flame, WifiOff } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useMeshHealth, type MeshIncident } from "@/components/connectivity-provider"
import { getCachedIncidents, cacheIncidents, type CachedIncident } from "@/utils/incident-cache"

interface Alert {
  id: string
  type: "cyclone" | "flood" | "earthquake" | "drought" | "wildfire" | "other"
  title: string
  severity: "low" | "medium" | "high" | "critical"
  location: string
  timestamp: Date
  description: string
  affectedPopulation: number
  status: string
  isNew?: boolean
}

const mockAlerts: Alert[] = [
  {
    id: "offline-cyclone",
    type: "cyclone",
    title: "Cyclone Biparjoy Approaching",
    severity: "critical",
    location: "Gujarat Coast",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    description: "Very severe cyclone with 150 kmph winds approaching coastal areas",
    affectedPopulation: 500000,
    status: "Offline sample",
  },
  {
    id: "offline-flood",
    type: "flood",
    title: "Kerala Monsoon Flooding",
    severity: "high",
    location: "Kochi District",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    description: "Heavy monsoon rains causing severe flooding in low-lying areas",
    affectedPopulation: 25000,
    status: "Offline sample",
  },
  {
    id: "offline-quake",
    type: "earthquake",
    title: "Earthquake Alert Issued",
    severity: "high",
    location: "Himachal Pradesh",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    description: "Seismic activity detected, magnitude 5.2 earthquake recorded",
    affectedPopulation: 150000,
    status: "Offline sample",
  },
]

const KIND_TO_TYPE: Record<string, Alert["type"]> = {
  flood: "flood",
  cyclone: "cyclone",
  earthquake: "earthquake",
  drought: "drought",
  wildfire: "wildfire",
}

function incidentToAlert(incident: MeshIncident): Alert {
  const severity: Alert["severity"] =
    incident.severity >= 7 ? "critical" : incident.severity >= 4 ? "high" : "low"
  const updatedAt = incident.updatedAt ? new Date(incident.updatedAt.counter) : new Date()
  return {
    id: incident.id,
    type: KIND_TO_TYPE[(incident.kind || "").toLowerCase()] ?? "other",
    title: `${incident.kind || "Mesh"} Alert`,
    severity,
    location: incident.location,
    timestamp: updatedAt,
    description: incident.description,
    affectedPopulation: Math.round(500 * incident.severity),
    status: "Live via mesh CRDT",
    isNew: true,
  }
}

function cachedToAlert(cached: CachedIncident): Alert {
  const severity: Alert["severity"] =
    cached.severity >= 7 ? "critical" : cached.severity >= 4 ? "high" : "low"
  return {
    id: cached.id,
    type: KIND_TO_TYPE[(cached.kind || "").toLowerCase()] ?? "other",
    title: `${cached.kind || "Cached"} Alert`,
    severity,
    location: cached.location,
    timestamp: new Date(cached.cachedAt),
    description: cached.description,
    affectedPopulation: Math.round(500 * cached.severity),
    status: "From offline cache",
  }
}

export function LiveAlertFeed() {
  const { incidents, connected } = useMeshHealth()
  const [isLive, setIsLive] = useState(true)
  const [cached, setCached] = useState<CachedIncident[]>([])

  // Sync live mesh incidents into IndexedDB so the feed works offline.
  useEffect(() => {
    if (connected && incidents.length > 0) {
      cacheIncidents(
        incidents.map((i) => ({
          id: i.id,
          kind: i.kind,
          location: i.location,
          severity: i.severity,
          description: i.description,
          reporterNodeId: i.reporterNodeId,
          lamportCounter: i.updatedAt?.counter ?? 0,
          cachedAt: Date.now(),
        })),
      )
    }
  }, [connected, incidents])

  useEffect(() => {
    let mounted = true
    getCachedIncidents().then((result) => {
      if (mounted) setCached(result)
    })
    return () => {
      mounted = false
    }
  }, [])

  const alerts = useMemo<Alert[]>(() => {
    if (connected && incidents.length > 0) {
      return incidents.map(incidentToAlert).slice(0, 6)
    }
    if (cached.length > 0) {
      return cached.map(cachedToAlert).slice(0, 6)
    }
    return mockAlerts
  }, [connected, incidents, cached])

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      // Keep timestamps fresh without inventing data.
      setCached((prev) => prev)
    }, 30000)
    return () => clearInterval(interval)
  }, [isLive])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "cyclone":
        return <Zap className="h-5 w-5" />
      case "flood":
        return <Radio className="h-5 w-5" />
      case "wildfire":
        return <Flame className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600/10 text-red-600 border-red-600/20"
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "medium":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }

  const feedLabel = connected ? "Live via mesh CRDT" : cached.length > 0 ? "Offline cache" : "Sample mode"

  return (
    <Card className="border-blue-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? "bg-blue-500 animate-pulse" : "bg-muted"}`}></div>
            Live Alert Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            {!connected && cached.length === 0 && <WifiOff className="h-4 w-4 text-muted-foreground" />}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLive(!isLive)}
              className={isLive ? "bg-blue-500/10 text-blue-500 border-blue-500/50" : "bg-transparent"}
            >
              {isLive ? "Live" : "Paused"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time alerts replicated from the {feedLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`border transition-all duration-300 ${getSeverityColor(alert.severity)} ${
              alert.isNew ? "ring-2 ring-blue-500/50" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {alert.title}
                        {alert.isNew && <Badge className="bg-blue-500 text-white text-xs animate-pulse">NEW</Badge>}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(alert.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{alert.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">{alert.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{alert.affectedPopulation.toLocaleString()} people affected</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alert.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}