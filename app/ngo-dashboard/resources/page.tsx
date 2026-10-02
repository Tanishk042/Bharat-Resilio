"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ArrowLeft, Package, Truck, MapPin, Plus, AlertTriangle, CheckCircle, Clock, Search } from "lucide-react"
import Link from "next/link"

import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { hazardLabel, severityTier } from "@/components/india-map"
import { useMeshHealth } from "@/components/connectivity-provider"
import type { LiveIncident } from "@/lib/use-resilio-data"

interface SupplyItem {
  id: string
  item: string
  stock: number
  unit: string
  location: string
  lastUpdated: string
  minThreshold: number
  maxCapacity: number
  cost: number
  sourceIncidentId: string
}

interface Center {
  id: string
  name: string
  status: string
  capacity: string
  contact: string
  coordinator: string
  supplies: string[]
  lastActivity: string
}

interface SupplyRequest {
  id: string
  item: string
  quantity: string
  unit: string
  location: string
  status: string
  requestedAt: string
}

const SUPPLY_KINDS = ["Water", "Blankets", "Medicine", "Food Packets", "Emergency Kits"]

const hashString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const formatDate = (ts?: number | string) => {
  if (!ts) return new Date().toISOString().split("T")[0]
  const n = Number(ts)
  return new Date(n).toISOString().split("T")[0]
}

const itemFor = (hazard: string) => SUPPLY_KINDS[hashString(hazard || "unknown") % SUPPLY_KINDS.length]

const stockFor = (inc: LiveIncident) => Math.max(10, inc.corroborations * inc.severity * 40 + inc.severity * 90)

