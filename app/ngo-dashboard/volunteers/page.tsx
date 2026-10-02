"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileDropdown } from "@/components/profile-dropdown"
import {
  ArrowLeft,
  Users,
  Phone,
  MapPin,
  Search,
  UserPlus,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { hazardLabel } from "@/components/india-map"
import { useMeshHealth } from "@/components/connectivity-provider"

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "")

export default function VolunteersPage() {
  const { incidents, stats } = useResilioData(15000)
  const { peers, connected } = useMeshHealth()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const [activeTab, setActiveTab] = useState("teams")

  const teams = peers.map((peer, index) => ({
    id: peer.nodeId ?? `peer-${index}`,
    name: peer.role ? `${capitalize(peer.role)} Node` : "Mesh Node",
    nodeId: peer.nodeId ?? `peer-${index}`,
    members: 1,
    status: peer.connected ? "Reachable" : "Offline",
    state: peer.connected ? "Reachable" : "Offline",
    location: peer.host ? `${peer.host}${peer.port ? `:${peer.port}` : ""}` : "Mesh fabric",
    contact: "Routed via mesh",
    coordinator: peer.nodeId ?? "Unnamed node",
    specialization: peer.role ?? "mesh responder",
    lastDeployment: peer.lastSeenAt ? new Date(Number(peer.lastSeenAt)).toISOString().split("T")[0] : "—",
    availability: peer.connected ? "Available" : "Offline",
    connected: peer.connected,
  }))

  const individualVolunteers = peers.map((peer, index) => ({
    id: peer.nodeId ?? `peer-${index}`,
    name: peer.nodeId ?? `mesh-node-${index}`,
    skills: [peer.role ?? "mesh responder"],
    location: peer.host ? `${peer.host}${peer.port ? `:${peer.port}` : ""}` : "Mesh fabric",
    contact: "Routed via mesh",
    status: peer.connected ? "Available" : "Offline",
    experience: "mesh node",
    lastActive: peer.lastSeenAt ? new Date(Number(peer.lastSeenAt)).toISOString().split("T")[0] : "—",
  }))

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? teams[0] ?? null
  const reachable = peers.filter((p) => p.connected).length
  const merged = mergeIncidents(incidents, [])
  const activeIncidents = merged.filter((i) => i.status === "verified")
  const deploymentDestination =
    activeIncidents.slice().sort((a, b) => b.submitted_at ?? 0 - (a.submitted_at ?? 0))[0]?.location ?? null

  const handleDeployTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return
    alert(
      `टीम तैनात की गई! / Team Deployed!\n\n` +
        `Team: ${team.name} (${team.nodeId})\n` +
        `Destination: ${deploymentDestination ?? "nearest live theatre via mesh"}\n` +
        `Status: En Route via mesh`,
    )
  }

  const handleSendMessage = (teamId: string) => {
    if (!messageText.trim()) return
    const team = teams.find((t) => t.id === teamId)
    alert(
      `संदेश भेजा गया! / Message Sent!\n\n` +
        `To: ${team?.name ?? "Mesh node"}\n` +
        `Message: ${messageText}\n` +
        `Status: Delivered to mesh fabric`,
    )
    setMessageText("")
  }

  const handleMassAlert = () => {
    alert(
      `सामूहिक अलर्ट भेजा गया! / Mass Alert Sent!\n\n` +
        `Recipients: ${peers.length} mesh node(s), ${reachable} reachable\n` +
        `Message: Emergency preparedness alert\n` +
        `Channels: Mesh fabric + App\n` +
        `Status: Broadcast`,
    )
  }

  const handleEmergencyCall = () => {
    alert(
      `आपातकालीन कॉन्फ्रेंस कॉल! / Emergency Conference Call!\n\n` +
        `Participants: ${reachable} reachable mesh node(s)\n` +
        `Mesh status: ${connected ? "connected" : "offline"}\n` +
        `Status: Connecting...`,
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Ready":
      case "Available":
      case "Reachable":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Deployed":
      case "On Mission":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "Standby":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "On Leave":
      case "Offline":
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ready":
      case "Available":
      case "Reachable":
        return "text-green-500 border-green-500/50"
      case "Deployed":
      case "On Mission":
        return "text-blue-500 border-blue-500/50"
      case "Standby":
        return "text-yellow-500 border-yellow-500/50"
      case "On Leave":
      case "Offline":
        return "text-gray-500 border-gray-500/50"
      default:
        return "text-gray-500 border-gray-500/50"
    }
  }

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.coordinator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.nodeId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredVolunteers = individualVolunteers.filter(
    (volunteer) =>
      volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase())),
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
                <h1 className="text-3xl font-bold">स्वयंसेवक प्रबंधन / Volunteer Management</h1>
                <p className="text-muted-foreground">Coordinate and manage volunteer teams and individuals</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleEmergencyCall}>
                <Phone className="h-4 w-4 mr-2" />
                Emergency Call
              </Button>
              <Button variant="outline" onClick={handleMassAlert}>
                <Send className="h-4 w-4 mr-2" />
                Mass Alert
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
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search mesh nodes, locations, or roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Volunteer
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="teams">Volunteer Teams</TabsTrigger>
              <TabsTrigger value="individuals">Individual Volunteers</TabsTrigger>
              <TabsTrigger value="deployment">Deployment Status</TabsTrigger>
            </TabsList>

            <TabsContent value="teams">
              {teams.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No mesh peers online yet — reconnect nodes
                  </CardContent>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Teams List */}
                  <div className="space-y-4">
                    {filteredTeams.map((team) => (
                      <Card
                        key={team.id}
                        className={`cursor-pointer transition-all ${
                          selectedTeam?.id === team.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{team.name}</h3>
                            <Badge variant="outline" className={getStatusColor(team.status)}>
                              {team.status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              <span>{team.members} member</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{team.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{team.contact}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>{team.nodeId}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Team Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedTeam ? (
                      <>
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2">
                                {getStatusIcon(selectedTeam.status)}
                                {selectedTeam.name}
                              </CardTitle>
                              <Badge variant="outline" className={getStatusColor(selectedTeam.status)}>
                                {selectedTeam.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Coordinator</label>
                                  <p className="font-medium">{selectedTeam.coordinator}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Specialization</label>
                                  <p>{selectedTeam.specialization}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedTeam.location}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Team Size</label>
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-lg font-semibold">{selectedTeam.members} member</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Contact</label>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedTeam.contact}</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Last Seen</label>
                                  <p>{selectedTeam.lastDeployment}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Team Actions */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Team Actions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-4 mb-4">
                              <Button
                                onClick={() => handleDeployTeam(selectedTeam.id)}
                                disabled={!selectedTeam.connected}
                              >
                                Deploy Team
                              </Button>
                              <Button variant="outline" disabled={!selectedTeam.connected}>
                                <Phone className="h-4 w-4 mr-2" />
                                Call Team
                              </Button>
                              <Button variant="outline" disabled={!selectedTeam.connected}>
                                View Details
                              </Button>
                            </div>

                            {/* Send Message */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Send Message to Team</label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Type your message..."
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                />
                                <Button onClick={() => handleSendMessage(selectedTeam.id)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                          No mesh peer nodes available to display.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="individuals">
              {filteredVolunteers.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    {peers.length === 0
                      ? "No mesh peers online yet — reconnect nodes"
                      : "No mesh nodes match your search."}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVolunteers.map((volunteer) => (
                    <Card key={volunteer.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{volunteer.name}</h3>
                          <Badge variant="outline" className={getStatusColor(volunteer.status)}>
                            {volunteer.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{volunteer.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{volunteer.contact}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Role: </span>
                            <span>{volunteer.skills.join(", ")}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Experience: </span>
                            <span>{volunteer.experience}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Active: </span>
                            <span>{volunteer.lastActive}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className="flex-1" disabled={!volunteer.status.includes("Avail")}>
                            Contact
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 bg-transparent" disabled={!volunteer.status.includes("Avail")}>
                            Assign
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="deployment">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-500">{activeIncidents.length}</div>
                    <div className="text-sm text-muted-foreground">Active Deployments (verified)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-yellow-500">
                      {stats?.pending ?? merged.filter((i) => i.status === "pending").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Reports (standby)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-blue-500">{reachable}</div>
                    <div className="text-sm text-muted-foreground">Reachable Mesh Nodes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary">{peers.length}</div>
                    <div className="text-sm text-muted-foreground">Total Volunteer Nodes</div>
                  </CardContent>
                </Card>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Deployment numbers are computed live from the oracle ({merged.length} incident(s)) and the mesh
                ({peers.length} node(s), {reachable} reachable).
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}