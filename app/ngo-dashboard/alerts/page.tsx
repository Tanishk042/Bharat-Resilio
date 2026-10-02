"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ArrowLeft, AlertTriangle, Plus, Edit, Trash2, Send, Users, MapPin, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

const initialAlerts = [
  {
    id: 1,
    type: "Cyclone Warning",
    location: "Odisha Coast",
    severity: "High",
    affected: "50,000+ people",
    timestamp: "2024-01-15 12:00:00",
    status: "Active",
    description: "Severe cyclonic storm approaching Odisha coast. Immediate evacuation required for coastal areas.",
    responseTeams: 3,
    estimatedImpact: "Severe flooding and wind damage expected",
  },
  {
    id: 2,
    type: "Flash Flood Alert",
    location: "Kerala Backwaters",
    severity: "Medium",
    affected: "15,000+ people",
    timestamp: "2024-01-14 16:30:00",
    status: "Monitoring",
    description: "Heavy rainfall causing flash floods in backwater regions. Monitoring water levels.",
    responseTeams: 2,
    estimatedImpact: "Temporary displacement and property damage",
  },
  {
    id: 3,
    type: "Earthquake Alert",
    location: "Himachal Pradesh",
    severity: "Low",
    affected: "5,000+ people",
    timestamp: "2024-01-13 08:15:00",
    status: "Resolved",
    description: "Minor earthquake detected. No significant damage reported.",
    responseTeams: 1,
    estimatedImpact: "Minimal structural damage",
  },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [selectedAlert, setSelectedAlert] = useState(alerts[0])
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    type: "",
    location: "",
    severity: "Medium",
    affected: "",
    description: "",
    estimatedImpact: "",
  })

  const handleCreateAlert = () => {
    const newAlert = {
      id: alerts.length + 1,
      type: formData.type,
      location: formData.location,
      severity: formData.severity,
      affected: formData.affected,
      timestamp: new Date().toISOString(),
      status: "Active",
      description: formData.description,
      responseTeams: 0,
      estimatedImpact: formData.estimatedImpact,
    }

    setAlerts([newAlert, ...alerts])
    setSelectedAlert(newAlert)
    setIsCreating(false)
    setFormData({
      type: "",
      location: "",
      severity: "Medium",
      affected: "",
      description: "",
      estimatedImpact: "",
    })
    alert("New emergency alert created and broadcasted!")
  }

  const handleUpdateAlert = (alertId: number, newStatus: string) => {
    setAlerts(alerts.map((alert) => (alert.id === alertId ? { ...alert, status: newStatus } : alert)))
    alert(`Alert status updated to ${newStatus}`)
  }

  const handleSendResponseTeam = (alertId: number) => {
    const foundAlert = alerts.find((a) => a.id === alertId)
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, responseTeams: a.responseTeams + 1 } : a)))
    alert(
      `प्रतिक्रिया टीम भेजी गई! / Response Team Dispatched!\n\n` +
        `Destination: ${foundAlert?.location}\n` +
        `Team Size: 12 members\n` +
        `ETA: 45 minutes\n` +
        `Equipment: Complete\n` +
        `Status: En Route`,
    )
  }

  const handleDeleteAlert = (alertId: number) => {
    if (confirm("Are you sure you want to delete this alert?")) {
      setAlerts(alerts.filter((alert) => alert.id !== alertId))
      if (selectedAlert.id === alertId) {
        setSelectedAlert(alerts[0])
      }
      alert("Alert deleted successfully")
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "Monitoring":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-red-500 border-red-500/50"
      case "Monitoring":
        return "text-yellow-500 border-yellow-500/50"
      case "Resolved":
        return "text-green-500 border-green-500/50"
      default:
        return "text-gray-500 border-gray-500/50"
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
                <h1 className="text-3xl font-bold">आपातकालीन अलर्ट / Emergency Alerts</h1>
                <p className="text-muted-foreground">Monitor and manage emergency alerts and response coordination</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
              <ProfileDropdown
                userRole="ngo"
                userName="डॉ. अनिता पटेल / Dr. Anita Patel"
                userEmail="anita.patel@ngo.org"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Alerts List */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedAlert.id === alert.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(alert.status)}
                            <span className="font-medium text-sm">{alert.type}</span>
                          </div>
                          <Badge variant={getSeverityColor(alert.severity) as any}>{alert.severity}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{alert.location}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{alert.affected}</span>
                          <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Alerts:</span>
                      <span className="font-medium">{alerts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active:</span>
                      <span className="font-medium text-red-500">
                        {alerts.filter((a) => a.status === "Active").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Monitoring:</span>
                      <span className="font-medium text-yellow-500">
                        {alerts.filter((a) => a.status === "Monitoring").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Response Teams:</span>
                      <span className="font-medium">{alerts.reduce((sum, a) => sum + a.responseTeams, 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Alert Details */}
            <div className="lg:col-span-2 space-y-6">
              {!isCreating ? (
                <>
                  {/* Alert Details */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(selectedAlert.status)}
                          {selectedAlert.type}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(selectedAlert.severity) as any}>
                            {selectedAlert.severity} Severity
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(selectedAlert.status)}>
                            {selectedAlert.status}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteAlert(selectedAlert.id)}>
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
                            <p className="mt-1">{selectedAlert.description}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedAlert.location}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Estimated Impact</Label>
                            <p className="mt-1">{selectedAlert.estimatedImpact}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">People Affected</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-lg font-semibold">{selectedAlert.affected}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Response Teams Deployed</Label>
                            <p className="text-lg font-semibold">{selectedAlert.responseTeams} teams</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Alert Time</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Response Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-medium">Status Management</h4>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={selectedAlert.status === "Active" ? "default" : "outline"}
                              onClick={() => handleUpdateAlert(selectedAlert.id, "Active")}
                            >
                              Active
                            </Button>
                            <Button
                              size="sm"
                              variant={selectedAlert.status === "Monitoring" ? "default" : "outline"}
                              onClick={() => handleUpdateAlert(selectedAlert.id, "Monitoring")}
                            >
                              Monitoring
                            </Button>
                            <Button
                              size="sm"
                              variant={selectedAlert.status === "Resolved" ? "default" : "outline"}
                              onClick={() => handleUpdateAlert(selectedAlert.id, "Resolved")}
                            >
                              Resolved
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium">Emergency Response</h4>
                          <div className="flex gap-2">
                            <Button onClick={() => handleSendResponseTeam(selectedAlert.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Response Team
                            </Button>
                            <Button variant="outline">
                              <Users className="h-4 w-4 mr-2" />
                              Coordinate Volunteers
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* Create New Alert Form */
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Emergency Alert</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="type">Alert Type</Label>
                          <Input
                            id="type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            placeholder="e.g., Cyclone Warning, Flood Alert"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Enter affected location"
                          />
                        </div>
                        <div>
                          <Label htmlFor="severity">Severity Level</Label>
                          <Select
                            value={formData.severity}
                            onValueChange={(value) => setFormData({ ...formData, severity: value })}
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
                          <Label htmlFor="affected">People Affected</Label>
                          <Input
                            id="affected"
                            value={formData.affected}
                            onChange={(e) => setFormData({ ...formData, affected: e.target.value })}
                            placeholder="e.g., 10,000+ people"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detailed description of the emergency situation"
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="impact">Estimated Impact</Label>
                          <Textarea
                            id="impact"
                            value={formData.estimatedImpact}
                            onChange={(e) => setFormData({ ...formData, estimatedImpact: e.target.value })}
                            placeholder="Expected impact and consequences"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <Button onClick={handleCreateAlert}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Create & Broadcast Alert
                      </Button>
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
