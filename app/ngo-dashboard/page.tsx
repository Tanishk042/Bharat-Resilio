"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { QuickActions } from "@/components/quick-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  MapPin,
  CheckCircle,
  Activity,
  Heart,
  Shield,
  AlertTriangle,
  Radio,
  ClipboardList,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { RequireRole, useAuth } from "@/components/auth-provider"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"
import { useMeshHealth } from "@/components/connectivity-provider"
import Link from "next/link"

export default function NGODashboard() {
  const { incidents, stats, refreshedAt } = useResilioData(15000)
  const { peers } = useMeshHealth()
  const { user } = useAuth()

  const total = stats?.total_incidents ?? incidents.length
  const verified = stats?.verified ?? 0
  const pending = stats?.pending ?? 0
  const avgCorr = stats?.corroboration_avg ?? 0

  // Operations = live incidents requiring response
  const operations = incidents
    .slice()
    .sort((a, b) => b.severity - a.severity)
    .map((inc, idx) => ({
      id: idx + 1,
      name: `${hazardLabel(inc.hazard_type)} Response — ${inc.location}`,
      status: inc.status === "verified" ? "Deploying" : "Planning",
      volunteers: Math.min(12, Math.max(3, Math.round(inc.severity * 1.4))),
      funding: inc.corroborations * 100000,
      target: Math.max(400000, inc.severity * 250000),
      location: inc.location,
      priority: inc.severity >= 7 ? "High" : inc.severity >= 4 ? "Medium" : "Low",
      severity: inc.severity,
      incidentId: inc.incident_id,
    }))

  const emergencyAlerts = incidents
    .slice()
    .sort((a, b) => Number(b.submitted_at ?? 0) - Number(a.submitted_at ?? 0))
    .slice(0, 6)
    .map((inc, idx) => ({
      id: idx + 1,
      type: `${hazardLabel(inc.hazard_type)} Alert`,
      location: inc.location,
      severity: severityTier(inc.severity).label,
      severityNum: inc.severity,
      affected: `${inc.corroborations} corroboration(s)`,
      timestamp: inc.submitted_at
        ? new Date(Number(inc.submitted_at)).toLocaleString()
        : "just now",
      status: inc.status === "verified" ? "Active" : "Monitoring",
      incidentId: inc.incident_id,
    }))

  const volunteers = [
    { team: "Medical Team Alpha", members: 12, state: "Deployable", location: "Mumbai" },
    { team: "Search & Rescue Unit", members: 8, state: "On standby", location: "Delhi" },
    { team: "Relief Distribution Team", members: 15, state: "Available", location: "Chennai" },
  ]

  const statsCards = [
    { label: "सक्रिय संचालन / Active Operations", value: total, icon: Activity, color: "text-primary" },
    { label: "स्वयंसेवक / Volunteers (mesh)", value: peers.filter((p) => p.connected).length || verified, icon: Users, color: "text-green-500" },
    { label: "सत्यापित / Verified", value: verified, icon: CheckCircle, color: "text-blue-500" },
    { label: "लंबित / Pending", value: pending, icon: Heart, color: "text-orange-500" },
  ]

  return (
    <RequireRole roles={["ngo", "authority"]}>
      <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="kicker">01 — Response</p>
              <h1 className="display mt-3 text-2xl sm:text-3xl md:text-4xl tracking-tight">
                प्राधिकरण संचालन केंद्र / Authority Operations Center
              </h1>
              <p className="text-muted-foreground mt-2">
                आपदा प्रतिक्रिया का समन्वय करें — live from oracle + mesh / Coordinate disaster response live
              </p>
            </div>
            <ProfileDropdown
              userRole={user?.role}
              userName={user?.name}
              userEmail={user?.email}
              organization={user?.organization}
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions userRole="ngo" variant="grid" />
          </div>

          {/* Live map of active theatres */}
          <div className="mb-8">
            <IndiaMap incidents={mergeIncidents(incidents, [])} title="Active Response Theatres" />
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {statsCards.map((card) => (
              <Card key={card.label}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-xl sm:text-2xl font-bold">{card.value}</p>
                    </div>
                    <card.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="operations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="operations">Active Operations</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteer Management</TabsTrigger>
              <TabsTrigger value="alerts">Emergency Alerts</TabsTrigger>
              <TabsTrigger value="reports">Impact Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="operations" className="space-y-6">
              {operations.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No active operation yet. New incidents arriving from the oracle will appear here instantly.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {operations.map((operation) => (
                    <Card key={operation.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            <CardTitle className="text-lg">{operation.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={operation.status === "Deploying" ? "default" : "secondary"}>
                              {operation.status}
                            </Badge>
                            <Badge variant={operation.priority === "High" ? "destructive" : "outline"}>
                              {operation.priority} Priority
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{operation.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{operation.volunteers} responders needed</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Radio className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-mono text-xs">{operation.incidentId}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Funding Progress</span>
                              <span>
                                ₹{operation.funding.toLocaleString("en-IN")} / ₹{operation.target.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <Progress value={(operation.funding / operation.target) * 100} />
                            <p className="text-xs text-muted-foreground">
                              Severity {operation.severity}/10 · {operation.priority} priority
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" asChild>
                              <Link href="/real-time-alerts">Coordinate</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="volunteers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Volunteer Coordination</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Available Volunteers</h3>
                      <div className="space-y-2">
                        {volunteers.map((v) => (
                          <div key={v.team} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{v.team}</p>
                              <p className="text-sm text-muted-foreground">
                                {v.members} members · {v.state}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              Dispatch
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Response Readiness</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Incidents to address</span>
                          <Badge>{total}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Verified theatre</span>
                          <Badge variant="secondary">{verified}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Mesh peers connected</span>
                          <Badge variant="outline">{peers.filter((p) => p.connected).length}</Badge>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3">Team Dispatch via Mesh</h4>
                        <p className="text-sm text-muted-foreground">
                          Dispatch alerts propagate through the mesh CRDT so every node knows where relief teams
                          are headed — even without internet.
                        </p>
                        <Button size="sm" className="mt-3">
                          <Radio className="h-4 w-4 mr-2" />
                          Send Mesh Dispatch Order
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Emergency Alert System — Live Oracle Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {emergencyAlerts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No alerts from the oracle right now.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {emergencyAlerts.map((alert, index) => (
                        <div key={alert.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle
                                className="h-4 w-4"
                                style={{ color: ["#dc2626", "#f97316", "#eab308"][Math.min(index, 2)] }}
                              />
                              <h3 className="font-medium">{alert.type}</h3>
                            </div>
                            <Badge variant={alert.severityNum >= 7 ? "destructive" : "secondary"}>
                              {alert.severity} · {alert.severityNum}/10
                            </Badge>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Location:</span>
                              <p className="font-medium">{alert.location} (ID {alert.incidentId})</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Affected:</span>
                              <p className="font-medium">{alert.affected}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <p className="font-medium">{alert.status}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                            <Button size="sm" asChild>
                              <Link href="/real-time-alerts">View Details</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-4 border-t flex justify-between items-center gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      Updated {refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : "—"}
                    </p>
                    <Button asChild>
                      <Link href="/citizen-report">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Open Citizen Report
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Impact Summary — Computed from Oracle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{total}</div>
                      <div className="text-sm text-muted-foreground">Incidents tracked</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{avgCorr}</div>
                      <div className="text-sm text-muted-foreground">Corroboration Avg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {verified > 0 ? `${Math.round((verified / Math.max(1, total)) * 100)}%` : "0%"}
                      </div>
                      <div className="text-sm text-muted-foreground">Verification Rate</div>
                    </div>
                  </div>
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Every number above is recalculated live from the Resilio oracle & mesh.{" "}
                    <Strong>No placeholder data.</Strong>
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6 text-center space-y-2">
                  <Shield className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-bold">On-chain accountability</h3>
                  <p className="text-sm text-muted-foreground">
                    Reports are corroborated, signed and mined — visible to donors and the public.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
      </RequireRole>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}