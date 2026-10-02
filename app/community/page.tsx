"use client"

import { useMemo, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Users,
  MessageCircle,
  Heart,
  MapPin,
  Plus,
  HandHeart,
  Shield,
  Clock,
  TrendingUp,
  Radio,
  CheckCircle,
} from "lucide-react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"

interface FeedPost {
  id: string
  hazard: string
  location: string
  severity: number
  status: string
  corroborations: number
  timestamp: number
  viaMesh?: boolean
  content: string
}

function fmtTime(value?: number | string): string {
  if (value === undefined || value === null || value === "") return "recent"
  const raw = Number(value)
  if (Number.isNaN(raw) || raw <= 0) return String(value)
  const ts = raw < 1e12 ? raw * 1000 : raw
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function CommunityPage() {
  const { incidents, meshIncidents, stats, refresh } = useResilioData()
  const [draft, setDraft] = useState("")
  const [localPosts, setLocalPosts] = useState<FeedPost[]>([])

  const allIncidents = useMemo(() => mergeIncidents(incidents, meshIncidents), [incidents, meshIncidents])

  const feedPosts = useMemo(() => {
    const incidentPosts: FeedPost[] = allIncidents.map((inc) => ({
      id: inc.incident_id,
      hazard: inc.hazard_type,
      location: inc.location,
      severity: inc.severity,
      status: inc.status,
      corroborations: inc.corroborations,
      timestamp: Number(inc.submitted_at ?? 0) || 0,
      content: `Neighbouring user reported ${hazardLabel(inc.hazard_type)} near ${inc.location} — severity ${inc.severity}/10, ${inc.status}, ${inc.corroborations} corroborations`,
    }))
    return [...localPosts, ...incidentPosts].sort((a, b) => b.timestamp - a.timestamp)
  }, [allIncidents, localPosts])

  const distinctLocations = useMemo(() => {
    const seen = new Set<string>()
    return allIncidents.filter((inc) => {
      const key = inc.location.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [allIncidents])

  const statCards = useMemo(() => {
    const corroborations = allIncidents.reduce((sum, inc) => sum + inc.corroborations, 0)
    return [
      { label: "Active Incidents", value: String(stats?.total_incidents ?? allIncidents.length), icon: Shield, color: "text-blue-500" },
      { label: "Verified", value: String(stats?.verified ?? 0), icon: CheckCircle, color: "text-green-500" },
      { label: "Pending", value: String(stats?.pending ?? 0), icon: Clock, color: "text-orange-500" },
      { label: "Corroborations", value: String(corroborations), icon: Users, color: "text-red-500" },
    ]
  }, [allIncidents, stats])

  const trending = useMemo(() => {
    const counts = new Map<string, number>()
    for (const inc of allIncidents) {
      counts.set(inc.hazard_type, (counts.get(inc.hazard_type) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ht, count]) => ({ tag: `#${hazardLabel(ht).replace(/[^a-zA-Z]/g, "")}`, count }))
  }, [allIncidents])

  const recent = useMemo(
    () =>
      [...allIncidents]
        .sort((a, b) => (Number(b.submitted_at ?? 0) || 0) - (Number(a.submitted_at ?? 0) || 0))
        .slice(0, 5),
    [allIncidents],
  )

  const submitPost = () => {
    const text = draft.trim()
    if (!text) return
    setLocalPosts((prev) => [
      {
        id: `local-${Date.now()}`,
        hazard: "community",
        location: "your area",
        severity: 5,
        status: "posted via mesh",
        corroborations: 1,
        timestamp: Date.now(),
        viaMesh: true,
        content: text,
      },
      ...prev,
    ])
    setDraft("")
  }

  return (
    <div className="min-h-screen bg-background mesh-network">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <p className="kicker">01 — Neighbourhood</p>
            <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">Community Hub</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">Connect, volunteer, and support disaster relief efforts together</p>
          </div>

          {/* Community Reported Incidents Map */}
          <div className="mb-8">
            <IndiaMap incidents={allIncidents} title="Community-reported incidents" />
          </div>

          {/* Community Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="glassmorphism neon-glow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Community Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Community Feed */}
              <Card className="glassmorphism">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Community Feed
                    </CardTitle>
                    <Button size="sm" variant="outline" className="glassmorphism bg-transparent" onClick={() => refresh()}>
                      <Clock className="h-4 w-4 mr-2" />
                      Refresh Feed
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Share an update with the community..."
                      className="flex-1 glassmorphism"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitPost()
                      }}
                    />
                    <Button className="neon-glow" onClick={submitPost}>
                      <Plus className="h-4 w-4 mr-2" />
                      Post
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {feedPosts.map((post) => (
                      <div key={post.id} className="p-4 border rounded-lg space-y-3 glassmorphism">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{post.location.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{post.viaMesh ? "You" : "Neighbour"}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{fmtTime(post.timestamp)}</span>
                              {post.viaMesh && (
                                <Badge variant="secondary" className="text-[10px]">
                                  posted via mesh
                                </Badge>
                              )}
                            </div>
                          </div>
                          {!post.viaMesh && (
                            <div className="ml-auto">
                              <Badge variant="outline" className={severityTier(post.severity).text}>
                                {severityTier(post.severity).label} {post.severity}/10
                              </Badge>
                            </div>
                          )}
                        </div>

                        <p className="text-sm">{post.content}</p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Heart className="h-4 w-4 mr-1" />
                            {post.corroborations} supporting
                          </Button>
                          {!post.viaMesh && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {post.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {feedPosts.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">No community updates yet.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Volunteer Opportunities */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HandHeart className="h-5 w-5" />
                    Volunteer Opportunities
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Volunteers needed near active incident locations</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {distinctLocations.map((inc) => (
                    <Card key={inc.incident_id} className="glassmorphism">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback>{inc.location.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                  Volunteer needed in {inc.location}
                                  <Badge className="bg-orange-500 text-white">Urgent</Badge>
                                </h3>
                                <p className="text-sm text-muted-foreground">{hazardLabel(inc.hazard_type)} response</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={severityTier(inc.severity).text}>
                              {severityTier(inc.severity).label} {inc.severity}/10
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{inc.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{inc.corroborations} corroborations</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1">
                              Volunteer Now
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                              Learn More
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {distinctLocations.length === 0 && (
                    <p className="text-sm text-muted-foreground">No volunteer opportunities yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Local Community Updates */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-yellow-500" />
                    Local Community Updates
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Updates propagated by neighbouring nodes on the mesh
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {meshIncidents.map((inc) => (
                    <div key={inc.incident_id} className="p-4 border rounded-lg space-y-1.5 glassmorphism">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {inc.location}
                        </span>
                        <Badge variant="outline" className={severityTier(inc.severity).text}>
                          {hazardLabel(inc.hazard_type)} · {inc.severity}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{inc.status}</span> · {inc.corroborations} corroborations ·{" "}
                        {fmtTime(inc.submitted_at)}
                      </p>
                    </div>
                  ))}

                  {meshIncidents.length === 0 && (
                    <p className="text-sm text-muted-foreground">No mesh updates yet.</p>
                  )}

                  <IndiaMap
                    incidents={meshIncidents}
                    title="Where neighbours reported incidents"
                    height="h-[260px]"
                    showLegend={false}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="glassmorphism neon-glow">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start neon-glow">
                    <HandHeart className="h-4 w-4 mr-2" />
                    Become a Volunteer
                  </Button>
                  <Button variant="outline" className="w-full justify-start glassmorphism bg-transparent">
                    <Heart className="h-4 w-4 mr-2" />
                    Make a Donation
                  </Button>
                  <Button variant="outline" className="w-full justify-start glassmorphism bg-transparent">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Join Discussion
                  </Button>
                  <Button variant="outline" className="w-full justify-start glassmorphism sos-pulse bg-transparent">
                    <Shield className="h-4 w-4 mr-2" />
                    Report Emergency
                  </Button>
                </CardContent>
              </Card>

              {/* Trending Topics */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trending Topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {trending.map((t) => (
                      <div key={t.tag} className="flex items-center justify-between">
                        <span className="text-sm">{t.tag}</span>
                        <span className="text-xs text-muted-foreground">{t.count} reports</span>
                      </div>
                    ))}
                    {trending.length === 0 && <p className="text-sm text-muted-foreground">No trending topics yet.</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    {recent.map((inc) => (
                      <div key={inc.incident_id} className="flex items-center gap-3 text-sm">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: severityTier(inc.severity).dot }}
                        />
                        <span>
                          {hazardLabel(inc.hazard_type)} reported in {inc.location}
                        </span>
                      </div>
                    ))}
                    {recent.length === 0 && <p className="text-sm text-muted-foreground">No recent activity yet.</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Community Guidelines */}
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Community Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p>• Be respectful and supportive</p>
                    <p>• Share accurate information only</p>
                    <p>• Protect personal privacy</p>
                    <p>• Report suspicious activity</p>
                    <p>• Help others in need</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Read Full Guidelines
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