"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Layers, Maximize2, Filter } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { useMeshHealth, type MeshIncident } from "@/components/connectivity-provider"

interface DisasterMarker {
  id: string
  type: "cyclone" | "flood" | "earthquake" | "drought" | "wildfire" | "other"
  severity: "low" | "medium" | "high" | "critical"
  location: string
  coordinates: [number, number]
  status: string
  affectedRadius: number
}

const FALLBACK_MARKERS: DisasterMarker[] = [
  {
    id: "fallback-flood",
    type: "flood",
    severity: "high",
    location: "Kerala",
    coordinates: [10.8505, 76.2711],
    status: "Offline sample",
    affectedRadius: 50,
  },
  {
    id: "fallback-cyclone",
    type: "cyclone",
    severity: "high",
    location: "Odisha Coast",
    coordinates: [20.9517, 85.0985],
    status: "Offline sample",
    affectedRadius: 200,
  },
]

function incidentToMarker(incident: MeshIncident): DisasterMarker {
  const severity =
    incident.severity >= 7 ? "critical" : incident.severity >= 4 ? "high" : "low"
  const kindMap: Record<string, DisasterMarker["type"]> = {
    flood: "flood",
    cyclone: "cyclone",
    earthquake: "earthquake",
    drought: "drought",
    wildfire: "wildfire",
  }
  return {
    id: incident.id,
    type: kindMap[incident.kind?.toLowerCase()] ?? "other",
    severity,
    location: incident.location,
    coordinates: extractOrFallbackCoords(incident.location),
    status: incident.updatedAt ? "Live (CRDT updated)" : "Live",
    affectedRadius: 25 + incident.severity * 12,
  }
}

function extractOrFallbackCoords(location: string): [number, number] {
  const latMatch = location.match(/-?\d{1,2}\.\d+/)
  if (latMatch) {
    const m2 = location.match(/-?\d{1,2}\.\d+/g)
    if (m2 && m2.length > 1) {
      return [parseFloat(m2[0]), parseFloat(m2[1])]
    }
  }
  const fallbacks: [number, number][] = [
    [12.97, 77.59],
    [28.61, 77.2],
    [19.07, 72.87],
    [22.57, 88.36],
    [13.08, 80.27],
  ]
  let hash = 0
  for (const ch of location) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return fallbacks[hash % fallbacks.length]
}

export function DisasterMap() {
  const { incidents, connected } = useMeshHealth()
  const [selectedMarker, setSelectedMarker] = useState<DisasterMarker | null>(null)
  const [mapView, setMapView] = useState<"satellite" | "terrain" | "street">("satellite")
  const [showFilters, setShowFilters] = useState(false)

  const markers: DisasterMarker[] = connected && incidents.length > 0
    ? incidents.map(incidentToMarker)
    : connected
      ? []
      : FALLBACK_MARKERS

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 border-red-600"
      case "high":
        return "bg-red-500 border-red-500"
      case "medium":
        return "bg-orange-500 border-orange-500"
      case "low":
        return "bg-green-500 border-green-500"
      default:
        return "bg-muted border-muted"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Disaster Areas Map
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Interactive map showing active disaster zones and affected areas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showFilters && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Button size="sm" variant={mapView === "satellite" ? "default" : "outline"}>
              <Layers className="h-3 w-3 mr-1" />
              Satellite
            </Button>
            <Button size="sm" variant={mapView === "terrain" ? "default" : "outline"}>
              Terrain
            </Button>
            <Button size="sm" variant={mapView === "street" ? "default" : "outline"}>
              Street
            </Button>
          </div>
        )}

        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-09-18%20at%207.07.29%E2%80%AFPM-OZDFr.png"
            alt="Interactive disaster map showing affected regions"
            width={600}
            height={400}
            className="object-cover w-full h-full"
          />

          {/* Disaster Markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${30 + (parseInt(marker.id.slice(-2), 16) % 40)}%`,
                top: `${20 + (parseInt(marker.id.slice(-3), 16) % 60)}%`,
              }}
              onClick={() => setSelectedMarker(marker)}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 ${getSeverityColor(marker.severity)} animate-pulse shadow-lg`}
              ></div>
              <div
                className={`absolute inset-0 w-4 h-4 rounded-full ${getSeverityColor(
                  marker.severity,
                )} opacity-30 animate-ping`}
              ></div>
            </div>
          ))}

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium">Risk Levels</div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Low</span>
              </div>
            </div>
          </div>

          {/* Selected Marker Info */}
          {selectedMarker && (
            <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 max-w-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selectedMarker.location}</h3>
                  <Badge className={getSeverityColor(selectedMarker.severity)}>
                    {selectedMarker.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Type: {selectedMarker.type}</div>
                  <div>Status: {selectedMarker.status}</div>
                  <div>Affected Radius: {selectedMarker.affectedRadius} km</div>
                </div>
                <Button size="sm" className="w-full" onClick={() => setSelectedMarker(null)}>
                  View Details
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1">
            <MapPin className="h-4 w-4 mr-2" />
            View Full Map
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            <Layers className="h-4 w-4 mr-2" />
            Toggle Layers
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
