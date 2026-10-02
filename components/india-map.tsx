"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, ZoomIn, Layers, Crosshair } from "lucide-react"
import {
  indiaOutlinePath,
  sriLankaOutlinePath,
  MAP_VIEW_W,
  MAP_VIEW_H,
  INDIA_STATES,
  projectIndia,
  geocodeLocation,
} from "@/lib/india-geo"
import type { LiveIncident } from "@/lib/use-resilio-data"

export const HAZARD_TYPES = [
  "flood",
  "fire",
  "earthquake",
  "cyclone",
  "landslide",
  "tornado",
  "storm",
  "gas_leak",
  "medical",
  "power_outage",
  "chemical_spill",
  "bridge_collapse",
  "unknown",
]

export function hazardLabel(hazard: string): string {
  const labels: Record<string, string> = {
    flood: "Flood",
    fire: "Fire",
    earthquake: "Earthquake",
    cyclone: "Cyclone",
    landslide: "Landslide",
    tornado: "Tornado",
    storm: "Storm",
    gas_leak: "Gas Leak",
    medical: "Medical",
    power_outage: "Power Outage",
    chemical_spill: "Chemical Spill",
    bridge_collapse: "Bridge Collapse",
    unknown: "Other",
  }
  return labels[hazard] ?? hazard.charAt(0).toUpperCase() + hazard.slice(1)
}

export function severityTier(severity: number): {
  label: string
  dot: string
  ring: string
  text: string
} {
  if (severity >= 8)
    return { label: "Critical", dot: "#dc2626", ring: "rgb(220 38 38 / 0.35)", text: "text-red-600" }
  if (severity >= 6)
    return { label: "High", dot: "#f97316", ring: "rgb(249 115 22 / 0.35)", text: "text-orange-600" }
  if (severity >= 4)
    return { label: "Moderate", dot: "#eab308", ring: "rgb(234 179 8 / 0.35)", text: "text-yellow-600" }
  return { label: "Low", dot: "#22c55e", ring: "rgb(34 197 94 / 0.35)", text: "text-green-600" }
}

