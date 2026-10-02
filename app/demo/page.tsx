"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertTriangle,
  Brain,
  Heart,
  Smartphone,
  CheckCircle,
  Radio,
  Activity,
  ShieldCheck,
  WifiOff,
  Wifi,
  Database,
} from "lucide-react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"
import { getChainChain, getChainState, getMeshHealth } from "@/services/api"

interface ChainBlock {
  index: number
  timestamp?: number
  incidentId?: string
  transactions?: { incidentId?: string; amount?: number }[]
  hash?: string
  previousHash?: string
}

export default function DemoPage() {
  const [currentDemo, setCurrentDemo] = useState("prediction")
  const [online, setOnline] = useState(true)
  const [chain, setChain] = useState<ChainBlock[]>([])
  const [chainHeight, setChainHeight] = useState(0)
  const [meshPeers, setMeshPeers] = useState(0)
  const [meshConnected, setMeshConnected] = useState(false)

  const { incidents, meshIncidents, stats, refreshedAt } = useResilioData(15000)
  const all = mergeIncidents(incidents, meshIncidents)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [blocks, state, health] = await Promise.all([
          getChainChain().catch(() => []),
          getChainState().catch(() => null),
          getMeshHealth().catch(() => null),
        ])
        if (!mounted) return
        setChain(Array.isArray(blocks) ? (blocks as ChainBlock[]) : [])
        if (state) setChainHeight(Number(state.height ?? state.blocks ?? 0))
        if (health) {
          const h = (health as { health?: { peers?: unknown[]; connected?: boolean } }).health
          setMeshConnected(Boolean(h?.connected ?? ((h?.peers?.length ?? 0) > 0)))
          setMeshPeers(h?.peers?.length ?? 0)
        }
      } catch {}
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const demoSections = [
    {
      id: "prediction",
      title: "AI Disaster Prediction",
      description: "Risk derived live from reported incidents",
      icon: Brain,
    },
    {
      id: "alerts",
      title: "Real-time Alerts",
      description: "Instant oracle notifications, live",
      icon: AlertTriangle,
    },
    {
      id: "blockchain",
      title: "Blockchain Donations",
      description: "On-chain records mined live",
      icon: Heart,
    },
    {
      id: "offline",
      title: "Offline Capabilities",
      description: "Mesh-first features, no internet needed",
      icon: Smartphone,
    },
  ]

  const hazardRisk = (() => {
    const byHazard: Record<string, { count: number; sev: number }> = {}
    for (const inc of all) {
      const h = hazardLabel(inc.hazard_type)
      byHazard[h] = {
        count: (byHazard[h]?.count ?? 0) + 1,
        sev: Math.max(byHazard[h]?.sev ?? 0, inc.severity),
      }
    }
    return Object.entries(byHazard).map(([name, v]) => {
      const risk = Math.min(100, Math.round((v.sev / 10) * 100))
      const tier =
        risk >= 70 ? "destructive" : risk >= 45 ? "secondary" : "outline"
      return { name, count: v.count, risk, tier }
    })
  })()

  const topAlerts = all.slice().sort((a, b) => b.severity - a.severity).slice(0, 6)

  const blockRows = chain.slice().reverse().map((b, i) => {
    const incId = b.incidentId ?? b.transactions?.[0]?.incidentId ?? "genesis"
    const amount = b.transactions?.[0]?.amount ?? 0
    return {
      key: i,
      block: b.index,
      amount: amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "₹0 (local record)",
      incidentId: incId,
      time: b.timestamp ? new Date(b.timestamp).toLocaleTimeString() : "genesis",
    }
  })

  const statChips = [
    { icon: Activity, label: "Incidents live", value: all.length, color: "text-primary" },
    { icon: ShieldCheck, label: "Verified", value: stats?.verified ?? 0, color: "text-green-500" },
    { icon: AlertTriangle, label: "Pending", value: stats?.pending ?? 0, color: "text-orange-500" },
    { icon: Radio, label: "Mesh peers", value: meshPeers, color: "text-blue-500" },
    { icon: Database, label: "Chain height", value: chainHeight, color: "text-violet-500" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="kicker">01 — Live walkthrough</p>
            <h1 className="display mt-3 text-4xl md:text-5xl tracking-tight mb-4">Experience Resilio in Action</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every number below is fetched live from the oracle, mesh and chain — refreshed instantly
            </p>
            <div className="mt-6">
              <Button size="lg" asChild>
                <Link href="/ai-demo">
                  <Brain className="h-5 w-5 mr-2" />
                  Guided AI Walkthrough — one disaster, end-to-end
                </Link>
              </Button>
            </div>
          </div>

          {/* Live stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {statChips.map((chip) => (
              <Card key={chip.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <chip.icon className={`h-6 w-6 ${chip.color}`} />
                  <div>
                    <div className="text-xl font-bold">{chip.value}</div>
                    <div className="text-xs text-muted-foreground">{chip.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-8">
            <IndiaMap incidents={all} title="Live Incident Map" />
          </div>

          {/* Demo Navigation */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {demoSections.map((section) => (
              <Button
                key={section.id}
                variant={currentDemo === section.id ? "default" : "outline"}
                className="h-auto p-4 flex-col gap-2"
                onClick={() => setCurrentDemo(section.id)}
              >
                <section.icon className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold text-sm">{section.title}</div>
                  <div className="text-xs text-muted-foreground">{section.description}</div>
                </div>
              </Button>
            ))}
          </div>

          {/* Demo Content */}
          <div className="space-y-8">
            {currentDemo === "prediction" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Disaster Prediction Demo — live hazard risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <h3 className="font-semibold mb-4">Active Hazard Risk</h3>
                        {hazardRisk.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No incidents reported yet — risk map is empty.</p>
                        ) : (
                          <div className="space-y-4">
                            {hazardRisk.map((h) => (
                              <div key={h.name}>
                                <div className="flex justify-between items-center">
                                  <span>{h.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={h.tier as "destructive"}>{h.risk}% risk</Badge>
                                    <span className="text-xs text-muted-foreground">{h.count} report{h.count !== 1 ? "s" : ""}</span>
                                  </div>
                                </div>
                                <Progress value={h.risk} className="h-2 mt-1" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Live Recommendations</h4>
                        <div className="space-y-2">
                          {topAlerts.slice(0, 3).map((inc) => (
                            <div key={inc.incident_id} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>
                                Avoid {hazardLabel(inc.hazard_type)} zone near {inc.location} ({severityTier(inc.severity).label}, {inc.severity}/10)
                              </span>
                            </div>
                          ))}
                          {topAlerts.length === 0 && (
                            <p className="text-sm text-muted-foreground">No active hazard recommendations.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-6 rounded-lg">
                      <h3 className="font-semibold mb-4">Data Sources</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Oracle sensor telemetry</span>
                          <Badge variant="outline">Live</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Mesh corroborations</span>
                          <Badge variant="outline">{stats?.corroboration_avg ?? 0} avg</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>On-chain records</span>
                          <Badge variant="outline">{chainHeight} blocks</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Last refresh</span>
                          <Badge variant="outline">{refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : "—"}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentDemo === "alerts" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Real-time Alert System Demo — live oracle feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topAlerts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No alerts from the oracle right now.</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        {topAlerts.map((inc) => {
                          const tier = severityTier(inc.severity)
                          const border =
                            inc.severity >= 7 ? "border-red-500 bg-red-50" : inc.severity >= 4 ? "border-yellow-500 bg-yellow-50" : "border-blue-500 bg-blue-50"
                          const text = inc.severity >= 7 ? "text-red-800" : inc.severity >= 4 ? "text-yellow-800" : "text-blue-800"
                          return (
                            <div key={inc.incident_id} className={`border-l-4 p-4 rounded-r-lg ${border}`}>
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant={inc.severity >= 7 ? "destructive" : "secondary"}>
                                  {inc.severity >= 7 ? "URGENT" : "WARNING"} · {tier.label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {inc.submitted_at ? new Date(inc.submitted_at).toLocaleString() : "just now"}
                                </span>
                              </div>
                              <h4 className={`font-semibold ${text}`}>
                                {hazardLabel(inc.hazard_type)} near {inc.location}
                              </h4>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Severity {inc.severity}/10 · status {inc.status} · {inc.corroborations} corroboration(s) · {inc.incident_id}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant={inc.severity >= 7 ? "destructive" : "default"} asChild>
                                  <a href="/safe-route-finder">View Evacuation Routes</a>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <a href="/emergency-sos">Emergency Contacts</a>
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentDemo === "blockchain" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Blockchain Donation Tracking Demo — on-chain records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <h3 className="font-semibold mb-4">Recent On-chain Records</h3>
                        {blockRows.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Chain has no records yet — mine the first incident report to seed it.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {blockRows.slice(0, 6).map((row) => (
                              <div key={row.key} className="flex justify-between items-center p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{row.amount}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Block {row.block} · {row.incidentId}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline">Mined</Badge>
                                  <p className="text-xs text-muted-foreground mt-1">{row.time}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Transparency Features</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{chainHeight} blocks mined with signed reports</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Incident provenance tracks relief requests</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Verified reports (corroborations) show response priority</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-muted/30 p-6 rounded-lg">
                        <h3 className="font-semibold mb-4">Live Fund Allocation (per incident)</h3>
                        <div className="space-y-4">
                          {all.slice(0, 4).map((inc) => {
                            const target = inc.severity * 250000
                            const raised = inc.corroborations * 100000
                            const pct = Math.min(100, Math.round((raised / Math.max(1, target)) * 100))
                            return (
                              <div key={inc.incident_id}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{hazardLabel(inc.hazard_type)} · {inc.location}</span>
                                  <span>{pct}%</span>
                                </div>
                                <Progress value={pct} />
                              </div>
                            )
                          })}
                          {all.length === 0 && (
                            <p className="text-sm text-muted-foreground">No incidents to allocate funds yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          ₹{(all.reduce((s, inc) => s + inc.corroborations * 100000, 0)).toLocaleString("en-IN")}
                        </div>
                        <div className="text-sm text-muted-foreground">Relief value tracked for live incidents</div>
                        <Button className="mt-4" asChild>
                          <a href="/donor-dashboard">Make a Donation</a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentDemo === "offline" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Offline Capabilities Demo — mesh status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <h3 className="font-semibold mb-4">Available Offline</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">Emergency Contacts</p>
                              <p className="text-sm text-muted-foreground">Local emergency services baked in</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">Survival Guide</p>
                              <p className="text-sm text-muted-foreground">Step-by-step instructions always available</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">Offline Maps</p>
                              <p className="text-sm text-muted-foreground">Region packs downloadable for offline routing</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">SOS Beacon</p>
                              <p className="text-sm text-muted-foreground">Location sharing via mesh network</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-4">
                          <Button variant="default" asChild className="w-full justify-start">
                            <a href="/mesh">
                              <Radio className="h-4 w-4 mr-2" />
                              Open Mesh &amp; Family Hub
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-muted/30 p-6 rounded-lg">
                        <h3 className="font-semibold mb-4">Connection Status — live</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                              Internet Connection
                            </span>
                            <Badge variant={online ? "default" : "destructive"}>{online ? "Online" : "Offline"}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <Radio className="h-4 w-4" />
                              Mesh Network
                            </span>
                            <Badge variant={meshConnected ? "default" : "outline"}>
                              {meshConnected ? "Connected" : "Standalone"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Mesh incidents synced
                            </span>
                            <Badge variant="default">{meshIncidents.length}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              On-chain records
                            </span>
                            <Badge variant="default">{chainHeight}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                        <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h4 className="font-semibold mb-2">PWA Installation</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Install Resilio as a Progressive Web App for full offline functionality
                        </p>
                        <Button>Install App</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}