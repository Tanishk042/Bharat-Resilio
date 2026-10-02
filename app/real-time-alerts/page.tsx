"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, MapPin, Clock, Users, Shield, Phone, Zap, Radio } from "lucide-react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"

type FilterTab = "all" | "verified" | "pending"

export default function RealTimeAlerts() {
  const { incidents, meshIncidents, stats, loading, refresh } = useResilioData()
  const [filter, setFilter] = useState<FilterTab>("all")

  const merged = mergeIncidents(incidents, meshIncidents)

  const filtered = filter === "all"
    ? merged
    : merged.filter((i) => i.status === filter)

  const totalCorroborations = merged.reduce((sum, i) => sum + i.corroborations, 0)

  const safetyGuidelines = [
    "Stay informed with trusted news sources and alerts",
    "Prepare an emergency kit with essentials for at least 72 hours",
    "Follow evacuation orders and routes as directed by local authorities",
    "Create a communication plan with family and friends",
    "Ensure your home is fortified against potential disaster impacts",
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="kicker">01 — Verified</p>
            <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">Real-Time Alerts</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">Stay informed about active disasters and emergency situations</p>
          </div>

          <div className="mb-6">
            <IndiaMap incidents={merged} title="Live Alerts Map" />
          </div>

          <div className="flex items-center gap-2 mb-6">
            {(["all", "verified", "pending"] as FilterTab[]).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={filter === tab ? "default" : "outline"}
                onClick={() => setFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-1.5 text-xs opacity-70">
                  {tab === "all" ? merged.length : merged.filter((i) => i.status === tab).length}
                </span>
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={refresh} className="ml-auto">
              Refresh
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    Live Updates
                    {loading && <span className="text-xs text-muted-foreground ml-2">Loading…</span>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Real-time disaster information and emergency alerts</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filtered.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No incidents to display.</p>
                  )}
                  {filtered.map((incident) => {
                    const tier = severityTier(incident.severity)
                    const sevColor =
                      incident.severity >= 7
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : incident.severity >= 4
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-green-500/10 text-green-500 border-green-500/20"
                    const statusColor =
                      incident.status === "verified"
                        ? "bg-green-500/10 text-green-500"
                        : incident.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-gray-500/10 text-gray-500"
                    const ts = incident.submitted_at
                      ? new Date(Number(incident.submitted_at)).toLocaleString()
                      : "Unknown time"

                    return (
                      <Card key={incident.incident_id} className={`border ${sevColor}`}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                <div>
                                  <h3 className="font-semibold">{hazardLabel(incident.hazard_type)}</h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{ts}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge className={sevColor}>{tier.label} {incident.severity}/10</Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm">
                                <strong>Status:</strong>{" "}
                                <Badge className={statusColor}>{incident.status}</Badge>
                              </div>
                              <div className="text-sm">
                                <strong>Location:</strong> {incident.location}
                              </div>
                              <div className="text-sm">
                                <strong>Corroborations:</strong> {incident.corroborations}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Safety Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {safetyGuidelines.map((guideline: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-green-500">{index + 1}</span>
                        </div>
                        <p className="text-sm">{guideline}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-500" />
                    Emergency Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg space-y-2">
                      <h3 className="font-medium">Emergency Services</h3>
                      <div className="text-2xl font-bold text-red-500">911</div>
                      <p className="text-sm text-muted-foreground">Police, Fire, Medical Emergency</p>
                    </div>
                    <div className="p-4 border rounded-lg space-y-2">
                      <h3 className="font-medium">Disaster Hotline</h3>
                      <div className="text-2xl font-bold text-orange-500">1-800-DISASTER</div>
                      <p className="text-sm text-muted-foreground">24/7 Disaster Information</p>
                    </div>
                    <div className="p-4 border rounded-lg space-y-2">
                      <h3 className="font-medium">Red Cross</h3>
                      <div className="text-2xl font-bold text-blue-500">1-800-RED-CROSS</div>
                      <p className="text-sm text-muted-foreground">Emergency Assistance</p>
                    </div>
                    <div className="p-4 border rounded-lg space-y-2">
                      <h3 className="font-medium">Local Emergency</h3>
                      <div className="text-2xl font-bold text-green-500">311</div>
                      <p className="text-sm text-muted-foreground">Non-Emergency Services</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{stats?.total_incidents ?? merged.length}</div>
                      <div className="text-xs text-muted-foreground">Total Incidents</div>
                    </div>
                    <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-orange-500">{stats?.verified ?? merged.filter((i) => i.status === "verified").length}</div>
                      <div className="text-xs text-muted-foreground">Verified</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">{stats?.pending ?? merged.filter((i) => i.status === "pending").length}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{totalCorroborations}</div>
                      <div className="text-xs text-muted-foreground">Total Corroborations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Emergency
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    Update Location
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Check on Family
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Emergency Checklist
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Push Notifications</span>
                    <div className="w-10 h-6 bg-primary rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SMS Alerts</span>
                    <div className="w-10 h-6 bg-primary rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Updates</span>
                    <div className="w-10 h-6 bg-muted rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full bg-transparent">
                    Customize Alerts
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
