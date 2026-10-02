"use client"

import { useState, useEffect, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Heart,
  Shield,
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  MapPin,
  Users,
  HandHeart,
} from "lucide-react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel } from "@/components/india-map"
import { getGuidance } from "@/services/api"

interface PackData {
  guidance: string
  steps: string[]
  safetyNotes: string[]
  sources: string[]
}

const fallbackGuidance: Record<string, string> = {
  flood: "Move to higher ground and avoid flooded areas. Secure important documents and emergency supplies.",
  fire: "Evacuate immediately if instructed by authorities. Close windows and doors behind you.",
  earthquake: "Drop, Cover, and Hold On. Stay away from glass and heavy furniture.",
  cyclone: "Board up windows and secure outdoor objects. Prepare an evacuation kit.",
  tornado: "Move to an interior room on the lowest floor and cover your head.",
  landslide: "Evacuate uphill immediately. Avoid valleys and stream channels.",
  storm: "Stay indoors and away from windows. Monitor local weather alerts.",
  gas_leak: "Leave the area immediately. Do not use electrical switches or open flames.",
  chemical_spill: "Move upwind and uphill. Avoid contact with spilled material.",
  bridge_collapse: "Stay clear of the structure and report to emergency services.",
  power_outage: "Use flashlights instead of candles. Keep the refrigerator closed.",
  medical: "Call emergency services. Provide first aid if you are trained to do so.",
  unknown: "Stay alert and follow instructions from local authorities.",
}

