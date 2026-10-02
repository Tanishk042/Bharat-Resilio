"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel } from "@/components/india-map"
import { getGuidance, getPreparednessStats } from "@/services/api"

interface GuidanceData {
  guidance: string
  steps: string[]
  safetyNotes: string[]
}

export default function DisasterPreparedness() {
  const { incidents, meshIncidents, stats, loading: dataLoading } = useResilioData()
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({})
  const [guidanceCache, setGuidanceCache] = useState<Record<string, GuidanceData | null>>({})
  const [guidanceLoading, setGuidanceLoading] = useState<Record<string, boolean>>({})
  const [prepStats, setPrepStats] = useState<any>(null)

  const allIncidents = useMemo(() => mergeIncidents(incidents, meshIncidents), [incidents, meshIncidents])

  const distinctHazardTypes = useMemo(() => {
    const seen = new Set<string>()
    return allIncidents
      .filter((inc) => {
        if (seen.has(inc.hazard_type)) return false
        seen.add(inc.hazard_type)
        return true
      })
      .map((inc) => inc.hazard_type)
  }, [allIncidents])

  useEffect(() => {
    getPreparednessStats()
      .then(setPrepStats)
      .catch(() => setPrepStats(null))
  }, [])

  useEffect(() => {
    for (const ht of distinctHazardTypes) {
      if (guidanceCache[ht] !== undefined || guidanceLoading[ht]) continue
      setGuidanceLoading((prev) => ({ ...prev, [ht]: true }))
      getGuidance(ht, "Warning")
        .then((data) => {
          setGuidanceCache((prev) => ({
            ...prev,
            [ht]: {
              guidance: data.guidance ?? "",
              steps: data.steps ?? [],
              safetyNotes: data.safetyNotes ?? [],
            },
          }))
        })
        .catch(() => {
          setGuidanceCache((prev) => ({ ...prev, [ht]: null }))
        })
        .finally(() => {
          setGuidanceLoading((prev) => ({ ...prev, [ht]: false }))
        })
    }
  }, [distinctHazardTypes, guidanceCache, guidanceLoading])

  const toggleStep = (hazard: string, idx: number) => {
    setCompletedSteps((prev) => {
      const current = new Set(prev[hazard] ?? [])
      if (current.has(idx)) current.delete(idx)
      else current.add(idx)
      return { ...prev, [hazard]: current }
    })
  }

  const totalSteps = distinctHazardTypes.reduce((sum, ht) => {
    const g = guidanceCache[ht]
    return sum + (g?.steps.length ?? 0)
  }, 0)

  const completedCount = distinctHazardTypes.reduce((sum, ht) => {
    return sum + (completedSteps[ht]?.size ?? 0)
  }, 0)

  const completionPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  const displayStats = prepStats ?? stats

  const staticFallback: Record<string, string> = {
    flood: "Move to higher ground. Avoid walking or driving through flood waters.",
    fire: "Evacuate immediately if instructed. Close all windows and doors.",
    earthquake: "Drop, Cover, and Hold On. Stay away from heavy furniture.",
    cyclone: "Board up windows. Secure outdoor objects. Prepare an evacuation kit.",
    tornado: "Move to an interior room on the lowest floor. Cover yourself.",
    storm: "Stay indoors away from windows. Monitor weather alerts.",
    landslide: "Evacuate uphill immediately. Avoid valleys and stream channels.",
    gas_leak: "Leave the area immediately. Do not use electrical switches.",
    chemical_spill: "Move upwind and uphill. Avoid contact with spilled material.",
    bridge_collapse: "Stay clear of the structure. Report to emergency services.",
    power_outage: "Use flashlights instead of candles. Keep refrigerator closed.",
    medical: "Call emergency services. Provide first aid if trained.",
    unknown: "Stay alert. Follow instructions from local authorities.",
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary mr-4" />
              <p className="kicker">01 — Before it hits</p>
              <h1 className="display mt-3 text-4xl md:text-5xl tracking-tight">Disaster Preparedness</h1>
            </div>
            <p className="mt-3 text-xl text-muted-foreground max-w-3xl mx-auto">
              Real-time preparedness guidance driven by live hazard data. Build your plan based on actual threats near you.
            </p>
          </div>

          <div className="mb-8">
            <IndiaMap incidents={allIncidents} title="Your Region's Active Hazards" showLegend />
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                Your Preparedness Progress
              </CardTitle>
              <CardDescription>Track your readiness based on live hazard guidance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                {completedCount} of {totalSteps} guided steps completed
              </p>
              {displayStats && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{displayStats.total_incidents ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total Incidents</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{displayStats.verified ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{displayStats.pending ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {distinctHazardTypes.length === 0 && !dataLoading && (
            <Card className="mb-8">
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No Active Hazards Detected</h3>
                <p className="text-sm text-muted-foreground">
                  There are no live incidents in your area. General preparedness guidance will appear when hazards are reported.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            {distinctHazardTypes.map((ht) => {
              const g = guidanceCache[ht]
              const isLoading = guidanceLoading[ht]
              const steps = g?.steps ?? []
              const done = completedSteps[ht] ?? new Set()

              return (
                <Card key={ht}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      Preparedness Focus: {hazardLabel(ht)}
                    </CardTitle>
                    <CardDescription>
                      Guidance tailored to {hazardLabel(ht).toLowerCase()} hazards detected in your region
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading live guidance…
                      </div>
                    ) : g ? (
                      <>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{g.guidance}</p>
                        </div>

                        {steps.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Action Steps</h4>
                            <ol className="space-y-2">
                              {steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <button
                                    onClick={() => toggleStep(ht, i)}
                                    className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                      done.has(i)
                                        ? "bg-green-600 border-green-600"
                                        : "border-muted-foreground"
                                    }`}
                                  >
                                    {done.has(i) && <CheckCircle className="h-3 w-3 text-white" />}
                                  </button>
                                  <span
                                    className={`text-sm ${
                                      done.has(i) ? "line-through text-muted-foreground" : ""
                                    }`}
                                  >
                                    {i + 1}. {step}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {g.safetyNotes.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-1">
                              <Shield className="h-4 w-4 text-orange-500" />
                              Safety Notes
                            </h4>
                            <ul className="space-y-1">
                              {g.safetyNotes.map((note, i) => (
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
                      </>
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {staticFallback[ht] ?? staticFallback.unknown}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Live guidance unavailable — showing basic advice.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
