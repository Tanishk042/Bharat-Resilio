"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, MapPin, HardDrive, Wifi, WifiOff, Trash2, Search } from "lucide-react"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"
import { Navigation } from "@/components/navigation"

export default function OfflineMaps() {
  const { incidents, meshIncidents, loading } = useResilioData()
  const [searchQuery, setSearchQuery] = useState("")
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const merged = mergeIncidents(incidents, meshIncidents)

  const regionPacks = useMemo(() => {
    const byLocation = new Map<string, typeof merged[number]>()
    for (const inc of merged) {
      if (!byLocation.has(inc.location)) {
        byLocation.set(inc.location, inc)
      }
    }
    return Array.from(byLocation.entries()).map(([location, inc], idx) => {
      const tier = severityTier(inc.severity)
      return {
        id: inc.incident_id,
        name: location,
        size: `~${inc.corroborations + 2} MB`,
        coverage: hazardLabel(inc.hazard_type),
        lastUpdated: inc.submitted_at
          ? new Date(Number(inc.submitted_at)).toLocaleString()
          : "Unknown",
        downloaded: false,
        priority: tier.label,
      }
    })
  }, [merged])

  const handleDownload = (mapId: string) => {
    setDownloading(mapId)
    setDownloadProgress(0)

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setDownloading(null)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleDelete = (mapId: string) => {
    console.log(`Deleting map ${mapId}`)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-500/10 text-red-500"
      case "High":
        return "bg-orange-500/10 text-orange-500"
      case "Moderate":
        return "bg-yellow-500/10 text-yellow-500"
      case "Low":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const totalStorage = regionPacks.reduce((acc, map) => {
    if (map.downloaded) {
      return acc + Number.parseInt(map.size.replace(/[^0-9]/g, ""))
    }
    return acc
  }, 0)

  const filteredMaps = regionPacks.filter((map) =>
    map.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto pt-20 p-6">
        <div className="mb-6">
          <p className="kicker">01 — No signal</p>
          <div className="mt-3 flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h1 className="display text-3xl md:text-4xl tracking-tight">Offline Maps</h1>
          </div>
          <p className="mt-3 text-muted-foreground max-w-2xl">Download maps for offline access during emergencies</p>
        </div>

        <div className="mb-6">
          <IndiaMap incidents={merged} title="Live Overlay Preview" height="h-[340px]" />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search maps..."
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {loading && (
                <p className="col-span-2 text-center text-muted-foreground py-8">Loading incidents…</p>
              )}
              {!loading && filteredMaps.length === 0 && (
                <p className="col-span-2 text-center text-muted-foreground py-8">
                  No region packs available. Incidents will appear here as they are reported.
                </p>
              )}
              {filteredMaps.map((map) => (
                <Card key={map.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{map.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{map.coverage}</p>
                      </div>
                      <Badge className={getPriorityColor(map.priority)}>{map.priority}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">{map.size}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">{map.lastUpdated}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-2">
                        {map.downloaded ? (
                          <>
                            <WifiOff className="h-4 w-4 text-green-500" />
                            <span className="text-green-500 font-medium">Downloaded</span>
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Online only</span>
                          </>
                        )}
                      </div>
                    </div>

                    {downloading === map.id && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Downloading...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <Progress value={downloadProgress} className="h-2" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {map.downloaded ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(map.id)}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleDownload(map.id)}
                          disabled={downloading === map.id}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalStorage} MB</p>
                  <p className="text-sm text-muted-foreground">Used of 500 MB available</p>
                </div>
                <Progress value={(totalStorage / 500) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {Math.round(((500 - totalStorage) / 500) * 100)}% storage remaining
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Region Packs</span>
                  <Badge variant="outline">{regionPacks.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Incidents</span>
                  <Badge variant="outline">{merged.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Critical / High</span>
                  <Badge variant="outline">
                    {regionPacks.filter((m) => m.priority === "Critical" || m.priority === "High").length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Download Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Download high-priority maps first</p>
                <p>• Update maps regularly when online</p>
                <p>• Emergency routes are essential</p>
                <p>• Medical facility maps are critical</p>
                <p>• Check storage space regularly</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  Download All High Priority
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  Update All Maps
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  Clear Cache
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
