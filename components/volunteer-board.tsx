"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HandHeart, MapPin, Calendar, Clock, Search, Star } from "lucide-react"
import { useState } from "react"

interface VolunteerOpportunity {
  id: string
  title: string
  organization: string
  location: string
  date: string
  duration: string
  volunteers: number
  needed: number
  type: "Emergency Response" | "Recovery" | "Education" | "Support"
  urgency: "low" | "medium" | "high" | "critical"
  description: string
  skills: string[]
  coordinator: {
    name: string
    avatar: string
    rating: number
  }
}

const opportunities: VolunteerOpportunity[] = [
  {
    id: "1",
    title: "Cyclone Relief Coordination",
    organization: "Indian Red Cross",
    location: "Bhubaneswar, Odisha",
    date: "Dec 20, 2024",
    duration: "3 days",
    volunteers: 45,
    needed: 100,
    type: "Emergency Response",
    urgency: "critical",
    description: "Coordinate emergency supplies distribution and shelter management for cyclone victims.",
    skills: ["Leadership", "Communication", "Crisis Management"],
    coordinator: {
      name: "Meera Gupta",
      avatar: "/placeholder.svg?height=32&width=32",
      rating: 5,
    },
  },
  {
    id: "2",
    title: "Flood Recovery Support",
    organization: "Local Disaster Management",
    location: "Kochi, Kerala",
    date: "Dec 22, 2024",
    duration: "1 week",
    volunteers: 23,
    needed: 50,
    type: "Recovery",
    urgency: "high",
    description: "Help families rebuild homes and restore communities affected by recent floods.",
    skills: ["Construction", "Counseling", "Logistics"],
    coordinator: {
      name: "Arjun Reddy",
      avatar: "/placeholder.svg?height=32&width=32",
      rating: 5,
    },
  },
  {
    id: "3",
    title: "Community Preparedness Training",
    organization: "NDMA",
    location: "Hyderabad, Telangana",
    date: "Dec 25, 2024",
    duration: "2 days",
    volunteers: 67,
    needed: 80,
    type: "Education",
    urgency: "medium",
    description: "Train community members on disaster preparedness and emergency response protocols.",
    skills: ["Teaching", "First Aid", "Public Speaking"],
    coordinator: {
      name: "Dr. Kavya Nair",
      avatar: "/placeholder.svg?height=32&width=32",
      rating: 5,
    },
  },
]

export function VolunteerBoard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all")

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || opp.type === selectedType
    const matchesUrgency = selectedUrgency === "all" || opp.urgency === selectedUrgency
    return matchesSearch && matchesType && matchesUrgency
  })

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-600/10 text-red-600 border-red-600/20"
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "medium":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Emergency Response":
        return "bg-red-500/10 text-red-500"
      case "Recovery":
        return "bg-blue-500/10 text-blue-500"
      case "Education":
        return "bg-green-500/10 text-green-500"
      case "Support":
        return "bg-purple-500/10 text-purple-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5" />
            Volunteer Opportunities
          </CardTitle>
          <Button size="sm">
            <HandHeart className="h-4 w-4 mr-2" />
            Post Opportunity
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Join disaster relief efforts and make a difference in your community
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedType === "all" ? "default" : "outline"}
              onClick={() => setSelectedType("all")}
              className={selectedType !== "all" ? "bg-transparent" : ""}
            >
              All Types
            </Button>
            <Button
              size="sm"
              variant={selectedUrgency === "all" ? "default" : "outline"}
              onClick={() => setSelectedUrgency("all")}
              className={selectedUrgency !== "all" ? "bg-transparent" : ""}
            >
              All Urgency
            </Button>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {filteredOpportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              className={`border transition-all duration-200 hover:shadow-md ${
                opportunity.urgency === "critical" ? "border-red-500/20 bg-red-500/5" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {opportunity.title}
                        {opportunity.urgency === "critical" && (
                          <Badge className="bg-red-500 text-white animate-pulse">URGENT</Badge>
                        )}
                      </h3>
                      <p className="text-muted-foreground">{opportunity.organization}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTypeColor(opportunity.type)}>
                        {opportunity.type}
                      </Badge>
                      <Badge variant="outline" className={getUrgencyColor(opportunity.urgency)}>
                        {opportunity.urgency.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{opportunity.description}</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{opportunity.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{opportunity.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{opportunity.duration}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Volunteers needed</span>
                        <span className="font-medium">
                          {opportunity.volunteers}/{opportunity.needed}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(opportunity.volunteers / opportunity.needed) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Required Skills:</div>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={opportunity.coordinator.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {opportunity.coordinator.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{opportunity.coordinator.name}</div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">{opportunity.coordinator.rating}.0</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <HandHeart className="h-4 w-4 mr-2" />
                        Volunteer
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-8">
            <HandHeart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No opportunities found</h3>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your search terms or filters</p>
            <Button>
              <HandHeart className="h-4 w-4 mr-2" />
              Post New Opportunity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