function fmtAgent(ts?: number | string): string {
  if (!ts) return "recent"
  const n = Number(ts)
  if (Number.isNaN(n) || n <= 0) return String(ts)
  const mins = Math.max(0, Math.round((Date.now() - n) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

interface IndiaMapProps {
  incidents: LiveIncident[]
  height?: string
  title?: string
  showLegend?: boolean
  interactive?: boolean
}

export function IndiaMap({
  incidents,
  height = "h-[420px]",
  title = "Live Disaster Map",
  showLegend = true,
  interactive = true,
}: IndiaMapProps) {
  const [selected, setSelected] = useState<LiveIncident | null>(null)
  const [activeType, setActiveType] = useState<string | null>(null)

  const outlinePath = useMemo(() => indiaOutlinePath(), [])
  const sriLankaPath = useMemo(() => sriLankaOutlinePath(), [])

  const present = useMemo(() => {
    const byType = new Map<string, number>()
    const markers = incidents.map((inc) => {
      const { x, y } = projectIndia(
        geocodeLocation(inc.location).lat,
        geocodeLocation(inc.location).lng,
      )
      byType.set(inc.hazard_type, (byType.get(inc.hazard_type) ?? 0) + 1)
      return { ...inc, x, y }
    })
    const sorted = [...markers].sort((a, b) => b.severity - a.severity)
    return { markers: sorted, byType }
  }, [incidents])

  const filtered = activeType
    ? present.markers.filter((m) => m.hazard_type === activeType)
    : present.markers

  const onClickMarker = (inc: (typeof present.markers)[number]) => {
    if (!interactive) return
    setSelected(inc)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Crosshair className="h-3.5 w-3.5" />
            {present.markers.length} active / reporting zones
          </div>
        </div>

        {present.byType.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <Button
              size="sm"
              variant={activeType === null ? "default" : "outline"}
              className="h-6 px-2 text-xs"
              onClick={() => {
                setActiveType(null)
                setSelected(null)
              }}
            >
              All
            </Button>
            {Array.from(present.byType.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <Button
                  key={type}
                  size="sm"
                  variant={activeType === type ? "default" : "outline"}
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setActiveType(activeType === type ? null : type)
                    setSelected(null)
                  }}
                >
                  {hazardLabel(type)} ({count})
                </Button>
              ))}
          </div>
        )}
      </CardHeader>

      <CardContent className={height}>
        <div className="relative w-full h-full rounded-lg border bg-gradient-to-b from-sky-50 via-emerald-50/40 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] bg-[repeating-linear-gradient(0deg,transparent,transparent_24px,rgb(2_6_23)_24px,rgb(2_6_23)_25px),repeating-linear-gradient(90deg,transparent,transparent_24px,rgb(2_6_23)_24px,rgb(2_6_23)_25px)]" />

          {/* Single shared coordinate plane: SVG and markers use the SAME
              projection space, so pins sit exactly on the drawn landmass. */}
          <div
            className="relative h-full mx-auto"
            style={{ aspectRatio: `${MAP_VIEW_W} / ${MAP_VIEW_H}` }}
          >
            {/* Neighbour hints */}
            <span className="absolute text-[9px] uppercase tracking-widest text-slate-300 dark:text-slate-600" style={{ left: "8%", top: "7%" }}>
              Pakistan
            </span>
            <span className="absolute text-[9px] uppercase tracking-widest text-slate-300 dark:text-slate-600" style={{ right: "9%", top: "6%" }}>
              China
            </span>
            <span className="absolute text-[9px] uppercase tracking-widest text-slate-300 dark:text-slate-600" style={{ right: "46%", bottom: "-2%" }}>
              Sri Lanka
            </span>

            {/* Landmass */}
            <svg
              viewBox={`0 0 ${MAP_VIEW_W} ${MAP_VIEW_H}`}
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d={sriLankaPath}
                fill="rgb(187 247 208 / 0.45)"
                stroke="rgb(21 128 61 / 0.5)"
                strokeWidth="0.4"
              />
              <path d={outlinePath} fill="rgb(187 247 208 / 0.55)" stroke="rgb(21 128 61 / 0.6)" strokeWidth="0.5" />
              <path
                d={outlinePath}
                fill="none"
                stroke="rgb(21 128 61 / 0.25)"
                strokeWidth="0.2"
                strokeDasharray="0.6 0.7"
              />

              {/* State labels */}
              {INDIA_STATES.map((state) => {
                const { x, y } = projectIndia(state.centroid.lat, state.centroid.lng)
                return (
                  <text
                    key={state.name}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="fill-slate-400 dark:fill-slate-600 pointer-events-none"
                    fontSize="3.2"
                    style={{ fontFamily: "ui-sans-serif, system-ui", letterSpacing: "0.01em" }}
                  >
                    {state.name}
                  </text>
                )
              })}
            </svg>

            {/* Incident markers */}
            {filtered.map((inc) => {
              const tier = severityTier(inc.severity)
              const isSelected = selected?.incident_id === inc.incident_id
              return (
                <button
                  key={inc.incident_id}
                  type="button"
                  aria-label={`${hazardLabel(inc.hazard_type)} at ${inc.location}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 focus:outline-none group"
                  style={{ left: `${inc.x}%`, top: `${inc.y}%` }}
                  onClick={() => onClickMarker(inc)}
                >
                  {isSelected && (
                    <span
                      className="absolute rounded-full animate-ping"
                      style={{ width: 18, height: 18, left: -9, top: -9, backgroundColor: tier.ring }}
                    />
                  )}
                  <span
                    className="relative block rounded-full border-2 border-white dark:border-slate-900 shadow-lg"
                    style={{ width: 9, height: 9, backgroundColor: tier.dot }}
                  />
                  <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded px-1 text-[9px] font-medium text-slate-700 dark:text-slate-200 bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                    {hazardLabel(inc.hazard_type)} · {inc.location}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selected marker detail */}
          {selected && (
            <div className="absolute top-3 right-3 w-64 max-w-[85%] rounded-lg border bg-background/95 backdrop-blur p-3 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{hazardLabel(selected.hazard_type)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {selected.location}
                  </p>
                </div>
                <Badge className={severityTier(selected.severity).text} variant="outline">
                  {severityTier(selected.severity).label} {selected.severity}/10
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 text-xs">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize text-right font-medium">{selected.status}</dd>
                <dt className="text-muted-foreground">Corroborations</dt>
                <dd className="text-right font-medium">{selected.corroborations}</dd>
                <dt className="text-muted-foreground">Reported</dt>
                <dd className="text-right font-medium">{fmtAgent(selected.submitted_at)}</dd>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="text-right font-mono text-[10px] truncate">
                  {selected.incident_id}
                </dd>
              </dl>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1 h-7 text-xs" asChild>
                  <a href="/real-time-alerts">View Alerts</a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Legend */}
          {showLegend && (
            <div className="absolute bottom-3 left-3 rounded-md bg-background/85 backdrop-blur px-2.5 py-2 text-[10px] space-y-1 shadow">
              <div className="font-medium text-muted-foreground">Severity</div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#dc2626" }} />Critical</span>
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#f97316" }} />High</span>
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#eab308" }} />Moderate</span>
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />Low</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ZoomIn className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No {activeType ? `${activeType} ` : ""}incidents reported</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function MapLegendHint() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <Layers className="h-3.5 w-3.5" />
      <span>Live markers streamed from the oracle + mesh fabric</span>
    </div>
  )
}