export default function ResourcesPage() {
  const { incidents, refresh } = useResilioData(15000)
  const { peers } = useMeshHealth()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplyId, setSelectedSupplyId] = useState("")
  const [requestQuantity, setRequestQuantity] = useState("")
  const [requestLocation, setRequestLocation] = useState("")
  const [requests, setRequests] = useState<SupplyRequest[]>([])

  const merged = mergeIncidents(incidents, [])

  const locations = Array.from(new Map(merged.map((i) => [i.location, i])).values())
  const representativeByLocation = (location: string) =>
    merged
      .filter((i) => i.location === location)
      .slice()
      .sort((a, b) => b.severity - a.severity || b.corroborations - a.corroborations)[0]

  const supplyInventory: SupplyItem[] = locations.map((inc) => {
    const item = itemFor(inc.hazard_type)
    const stock = stockFor(inc)
    const maxCapacity = stock * 3 + 120
    return {
      id: `${inc.location}::${item}`,
      item,
      stock,
      unit: "units",
      location: inc.location,
      lastUpdated: formatDate(inc.submitted_at),
      minThreshold: Math.round(maxCapacity * 0.35),
      maxCapacity,
      cost: 250 + inc.severity * 120 + inc.corroborations * 30,
      sourceIncidentId: inc.incident_id,
    }
  })

  const distributionCenters: Center[] = locations.map((inc, index) => {
    const peer = peers.length > 0 ? peers[hashString(inc.incident_id) % peers.length] : undefined
    return {
      id: inc.location,
      name: `${hazardLabel(inc.hazard_type)} Response Hub — ${inc.location}`,
      status: inc.status === "verified" ? "Active" : inc.status === "rejected" ? "Standby" : "Setting up",
      capacity: `${severityTier(inc.severity).label} priority · ${inc.corroborations} corroboration(s)`,
      contact: peer ? `via mesh · ${peer.nodeId}` : "No mesh peer online",
      coordinator: peer ? (peer.role ? peer.role : "mesh") : "Unassigned — no mesh peer",
      supplies: [itemFor(inc.hazard_type)],
      lastActivity: formatDate(inc.submitted_at),
    }
  })

  const selectedSupply = supplyInventory.find((s) => s.id === selectedSupplyId) ?? supplyInventory[0] ?? null

  const handleRequestSupplies = () => {
    if (!selectedSupply) return
    if (!requestQuantity || !requestLocation) {
      alert("Please fill in all fields")
      return
    }

    const next: SupplyRequest = {
      id: `req-${Date.now()}`,
      item: selectedSupply.item,
      quantity: requestQuantity,
      unit: selectedSupply.unit,
      location: requestLocation,
      status: "Submitted",
      requestedAt: new Date().toLocaleString(),
    }

    setRequests([next, ...requests])
    setRequestQuantity("")
    setRequestLocation("")
    refresh()
    alert(
      `आपातकालीन आपूर्ति अनुरोध! / Emergency Supply Request!\n\n` +
        `Item: ${selectedSupply.item}\n` +
        `Quantity: ${requestQuantity} ${selectedSupply.unit}\n` +
        `Location: ${requestLocation}\n` +
        `Estimated Cost: ₹${(Number.parseInt(requestQuantity) * selectedSupply.cost).toLocaleString()}\n` +
        `Status: Request Submitted`,
    )
  }

  const getStockStatus = (stock: number, minThreshold: number) => {
    if (stock < minThreshold) return { status: "Low", color: "destructive" }
    if (stock < minThreshold * 2) return { status: "Medium", color: "secondary" }
    return { status: "Good", color: "default" }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Operational":
      case "Active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Setting up":
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredSupplies = supplyInventory.filter(
    (supply) =>
      supply.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supply.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredCenters = distributionCenters.filter(
    (center) =>
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.coordinator.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/ngo-dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">संसाधन प्रबंधन / Resource Management</h1>
                <p className="text-muted-foreground">Manage supplies, inventory, and distribution centers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supply
              </Button>
              <ProfileDropdown
                userRole="ngo"
                userName="डॉ. अनिता पटेल / Dr. Anita Patel"
                userEmail="anita.patel@ngo.org"
              />
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supplies, locations, or distribution centers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="inventory">
            <TabsList className="mb-6">
              <TabsTrigger value="inventory">Supply Inventory</TabsTrigger>
              <TabsTrigger value="distribution">Distribution Centers</TabsTrigger>
              <TabsTrigger value="requests">Supply Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              {supplyInventory.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No live incidents yet — supply lines will appear here per affected location as incidents arrive from
                    the oracle.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Inventory List */}
                  <div className="space-y-4">
                    {filteredSupplies.length === 0 ? (
                      <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                          No supplies match your search.
                        </CardContent>
                      </Card>
                    ) : (
                      filteredSupplies.map((supply) => {
                        const stockStatus = getStockStatus(supply.stock, supply.minThreshold)
                        return (
                          <Card
                            key={supply.id}
                            className={`cursor-pointer transition-all ${
                              selectedSupply?.id === supply.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedSupplyId(supply.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">{supply.item}</h3>
                                <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>
                                    {supply.stock} {supply.unit} available
                                  </span>
                                  <span>{supply.location}</span>
                                </div>
                                <Progress value={(supply.stock / supply.maxCapacity) * 100} className="h-2" />
                                <div className="text-xs text-muted-foreground">
                                  Source: {supply.location} (ID {supply.sourceIncidentId})
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>

                  {/* Supply Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedSupply ? (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Package className="h-5 w-5" />
                              {selectedSupply.item} Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Current Stock</Label>
                                  <div className="text-2xl font-bold">
                                    {selectedSupply.stock} {selectedSupply.unit}
                                  </div>
                                  <Progress
                                    value={(selectedSupply.stock / selectedSupply.maxCapacity) * 100}
                                    className="mt-2"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedSupply.location}</span>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Unit</Label>
                                  <p className="mt-1">{selectedSupply.unit}</p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Minimum Threshold</Label>
                                  <p className="text-lg font-semibold">
                                    {selectedSupply.minThreshold} {selectedSupply.unit}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Max Capacity</Label>
                                  <p className="text-lg font-semibold">
                                    {selectedSupply.maxCapacity} {selectedSupply.unit}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Cost per Unit</Label>
                                  <p className="text-lg font-semibold">₹{selectedSupply.cost}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Source Incident</Label>
                                  <p className="font-mono text-xs mt-1">{selectedSupply.sourceIncidentId}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Request Supplies */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Request Emergency Supplies</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="quantity">Quantity Needed</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  placeholder={`Enter quantity in ${selectedSupply.unit}`}
                                  value={requestQuantity}
                                  onChange={(e) => setRequestQuantity(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="location">Delivery Location</Label>
                                <Input
                                  id="location"
                                  placeholder="Enter delivery location"
                                  value={requestLocation}
                                  onChange={(e) => setRequestLocation(e.target.value)}
                                />
                              </div>
                            </div>

                            {requestQuantity && (
                              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Estimated Cost:</span>
                                    <span className="font-medium">
                                      ₹{(Number.parseInt(requestQuantity) * selectedSupply.cost).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className="font-medium">Ready to submit</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <Button className="w-full mt-4" onClick={handleRequestSupplies}>
                              <Package className="h-4 w-4 mr-2" />
                              Request Supplies
                            </Button>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                          Select a supply line to request more stock.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="distribution">
              {distributionCenters.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No distribution centers yet — they are created from live incident locations as the oracle reports
                    them.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCenters.length === 0 ? (
                    <Card className="md:col-span-2 lg:col-span-3">
                      <CardContent className="py-10 text-center text-muted-foreground">
                        No centers match your search.
                      </CardContent>
                    </Card>
                  ) : (
                    filteredCenters.map((center) => (
                      <Card key={center.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{center.name}</h3>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(center.status)}
                              <Badge
                                variant={
                                  center.status === "Operational" || center.status === "Active" ? "default" : "secondary"
                                }
                              >
                                {center.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Capacity: </span>
                              <span className="font-medium">{center.capacity}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Coordinator: </span>
                              <span className="font-medium">{center.coordinator}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contact: </span>
                              <span className="font-medium">{center.contact}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Supplies: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {center.supplies.map((supply, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {supply}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Activity: </span>
                              <span className="font-medium">
                                {new Date(center.lastActivity).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button size="sm" className="flex-1">
                              <Truck className="h-3 w-3 mr-1" />
                              Dispatch
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                              Contact
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Derived Supply Needs</CardTitle>
                </CardHeader>
                <CardContent>
                  {supplyInventory.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Supply needs are derived from live incidents — none reported yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {supplyInventory.map((supply) => (
                        <div key={supply.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{supply.item} — {supply.location}</h4>
                            <Badge>{supply.stock} {supply.unit}</Badge>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div>Need: {supply.stock} {supply.unit}</div>
                            <div>Source: {supply.sourceIncidentId}</div>
                            <div>Derived from live oracle incident</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>My Submitted Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No requests submitted yet — use the Request Supplies form on the inventory tab to log one.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <div key={request.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{request.item}</h4>
                            <Badge variant="secondary">{request.status}</Badge>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div>Quantity: {request.quantity} {request.unit}</div>
                            <div>Location: {request.location}</div>
                            <div>Requested: {request.requestedAt}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}