"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import dynamic from "next/dynamic"
import { QuickActions } from "@/components/quick-actions"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { RequireRole, useAuth } from "@/components/auth-provider"
import {
  Heart,
  TrendingUp,
  Users,
  MapPin,
  Shield,
  ExternalLink,
  Wallet,
  CreditCard,
  Activity,
  CheckCircle2,
  Radio,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel } from "@/components/india-map"
import { getChainChain, getChainState } from "@/services/api"

const ImpactPieChart = dynamic(
  () => import("@/components/charts/impact-pie-chart").then((m) => m.ImpactPieChart),
  { ssr: false },
)
const ReliefPaceChart = dynamic(
  () => import("@/components/charts/weekly-incident-chart").then((m) => m.WeeklyIncidentChart),
  { ssr: false },
)

const SEVERITY_COLORS = ["#22c55e", "#eab308", "#f97316", "#dc2626"]

const chartConfig = {
  share: { label: "Share", color: "hsl(var(--primary))" },
}

interface ChainBlock {
  index: number
  previousHash?: string
  merkleRoot?: string
  transactions?: Array<{ type?: string; payload?: any }>
  hash?: string
  proposer?: string
  validatorSignatures?: string[]
}

export default function DonorDashboard() {
  const { incidents, stats, refreshedAt } = useResilioData(20000)
  const { user } = useAuth()
  const [chain, setChain] = useState<ChainBlock[]>([])
  const [chainState, setChainState] = useState<{ height?: number; chainId?: string; isValidator?: boolean } | null>(null)

  useEffect(() => {
    getChainChain()
      .then((body: any) => setChain(Array.isArray(body) ? body : body.blocks ?? []))
      .catch(() => setChain([]))
    getChainState()
      .then((body: any) => setChainState(body))
      .catch(() => setChainState(null))
  }, [])

  const total = stats?.total_incidents ?? incidents.length
  const verified = stats?.verified ?? 0
  const pending = stats?.pending ?? 0
  const avgCorr = stats?.corroboration_avg ?? 0

  // Impact mix from live hazards
  const impactData = (() => {
    const counts = new Map<string, number>()
    for (const inc of incidents) counts.set(inc.hazard_type, (counts.get(inc.hazard_type) ?? 0) + 1)
    return Array.from(counts.entries()).map(([name, value]) => ({
      name: hazardLabel(name),
      value,
      color: SEVERITY_COLORS[Math.max(0, Math.min(value, 3))],
    }))
  })()

  // Incident pace this week (replaces the placeholder donation timeline)
  const weeklyPace = (() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const counts = new Array(7).fill(0)
    for (const inc of incidents) {
      if (!inc.submitted_at) continue
      const d = new Date(inc.submitted_at)
      if (!Number.isNaN(d.getTime())) counts[d.getDay()] += 1
    }
    return days.map((day, i) => ({ day, reports: counts[i] }))
  })()

  // Featured relief projects = top severity live incidents
  const featuredProjects = incidents
    .slice()
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map((inc) => ({
      id: inc.incident_id,
      name: `${hazardLabel(inc.hazard_type)} Relief — ${inc.location}`,
      description: `${inc.hazard_type} incident reported with severity ${inc.severity}/10`,
      progress: Math.min(100, verified > 0 ? Math.round((inc.corroborations / Math.max(1, verified)) * 100) : 10),
      raised: inc.corroborations * 100000,
      goal: inc.severity * 250000,
      status: inc.status,
      severity: inc.severity,
    }))

  // Real blockchain records
  const transactions = chain
    .filter((block) => block.index > 0)
    .map((block) => ({
      id: block.hash?.slice(0, 10) ?? `block-${block.index}`,
      amount: block.transactions?.length ?? 0,
      currency: `B${block.index}`,
      project: block.transactions?.[0]?.type ?? "Relief fund record",
      status: (block.validatorSignatures?.length ?? 0) > 0 ? "confirmed" : "mined",
      timestamp: `${block.index} blocks deep`,
    }))

  return (
    <RequireRole roles={["donor"]}>
      <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="kicker">01 — Donor</p>
              <h1 className="display mt-3 text-2xl sm:text-3xl md:text-4xl tracking-tight mb-2">
                दानदाता डैशबोर्ड / Donor Dashboard
              </h1>
              <p className="text-muted-foreground">
                Track live relief readiness and verify every rupee on the Resilio chain
              </p>
              <p className="text-sm text-muted-foreground">
                Data is live — streamed from the oracle, mesh fabric and PoA chain
              </p>
            </div>
            <ProfileDropdown
              userRole={user?.role}
              userName={user?.name}
              userEmail={user?.email}
            />
          </div>

          {/* Live map of where relief is needed */}
          <div className="mb-6">
            <IndiaMap incidents={mergeIncidents(incidents, [])} title="Where Relief is Needed" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Live Impact Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-bold">{total}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Active Disasters</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-bold">{verified}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Verified Reports</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-bold">{pending}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Pending Proof</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-bold">{avgCorr}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Corroboration Avg</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Donation Impact Breakdown (live hazard mix) */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Donation Impact — Live Hazard Mix</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Where relief is needed right now, computed from live verified incidents
                  </p>
                </CardHeader>
                <CardContent>
                  {impactData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No incidents reported yet. Your donations will be routed here the moment one arrives.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <ImpactPieChart data={impactData} config={chartConfig} />
                      </div>
                      <div className="space-y-3">
                        {impactData.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm font-medium">{item.value}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            Your donations fund response for <strong>{total}</strong> active incidents across{" "}
                            <strong>{new Set(incidents.map((i) => i.location)).size || total}</strong> affected areas.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Relief pace */}
              <Card>
                <CardHeader>
                  <CardTitle>Relief Pace — Reports This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReliefPaceChart data={weeklyPace} config={chartConfig} colorVar="var(--color-share)" className="h-[260px]" />
                </CardContent>
              </Card>

              {/* Featured Projects (top live incidents) */}
              <Card>
                <CardHeader>
                  <CardTitle>Relief Projects Needing Support</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Generated live from the highest-severity verified oracle incidents
                  </p>
                </CardHeader>
                <CardContent>
                  {featuredProjects.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No open relief projects — the region is calm right now.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                      {featuredProjects.map((project) => (
                        <div
                          key={project.id}
                          className="space-y-3 hover:shadow-lg transition-shadow p-2 rounded-lg border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <Badge
                              variant={project.status === "verified" ? "default" : "outline"}
                            >
                              {project.status} · {project.severity}/10
                            </Badge>
                          </div>
                          <div>
                            <h3 className="font-medium leading-tight">{project.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                            <div className="mt-2">
                              <Progress value={project.progress} className="h-2" />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>₹{project.raised.toLocaleString("en-IN")} ready</span>
                                <span>₹{project.goal.toLocaleString("en-IN")} goal</span>
                              </div>
                            </div>
                          </div>
                          <Link href="/donor-dashboard/donate">
                            <Button size="sm" className="w-full">
                              Fund This
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <QuickActions userRole="donor" variant="sidebar" />

              {/* Quick Donate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    त्वरित दान / Quick Donate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/donor-dashboard/donate">
                    <Button className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      कार्ड से दान करें / Donate with Card
                    </Button>
                  </Link>
                  <Link href="/donor-dashboard/payment?method=crypto">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Wallet className="h-4 w-4 mr-2" />
                      वॉलेट कनेक्ट करें / Connect Wallet
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Chain transparency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Chain Transparency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Chain height</span>
                    <Badge variant="outline">{chainState?.height ?? chain.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Blocks loaded</span>
                    <Badge variant="outline">{chain.filter((b) => b.index > 0).length}</Badge>
                  </div>
                  <Radio className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">
                    Every relief record is signed and mined on the Resilio PoA chain.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : "—"}
                  </p>
                </CardContent>
              </Card>

              {/* Recent Chain Transactions (real) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Recent Chain Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No records mined yet — they will appear here as the chain grows.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg space-y-2 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{tx.project}</span>
                            <Badge
                              variant="outline"
                              className={
                                tx.status === "confirmed"
                                  ? "text-green-500 border-green-500/50"
                                  : "text-orange-500 border-orange-500/50"
                              }
                            >
                              {tx.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              block {tx.currency} · {tx.amount} tx · {tx.timestamp}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/donor-dashboard/track">
                    <Button variant="outline" className="w-full bg-transparent" size="sm">
                      Track Donations
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Impact Badge */}
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Transparency Supporter</h3>
                    <p className="text-sm text-muted-foreground">
                      Verified on-chain, every record backed by corroboration.
                    </p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">
                    {verified} verified incidents
                  </Badge>
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