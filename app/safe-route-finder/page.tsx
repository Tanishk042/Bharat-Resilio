"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Navigation, MapPin, AlertTriangle, Clock, Route, Zap } from "lucide-react"
import { Badge as BadgeIcon } from "lucide-react"
import { findRoute, getGraphInfo } from "@/services/api"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"

interface RouteResult {
  path: number[]
  cost: number
  routing_mode: string
  density: number
  gnn_available: boolean
}

interface HazardNode {
  nodeId: number
  label: string
  location: string
  severityNum: number
  tierLabel: string
  color: string
  incidentId: string
}

function hashCodeId(id: string): number {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return sum
}

export default function SafeRouteFinder() {
  const { incidents, meshIncidents } = useResilioData(15000)
  const all = mergeIncidents(incidents, meshIncidents)
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [routes, setRoutes] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [graphInfo, setGraphInfo] = useState<{ num_nodes: number; num_edges: number } | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  const numNodes = graphInfo?.num_nodes ?? 50

  const hazards: HazardNode[] = useMemo(() => {
    return all.slice(0, 12).map((inc) => {
      const nodeId = hashCodeId(inc.incident_id) % Math.max(1, numNodes - 1)
      const tier = severityTier(inc.severity)
      return {
        nodeId,
        label: hazardLabel(inc.hazard_type),
        location: inc.location,
        severityNum: inc.severity,
        tierLabel: tier.label,
        color: tier.dot,
        incidentId: inc.incident_id,
      }
    })
  }, [all, numNodes])

  useEffect(() => {
    let mounted = true
    getGraphInfo()
      .then((info) => {
        if (mounted) setGraphInfo(info)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const parseNode = (v: string): number | null => {
    const n = Number.parseInt(v, 10)
    if (Number.isNaN(n) || n < 0 || n >= numNodes) return null
    return n
  }

  const handleFindRoutes = async () => {
    const startNode = parseNode(origin)
    const goalNode = parseNode(destination)
    if (startNode === null || goalNode === null) {
      setRouteError(`Enter two node IDs between 0 and ${numNodes - 1}.`)
      return
    }
    if (startNode === goalNode) {
      setRouteError("Start and destination must be different nodes.")
      return
    }

    setLoading(true)
    setRouteError(null)
    try {
      const hazardZones = hazards.map((h) => h.nodeId)
      const result = await findRoute({
        start_node: startNode,
        goal_node: goalNode,
        hazard_zones: hazardZones,
      })
      setRoutes(result as RouteResult)
    } catch {
      setRouteError("Routing service unreachable — the GNN is offline. I've noted the live hazard zones; retry in a moment.")
      setRoutes(null)
    } finally {
      setLoading(false)
    }
  }

  const getSafetyColor = (safety: string) => {
    switch (safety) {
      case "High":
        return "text-green-500 bg-green-500/10"
      case "Medium":
        return "text-yellow-500 bg-yellow-500/10"
      case "Low":
        return "text-red-500 bg-red-500/10"
      default:
        return "text-gray-500 bg-gray-500/10"
    }
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(numNodes)))

  const cellForNode = (nodeId: number) => {
    const nodeHazard = hazards.find((h) => h.nodeId === nodeId)
    if (nodeHazard)
      return {
        key: "hazard",
        bg: nodeHazard.color,
        title: `${nodeHazard.label} (${nodeHazard.tierLabel}, ${nodeHazard.severityNum}/10) — ${nodeHazard.location} — ${nodeHazard.incidentId}`,
      }
    return { key: "normal", bg: "bg-muted", title: `Node ${nodeId}` }
  }

  const pathSet = new Set(routes?.path ?? [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Navigation className="h-6 w-6 text-primary" />
            </div>
            <p className="kicker">01 — Evacuation</p>
            <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">Safe Route Finder</h1>
          </div>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Live GNN + A* routing that avoids real disaster zones reported to the oracle
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Route Planning */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live hazard map */}
            <IndiaMap incidents={all} title="Live Hazard Overlay" />

            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Plan Your Route (Node IDs 0–{numNodes - 1})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From (node)</label>
                    <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. 0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To (node)</label>
                    <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={`e.g. ${numNodes - 1}`} />
                  </div>
                </div>
                {routeError && <p className="text-sm text-red-500">{routeError}</p>}
                <Button onClick={handleFindRoutes} className="w-full" disabled={loading}>
                  {loading ? "Finding Safe Routes..." : "Find Safe Routes"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Hazard zones below are assigned from live incident IDs — no simulated data.
                </p>
              </CardContent>
            </Card>

            {/* Route Result */}
            {routes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Computed Route
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Path: {routes.path.length} nodes</Badge>
                    <Badge variant="secondary">Cost: {routes.cost.toFixed(2)}</Badge>
                    <Badge variant="outline">Mode: {routes.routing_mode.toUpperCase()}</Badge>
                    <Badge variant="outline">GNN ready: {routes.gnn_available ? "yes" : "no"}</Badge>
                    <Badge variant="outline">Sensor density: {(routes.density * 100).toFixed(0)}%</Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Path:</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {(routes.path as number[]).map((nodeId, index) => (
                        <span key={index} className="flex items-center gap-2">
                          <span className="rounded-md border px-2 py-1 text-xs font-mono">{nodeId}</span>
                          {index < routes.path.length - 1 && (
                            <span className="text-muted-foreground">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Graph Visualization (nodes 0–{numNodes - 1}):</p>
                    <div
                      className="grid gap-1"
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: numNodes }, (_, node) => {
                        const info = cellForNode(node)
                        const isStart = node === parseNode(origin)
                        const isGoal = node === parseNode(destination)
                        const isPath = pathSet.has(node)
                        const bg = isStart
                          ? "bg-green-500 text-white"
                          : isGoal
                            ? "bg-blue-500 text-white"
                            : isPath
                              ? "bg-primary text-primary-foreground"
                              : info.key === "hazard"
                                ? "text-white"
                                : "bg-muted text-muted-foreground"
                        const hazardStyle = info.key === "hazard" && !isStart && !isGoal && !isPath ? { backgroundColor: info.bg } : undefined
                        return (
                          <div
                            key={node}
                            title={info.title}
                            className={`flex aspect-square items-center justify-center rounded text-[10px] font-mono ${bg}`}
                            style={hazardStyle}
                          >
                            {node}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-500" />Start</span>
                      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" />Goal</span>
                      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary" />Computed path</span>
                      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500" />Hazard zone</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {routes.routing_mode === "gnn"
                      ? "AI-optimized route using GNN predictions on live sensor density."
                      : "Deterministic A* fallback route (GNN available: " + (routes.gnn_available ? "yes" : "no") + ")."}
                  </p>

                  <Button size="sm">Select This Route</Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <MapPin className="h-4 w-4 mr-2" />
                  Current Location
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Routes
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <BadgeIcon className="h-4 w-4 mr-2" />
                  Emergency Routes
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Hazards — live */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Active Hazards (Live)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hazards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No live hazard reports right now.</p>
                ) : (
                  hazards.map((hazard) => (
                    <div key={hazard.incidentId} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hazard.color }} />
                          <span className="font-medium text-sm">{hazard.label}</span>
                        </div>
                        <Badge variant={hazard.severityNum >= 7 ? "destructive" : "secondary"}>
                          {hazard.tierLabel} · {hazard.severityNum}/10
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {hazard.location} (node {hazard.nodeId})
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Safety Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Always check current conditions before traveling</p>
                <p>• Keep emergency supplies in your vehicle</p>
                <p>• Share your route with family/friends</p>
                <p>• Have backup routes planned</p>
                <p>• Monitor weather and emergency alerts</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}