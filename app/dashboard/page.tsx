"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  AlertTriangle,
  Shield,
  Target,
  Star,
  FileText,
  MapPin,
  Activity,
  TrendingUp,
  Radio,
} from "lucide-react"
import { MeshStatus } from "@/components/mesh-status"
import { MeshLocationShare } from "@/components/mesh-location-share"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { RequireRole, useAuth } from "@/components/auth-provider"
import { useMeshHealth } from "@/components/connectivity-provider"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"

const WeeklyIncidentChart = dynamic(
  () => import("@/components/charts/weekly-incident-chart").then((m) => m.WeeklyIncidentChart),
  { ssr: false },
)
import { IndiaMap, hazardLabel } from "@/components/india-map"
import Link from "next/link"

const SEVERITY_COLORS = ["#22c55e", "#eab308", "#f97316", "#dc2626"]

export default function CivilianDashboard() {
  const { incidents, meshIncidents, stats, loading, refreshedAt } = useResilioData(15000)
  const { connected } = useMeshHealth()
  const { user } = useAuth()
  const [hazardPrediction, setHazardPrediction] = useState<any>(null)

  useEffect(() => {
    // One-off hazard prediction using the ML engine with live sensor-style input.
    const load = async () => {
      try {
        const { predictHazard } = await import("@/services/api")
        const prediction = await predictHazard({
          seismic_magnitude: 2.5,
          seismic_frequency: 5.0,
          barometric_pressure: 1013,
          barometric_trend: -0.5,
          water_level: 0.2,
          water_flow_rate: 1.5,
          wind_speed: 15,
          temperature: 25,
          audio_anomaly_weight: 0.1,
          precipitation: 0,
        })
        setHazardPrediction(prediction)
      } catch {
        setHazardPrediction(null)
      }
    }
    load()
  }, [])

  const all = mergeIncidents(incidents, meshIncidents)

  // Real activity chart: verified/pending per day of the week derived from reports.
  const weeklyTrend = (() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const counts = new Array(7).fill(0)
    for (const inc of all) {
      if (!inc.submitted_at) continue
      const d = new Date(inc.submitted_at)
      if (!Number.isNaN(d.getTime())) counts[d.getDay()] += 1
    }
    return days.map((day, i) => ({
      day,
      reports: counts[i],
    }))
  })()

  const hazardMix = (() => {
    const counts = new Map<string, number>()
    for (const inc of all) counts.set(inc.hazard_type, (counts.get(inc.hazard_type) ?? 0) + 1)
    return Array.from(counts.entries()).map(([name, value]) => ({
      name: hazardLabel(name),
      value,
      color: SEVERITY_COLORS[Math.min(value, 3)],
    }))
  })()

  const verified = stats?.verified ?? 0
  const pending = stats?.pending ?? 0
  const total = stats?.total_incidents ?? all.length
  const avgCorr = stats?.corroboration_avg ?? 0
  const maxSeverity = all.reduce((max, inc) => Math.max(max, inc.severity), 0)

  const chartConfig = {
    reports: {
      label: "Reports",
      color: "hsl(var(--primary))",
    },
  }

  return (
    <RequireRole roles={["civilian"]}>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="kicker">01 — Civilian</p>
                <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">Civilian Dashboard</h1>
                <p className="mt-3 text-muted-foreground max-w-2xl">
                  {user ? `Welcome, ${user.name} — ` : ""}Stay prepared and informed — data streamed live from the
                  Resilio oracle, mesh and AI engines
                </p>
              </div>
              <ProfileDropdown userRole={user?.role} userName={user?.name} userEmail={user?.email} />
            </div>

          {/* Live map */}
          <div className="mb-6">
            <IndiaMap incidents={all} title="Live Disaster Map" />
          </div>

          {/* Mesh location share — offline device-to-device */}
          <div className="mb-6">
            <MeshLocationShare />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Prediction Alert */}
              <Card className="border-orange-500/20 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">AI Disaster Prediction</CardTitle>
                    <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                      {hazardPrediction ? `${Math.round(hazardPrediction.confidence * 100)}% Confidence` : "Live ML engine"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {hazardPrediction
                          ? `Risk Level: ${hazardPrediction.tier_name} (${hazardPrediction.severity_score}/10)`
                          : "Analyzing multi-sensor telemetry…"}
                      </span>
                      <span className="text-2xl font-bold text-orange-500">
                        {hazardPrediction ? `${Math.round(hazardPrediction.severity_score * 10)}%` : "--"}
                      </span>
                    </div>
                    <Progress
                      value={hazardPrediction ? hazardPrediction.severity_score * 10 : 0}
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {hazardPrediction
                        ? `Based on multi-sensor analysis. Danger Tier: ${hazardPrediction.tier_name}.`
                        : "Sensor baseline: normal atmospheric and seismic conditions."}
                      <strong className="text-foreground"> Recommended action:</strong>{" "}
                      {hazardPrediction?.danger_tier === 2
                        ? "Immediate evacuation recommended."
                        : hazardPrediction?.danger_tier === 1
                          ? "Monitor situation closely."
                          : "Continue normal activities. Stay alert for official alerts."}
                    </p>
                    <Button size="sm" className="mt-2" asChild>
                      <Link href="/ai-survival-assistant">Ask the Assistant</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Incident activity this week */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    This Week · Incident Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <div className="text-sm text-muted-foreground">total reports</div>
                        <div className="text-2xl font-bold">{total}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">peak severity</div>
                        <div className="text-2xl font-bold">{maxSeverity > 0 ? `${maxSeverity}/10` : "—"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">corroboration avg</div>
                        <div className="text-2xl font-bold">{avgCorr}</div>
                      </div>
                    </div>

                    <WeeklyIncidentChart data={weeklyTrend} config={chartConfig} />
                  </div>
                </CardContent>
              </Card>

              {/* Hazard mix */}
              {hazardMix.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Current Hazard Mix
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {hazardMix.map((item) => (
                        <div key={item.name} className="text-center p-4 bg-card rounded-lg border">
                          <div
                            className="h-8 w-8 mx-auto mb-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="text-sm text-muted-foreground">{item.name}</div>
                          <div className="text-xl font-bold">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preparedness goal */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="flex items-center gap-4">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span className="font-medium">Verified reports</span>
                    </div>
                    <div className="text-3xl font-bold">{verified}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pending} pending corroboration via the oracle
                    </p>
                  </CardContent>
                </Card>
                <Card className="flex items-center gap-4">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Star className="h-5 w-5 text-primary" />
                      <span className="font-medium">Mesh fabric</span>
                    </div>
                    <div className="text-3xl font-bold">
                      {meshIncidents.length}
                      <span className="text-base text-muted-foreground"> incidents</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {connected ? "Connected to live CRDT network" : "Mesh currently offline"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Live Network Status */}
              <MeshStatus />

              {/* Preparedness snapshot */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Latest Incident
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {all.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No incidents reported yet — be the first to report one.
                    </p>
                  ) : (
                    all
                      .slice()
                      .sort((a, b) => (b.submitted_at ?? 0) - (a.submitted_at ?? 0))
                      .slice(0, 3)
                      .map((inc, i) => (
                        <div key={inc.incident_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle
                              className="h-4 w-4"
                              style={{ color: ["#dc2626", "#f97316", "#eab308"][Math.min(i, 2)] }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm capitalize">
                              {hazardLabel(inc.hazard_type)} Alert
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {inc.location} · Severity {inc.severity}/10 · {inc.status}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                  <p className="text-xs text-muted-foreground">
                    {loading ? "Loading live feed…" : `Updated ${refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : "—"}`}
                  </p>
                  <Button variant="outline" className="w-full mt-2 bg-transparent" asChild>
                    <Link href="/real-time-alerts">View all alerts</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="default" className="w-full justify-start bg-transparent" size="sm" asChild>
                    <Link href="/mesh">
                      <Radio className="h-4 w-4 mr-2 text-primary" />
                      Mesh &amp; Family Hub
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm" asChild>
                    <Link href="/citizen-report">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report Emergency
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm" asChild>
                    <Link href="/ai-survival-assistant">
                      <Brain className="h-4 w-4 mr-2" />
                      Ask AI Assistant (voice)
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm" asChild>
                    <Link href="/offline-maps">
                      <MapPin className="h-4 w-4 mr-2" />
                      Download Offline Maps
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="sm" asChild>
                    <Link href="/safe-route-finder">
                      <FileText className="h-4 w-4 mr-2" />
                      Find Safe Route
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      </div>
      </RequireRole>
  )
}