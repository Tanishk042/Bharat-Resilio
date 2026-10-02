"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ArrowLeft, Users, MapPin, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel } from "@/components/india-map"
import { useMeshHealth } from "@/components/connectivity-provider"
import { offlineSync } from '../../../utils/offline-sync'

interface Operation {
  id: string
  name: string
  status: string
  volunteers: number
  funding: number
  target: number
  location: string
  priority: string
  description: string
  startDate: string
  coordinator: string
  contact: string
  incidentId: string
}

const hashString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const statusLabel = (status: string) => {
  if (status === "verified") return "Active"
  if (status === "rejected") return "Suspended"
  return "Planning"
}

const priorityFrom = (severity: number) => (severity >= 7 ? "High" : severity >= 4 ? "Medium" : "Low")

export default function OperationsPage() {
  const { incidents, refresh } = useResilioData(15000)
  const { peers } = useMeshHealth()

  const [localOperations, setLocalOperations] = useState<Operation[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    priority: "Medium",
    description: "",
    target: "",
    coordinator: "",
    contact: "",
  })

  const liveOperations: Operation[] = incidents.map((inc) => {
    const peer = peers.length > 0 ? peers[hashString(inc.incident_id) % peers.length] : undefined
    return {
      id: inc.incident_id,
      name: `${hazardLabel(inc.hazard_type)} at ${inc.location}`,
      status: statusLabel(inc.status),
      volunteers: Math.min(12, Math.max(3, Math.round(inc.severity * 1.4))),
      funding: inc.corroborations * 100000,
      target: Math.max(400000, inc.severity * 250000),
      location: inc.location,
      priority: priorityFrom(inc.severity),
      description: `Live ${hazardLabel(inc.hazard_type)} incident — ${inc.corroborations} corroboration(s), severity ${inc.severity}/10.`,
      startDate: inc.submitted_at
        ? new Date(Number(inc.submitted_at)).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      coordinator: peer
        ? `${peer.role ? peer.role : "mesh"} node · ${peer.nodeId}`
        : "No mesh peer online",
      contact: peer ? (peer.connected ? "Reachable via mesh" : "Mesh node offline") : "No mesh peer linked",
      incidentId: inc.incident_id,
    }
  })

  const operations = [...liveOperations, ...localOperations].filter((op) => !deletedIds.includes(op.id))
  const selectedOperation = operations.find((op) => op.id === selectedId) ?? operations[0] ?? null
  const currentStatus = (op: Operation) => statusOverrides[op.id] ?? op.status

  const handleCreateOperation = () => {
    const newOperation: Operation = {
      id: `op-${Date.now()}`,
      name: formData.name,
      status: "Planning",
      volunteers: 0,
      funding: 0,
      target: Number.parseInt(formData.target || "0", 10) || 0,
      location: formData.location,
      priority: formData.priority,
      description: formData.description,
      startDate: new Date().toISOString().split("T")[0],
      coordinator: formData.coordinator,
      contact: formData.contact,
      incidentId: "",
    }

    offlineSync.addToSyncQueue('operation', {
      type: 'create',
      data: newOperation,
    })

    setLocalOperations([...localOperations, newOperation])
    setIsCreating(false)
    setFormData({
      name: "",
      location: "",
      priority: "Medium",
      description: "",
      target: "",
      coordinator: "",
      contact: "",
    })
    refresh()
    alert("New operation created successfully!")
  }

  const handleUpdateStatus = (operationId: string, newStatus: string) => {
    setStatusOverrides({ ...statusOverrides, [operationId]: newStatus })

    offlineSync.addToSyncQueue('operation', {
      type: 'update',
      data: {
        id: operationId,
        status: newStatus,
      },
    })

    refresh()
    alert(`Operation status updated to ${newStatus}`)
  }

  const handleDeleteOperation = (operationId: string) => {
    if (confirm("Are you sure you want to delete this operation?")) {
      setDeletedIds([...deletedIds, operationId])

      offlineSync.addToSyncQueue('operation', {
        type: 'delete',
        data: { id: operationId },
      })

      const remaining = operations.filter((op) => op.id !== operationId)
      setSelectedId(remaining[0]?.id ?? "")
      refresh()
      alert("Operation deleted successfully")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Planning":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "Suspended":
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "default"
      case "Low":
        return "secondary"
      default:
        return "outline"
    }
  }

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
                <h1 className="text-3xl font-bold">संचालन प्रबंधन / Operations Management</h1>
                <p className="text-muted-foreground">Manage and coordinate disaster relief operations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Operation
              </Button>
              <ProfileDropdown
                userRole="ngo"
                userName="डॉ. अनिता पटेल / Dr. Anita Patel"
                userEmail="anita.patel@ngo.org"
              />
            </div>
          </div>

          {/* Live Map of operations theatres */}
          <div className="mb-8">
            <IndiaMap incidents={mergeIncidents(incidents, [])} title="Live Operation Theatres" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Operations List */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  {operations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No active operations yet. New incidents from the oracle will appear here instantly.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {operations.map((operation) => (
                        <div
                          key={operation.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedOperation?.id === operation.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedId(operation.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(currentStatus(operation))}
                              <span className="font-medium">{operation.name}</span>
                            </div>
                            <Badge variant={getPriorityColor(operation.priority) as any}>{operation.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{operation.location}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{operation.volunteers} volunteers</span>
                            <span>
                              {operation.target > 0 ? Math.round((operation.funding / operation.target) * 100) : 0}%
                              funded
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Operations:</span>
                      <span className="font-medium">{operations.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active:</span>
                      <span className="font-medium">{operations.filter((op) => currentStatus(op) === "Active").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Planning:</span>
                      <span className="font-medium">{operations.filter((op) => currentStatus(op) === "Planning").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Volunteers:</span>
                      <span className="font-medium">{operations.reduce((sum, op) => sum + op.volunteers, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Mesh Peers:</span>
                      <span className="font-medium">{peers.filter((p) => p.connected).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Operation Details */}
            <div className="lg:col-span-2 space-y-6">
              {!isCreating ? (
                selectedOperation ? (
                  <>
                    {/* Operation Details */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(currentStatus(selectedOperation))}
                            {selectedOperation.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(selectedOperation.priority) as any}>
                              {selectedOperation.priority} Priority
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteOperation(selectedOperation.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                              <p className="mt-1">{selectedOperation.description}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{selectedOperation.location}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Coordinator</Label>
                              <p className="mt-1">{selectedOperation.coordinator}</p>
                              <p className="text-sm text-muted-foreground">{selectedOperation.contact}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Incident ID</Label>
                              <p className="mt-1 font-mono text-xs">
                                {selectedOperation.incidentId || "Manual operation"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Volunteers Deployed</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-lg font-semibold">{selectedOperation.volunteers}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Funding Progress</Label>
                              <div className="mt-2">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>₹{(selectedOperation.funding / 100000).toFixed(1)}L raised</span>
                                  <span>₹{(selectedOperation.target / 100000).toFixed(1)}L goal</span>
                                </div>
                                <Progress
                                  value={
                                    selectedOperation.target > 0
                                      ? (selectedOperation.funding / selectedOperation.target) * 100
                                      : 0
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                              <p className="mt-1">{new Date(selectedOperation.startDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Status Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Status Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={currentStatus(selectedOperation) === "Planning" ? "default" : "outline"}
                            onClick={() => handleUpdateStatus(selectedOperation.id, "Planning")}
                          >
                            Planning
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus(selectedOperation) === "Active" ? "default" : "outline"}
                            onClick={() => handleUpdateStatus(selectedOperation.id, "Active")}
                          >
                            Active
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus(selectedOperation) === "Completed" ? "default" : "outline"}
                            onClick={() => handleUpdateStatus(selectedOperation.id, "Completed")}
                          >
                            Completed
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus(selectedOperation) === "Suspended" ? "default" : "outline"}
                            onClick={() => handleUpdateStatus(selectedOperation.id, "Suspended")}
                          >
                            Suspended
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                      Select an operation to manage, or pull in new incidents from the live oracle feed.
                    </CardContent>
                  </Card>
                )
              ) : (
                /* Create New Operation Form */
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Operation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Operation Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter operation name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Enter location"
                          />
                        </div>
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => setFormData({ ...formData, priority: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="target">Funding Target (₹)</Label>
                          <Input
                            id="target"
                            type="number"
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                            placeholder="Enter funding target"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="coordinator">Coordinator</Label>
                          <Input
                            id="coordinator"
                            value={formData.coordinator}
                            onChange={(e) => setFormData({ ...formData, coordinator: e.target.value })}
                            placeholder="Enter coordinator name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact">Contact</Label>
                          <Input
                            id="contact"
                            value={formData.contact}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            placeholder="Enter contact number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter operation description"
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <Button onClick={handleCreateOperation}>Create Operation</Button>
                      <Button variant="outline" onClick={() => setIsCreating(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}