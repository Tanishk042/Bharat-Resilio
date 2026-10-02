"use client"

import { useState, useEffect, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { QRScanner } from "@/components/qr-scanner"
import {
  ArrowLeft,
  QrCode,
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  Users,
  Package,
  Radio,
  Boxes,
} from "lucide-react"
import Link from "next/link"
import { getChainChain, getChainState } from "@/services/api"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { hazardLabel } from "@/components/india-map"

interface ChainBlock {
  index: number
  timestamp?: string | number
  incidentId?: string
  transactions?: any[]
  previousHash?: string
  hash?: string
  proposer?: string
  validatorSignatures?: string[]
}

interface ChainState {
  height?: number
  blocks?: number
  peers?: number
}

interface Row {
  blockIndex: number
  incidentId: string
  timestamp: string
  status: "Mined" | "Confirmed"
}

function extractIncidentId(block: ChainBlock): string | undefined {
  if (block.incidentId) return String(block.incidentId)
  const tx = block.transactions?.[0]
  if (tx) {
    const direct = tx.incidentId
    if (direct) return String(direct)
    const payload = tx.payload
    if (payload && typeof payload === "object") {
      const nested = payload.incidentId ?? payload.incident_id ?? payload.id
      if (nested) return String(nested)
    }
  }
  return undefined
}

function fmtTimestamp(value?: string | number): string {
  if (value === undefined || value === null || value === "") return "—"
  const n = Number(value)
  if (!Number.isNaN(n) && n > 10000000000) {
    return new Date(n).toLocaleString()
  }
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  return String(value)
}

export default function TrackPage() {
  const [searchTx, setSearchTx] = useState("")
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [activeTab, setActiveTab] = useState("search")
  const [chain, setChain] = useState<ChainBlock[]>([])
  const [chainState, setChainState] = useState<ChainState | null>(null)
  const [loading, setLoading] = useState(true)
  const { incidents, meshIncidents } = useResilioData(15000)

  const refreshChain = () => {
    getChainChain()
      .then((body: any) => setChain(Array.isArray(body) ? body : body.blocks ?? []))
      .catch(() => setChain([]))
      .finally(() => setLoading(false))
    getChainState()
      .then((body: any) => setChainState(body))
      .catch(() => setChainState(null))
  }

  useEffect(() => {
    refreshChain()
    const interval = setInterval(refreshChain, 15000)
    return () => clearInterval(interval)
  }, [])

  const allIncidents = useMemo(() => mergeIncidents(incidents, meshIncidents), [incidents, meshIncidents])

  const rows: Row[] = useMemo(() => {
    return chain
      .map((block) => ({
        blockIndex: block.index,
        incidentId: extractIncidentId(block),
        timestamp: fmtTimestamp(block.timestamp),
        status: (block.validatorSignatures?.length ?? 0) > 0 ? ("Confirmed" as const) : ("Mined" as const),
      }))
      .filter((row): row is Row => row.incidentId !== undefined)
      .sort((a, b) => b.blockIndex - a.blockIndex)
  }, [chain])

  const filteredRows = useMemo(() => {
    const q = searchTx.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const incident = allIncidents.find((i) => i.incident_id === row.incidentId)
      const hazard = incident ? hazardLabel(incident.hazard_type).toLowerCase() : ""
      return row.incidentId.toLowerCase().includes(q) || hazard.includes(q) || row.blockIndex.toString().includes(q)
    })
  }, [rows, searchTx, allIncidents])

  const corroborationsFor = (incidentId: string): number => {
    const inc = allIncidents.find((i) => i.incident_id === incidentId)
    return inc?.corroborations ?? 0
  }

  const handleSearch = () => {
    const found = filteredRows[0]
    if (found) {
      setSelectedRow(found)
      setActiveTab("details")
    } else {
      alert("No on-chain record found matching your search.")
    }
  }

  const handleQRScanResult = (result: any) => {
    console.log("[track] QR scan result:", result)
    if (result.type === "transaction" && result.valid) {
      setSearchTx(result.data.hash ?? "")
      handleSearch()
    }
  }

  const selectedIncident = selectedRow ? allIncidents.find((i) => i.incident_id === selectedRow.incidentId) : null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/donor-dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">ट्रैक दान / Track Donations</h1>
                <p className="text-muted-foreground">Live on-chain records from the Resilio blockchain</p>
              </div>
            </div>
            <ProfileDropdown userRole="donor" userName="विक्रम सिंह / Vikram Singh" userEmail="vikram.singh@email.com" />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Boxes className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">On-chain Records</p>
                    <p className="text-2xl font-bold">{rows.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Chain Height</p>
                    <p className="text-2xl font-bold">
                      {chainState?.height ?? chainState?.blocks ?? (chain.length > 0 ? chain.length - 1 : 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mesh Peers</p>
                    <p className="text-2xl font-bold">{chainState?.peers ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="search">On-chain Records</TabsTrigger>
              <TabsTrigger value="qr-scanner">QR Scanner</TabsTrigger>
              <TabsTrigger value="details">Record Details</TabsTrigger>
            </TabsList>

            <TabsContent value="search">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Search Records
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search by incident ID or hazard"
                          value={searchTx}
                          onChange={(e) => setSearchTx(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Button onClick={handleSearch}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Filter by incident ID, block, or hazard type from the live chain.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Blockchain Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <p className="text-sm text-muted-foreground animate-pulse">Loading chain records…</p>
                      ) : filteredRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No on-chain records yet — chain will record the first mined incident here.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {filteredRows.map((row) => (
                            <div
                              key={`${row.blockIndex}-${row.incidentId}`}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                selectedRow?.blockIndex === row.blockIndex
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-primary/50"
                              }`}
                              onClick={() => {
                                setSelectedRow(row)
                                setActiveTab("details")
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-xs text-muted-foreground">Block #{row.blockIndex}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    row.status === "Confirmed"
                                      ? "text-green-500 border-green-500/50"
                                      : "text-yellow-500 border-yellow-500/50"
                                  }
                                >
                                  {row.status}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{row.incidentId}</p>
                              <p className="text-xs text-muted-foreground">{row.timestamp}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>About On-chain Donation Tracking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Boxes className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">Live Blockchain Records</h4>
                              <p className="text-sm text-muted-foreground">
                                Every mined incident is appended to the Resilio chain. Records show the block, the linked
                                incident, and its confirmation status.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">Confirmed / Mined</h4>
                              <p className="text-sm text-muted-foreground">
                                Blocks carrying validator signatures show as Confirmed; pending proposals show as Mined.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">Corroborations</h4>
                              <p className="text-sm text-muted-foreground">
                                Each record shows live corroborations for its linked incident from the Resilio oracle mesh.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <QrCode className="h-4 w-4 text-yellow-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">QR Verification</h4>
                              <p className="text-sm text-muted-foreground">
                                Use the QR Scanner tab to look up a record from a scanned receipt or code.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qr-scanner">
              <div className="max-w-4xl mx-auto">
                <QRScanner
                  onScanResult={handleQRScanResult}
                  onError={(error) => {
                    console.log("[track] QR Scanner error:", error)
                    alert(`Scanner Error: ${error}`)
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="details">
              {selectedRow ? (
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Boxes className="h-5 w-5 text-primary" />
                          On-chain Record Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Block</label>
                              <p className="font-mono text-sm">#{selectedRow.blockIndex}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Linked Incident</label>
                              <Link
                                href="/real-time-alerts"
                                className="font-mono text-sm text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {selectedRow.incidentId}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Status</label>
                              <div className="flex items-center gap-2">
                                {selectedRow.status === "Confirmed" ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                )}
                                <span>{selectedRow.status}</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Corroborations</label>
                              <p className="font-medium">{corroborationsFor(selectedRow.incidentId)}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                              <p>{selectedRow.timestamp}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Hazard</label>
                              <p>{selectedIncident ? hazardLabel(selectedIncident.hazard_type) : "—"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Location</label>
                              <p>{selectedIncident?.location ?? "—"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Network</label>
                              <p>Resilio PoA Chain</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Linked Incident Impact</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Live mesh data for incident {selectedRow.incidentId}
                        </p>
                      </CardHeader>
                      <CardContent>
                        {selectedIncident ? (
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Package className="h-6 w-6 text-primary" />
                              </div>
                              <div className="text-2xl font-bold">{hazardLabel(selectedIncident.hazard_type)}</div>
                              <div className="text-sm text-muted-foreground">Hazard Type</div>
                            </div>
                            <div className="text-center">
                              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Users className="h-6 w-6 text-green-500" />
                              </div>
                              <div className="text-2xl font-bold">{selectedIncident.corroborations}</div>
                              <div className="text-sm text-muted-foreground">Corroborations</div>
                            </div>
                            <div className="text-center">
                              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Radio className="h-6 w-6 text-blue-500" />
                              </div>
                              <div className="text-2xl font-bold">{selectedIncident.severity}/10</div>
                              <div className="text-sm text-muted-foreground">Severity {selectedRow.status}</div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No live hazard details yet for this record — the oracle is still corroborating it.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button className="w-full bg-transparent" variant="outline">
                          <Radio className="h-4 w-4 mr-2" />
                          View Chain State
                        </Button>
                        <Link href="/donor-dashboard" className="block">
                          <Button className="w-full bg-transparent" variant="outline">
                            <Package className="h-4 w-4 mr-2" />
                            Make a Donation
                          </Button>
                        </Link>
                        <Link href="/real-time-alerts" className="block">
                          <Button className="w-full bg-transparent" variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Live Alerts
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Select an on-chain record to view its details.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