export default function RecoveryResources() {
  const { incidents, meshIncidents, stats, loading: dataLoading } = useResilioData()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedHazard, setSelectedHazard] = useState("all")
  const [packs, setPacks] = useState<Record<string, PackData | null>>({})
  const [packsLoading, setPacksLoading] = useState<Record<string, boolean>>({})

  const allIncidents = useMemo(() => mergeIncidents(incidents, meshIncidents), [incidents, meshIncidents])

  const hazardTypes = useMemo(
    () => Array.from(new Set(allIncidents.map((i) => i.hazard_type))),
    [allIncidents],
  )

  const locationsByHazard = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const inc of allIncidents) {
      const list = map.get(inc.hazard_type) ?? []
      if (!list.includes(inc.location)) list.push(inc.location)
      map.set(inc.hazard_type, list)
    }
    return map
  }, [allIncidents])

  const hazardCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const inc of allIncidents) map.set(inc.hazard_type, (map.get(inc.hazard_type) ?? 0) + 1)
    return map
  }, [allIncidents])

  useEffect(() => {
    for (const ht of hazardTypes) {
      if (packs[ht] !== undefined || packsLoading[ht]) continue
      setPacksLoading((prev) => ({ ...prev, [ht]: true }))
      getGuidance(ht, "Warning")
        .then((data) => {
          setPacks((prev) => ({
            ...prev,
            [ht]: {
              guidance: data.guidance ?? "",
              steps: data.steps ?? [],
              safetyNotes: data.safetyNotes ?? [],
              sources: data.sources ?? [],
            },
          }))
        })
        .catch(() => {
          setPacks((prev) => ({ ...prev, [ht]: null }))
        })
        .finally(() => {
          setPacksLoading((prev) => ({ ...prev, [ht]: false }))
        })
    }
  }, [hazardTypes, packs, packsLoading])

  const filteredHazards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return hazardTypes.filter((ht) => {
      if (selectedHazard !== "all" && ht !== selectedHazard) return false
      if (!term) return true
      const locations = locationsByHazard.get(ht) ?? []
      return (
        hazardLabel(ht).toLowerCase().includes(term) || locations.some((l) => l.toLowerCase().includes(term))
      )
    })
  }, [hazardTypes, searchTerm, selectedHazard, locationsByHazard])

  const corroborations = useMemo(
    () => allIncidents.reduce((sum, i) => sum + i.corroborations, 0),
    [allIncidents],
  )

  const affectedLocations = useMemo(() => Array.from(new Set(allIncidents.map((i) => i.location))), [allIncidents])

  const statCards = [
    { label: "Active Incidents", value: allIncidents.length, icon: Shield },
    { label: "Total Corroborations", value: corroborations, icon: Users },
    { label: "Verified Reports", value: stats?.verified ?? 0, icon: CheckCircle },
    { label: "Affected Locations", value: affectedLocations.length, icon: MapPin },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Heart className="h-12 w-12 text-primary mr-4" />
              <p className="kicker">01 — After the sirens</p>
              <h1 className="display mt-3 text-4xl md:text-5xl tracking-tight">Recovery Resources</h1>
            </div>
            <p className="mt-3 text-xl text-muted-foreground max-w-3xl mx-auto">
              Recovery guidance generated live from active incidents and corroborated community reports.
            </p>
          </div>

          {/* Live Incidents Map */}
          <div className="mb-8">
            <IndiaMap incidents={allIncidents} title="Live Recovery Incidents" />
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
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

          {/* Search */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recovery packs by hazard or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Hazard Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedHazard === "all" ? "default" : "outline"}
                onClick={() => setSelectedHazard("all")}
                className="flex items-center"
              >
                All Hazards
                <Badge variant="secondary" className="ml-2">
                  {allIncidents.length}
                </Badge>
              </Button>
              {hazardTypes.map((ht) => (
                <Button
                  key={ht}
                  variant={selectedHazard === ht ? "default" : "outline"}
                  onClick={() => setSelectedHazard(selectedHazard === ht ? "all" : ht)}
                  className="flex items-center"
                >
                  {hazardLabel(ht)}
                  <Badge variant="secondary" className="ml-2">
                    {hazardCounts.get(ht) ?? 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Recovery Resource Packs */}
          {filteredHazards.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredHazards.map((ht) => {
                const pack = packs[ht]
                const isLoading = packsLoading[ht]
                const locations = locationsByHazard.get(ht) ?? []
                return (
                  <Card key={ht} className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-primary" />
                            Recovery Pack: {hazardLabel(ht)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {hazardCounts.get(ht)} active report(s) · {locations.join(", ")}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0">
                          {stats?.verified ?? 0} verified
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 animate-spin" />
                          Loading recovery guidance…
                        </div>
                      ) : pack ? (
                        <>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{pack.guidance}</p>
                          </div>

                          {pack.steps.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Recovery Steps</h4>
                              <ol className="space-y-2">
                                {pack.steps.map((step, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 shrink-0 flex items-center justify-center text-xs font-semibold">
                                      {i + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {pack.safetyNotes.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                                <Shield className="h-4 w-4 text-orange-500" />
                                Safety Notes
                              </h4>
                              <ul className="space-y-1">
                                {pack.safetyNotes.map((note, i) => (
                                  <li
                                    key={i}
                                    className="text-sm text-orange-600 dark:text-orange-400 flex items-start gap-2"
                                  >
                                    <span className="mt-1">⚠</span>
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {pack.sources.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                                <ExternalLink className="h-4 w-4 text-primary" />
                                External Resources
                              </h4>
                              <ul className="space-y-1">
                                {pack.sources.map((src, i) => {
                                  const href = /^https?:\/\//i.test(src) ? src : `https://${src}`
                                  return (
                                    <li key={i}>
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                                      >
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                        {src}
                                      </a>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">
                            {fallbackGuidance[ht] ?? fallbackGuidance.unknown}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Live guidance unavailable — showing basic recovery advice.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">
                  {dataLoading ? "Loading live incidents…" : "No recovery packs match your search"}
                </h3>
                {!dataLoading && (
                  <p className="text-sm text-muted-foreground">
                    Try a different hazard name or location, or clear the filters.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Support */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <MapPin className="h-5 w-5 text-primary mr-2" />
                  Local Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Find assistance programs specific to your area</p>
                <Button className="w-full">Find Local Help</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <HandHeart className="h-5 w-5 text-primary mr-2" />
                  Volunteer Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Connect with volunteers who can provide assistance</p>
                <Button className="w-full">Request Volunteers</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Heart className="h-5 w-5 text-primary mr-2" />
                  Emotional Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Access counseling and mental health resources</p>
                <Button className="w-full">Get Support</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}