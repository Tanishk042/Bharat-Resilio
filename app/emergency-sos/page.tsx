"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Phone, MapPin, Users, Zap, Heart, Shield } from "lucide-react"
import { Navigation } from "@/components/navigation"

export default function EmergencySOS() {
  const [sosActive, setSosActive] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [location, setLocation] = useState("Getting location...")

  useEffect(() => {
    // Simulate getting user location
    setTimeout(() => {
      setLocation("123 MG Road, Koramangala, Bangalore")
    }, 2000)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (sosActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    } else if (countdown === 0) {
      // SOS would be sent here
      console.log("SOS Alert Sent!")
    }
    return () => clearInterval(interval)
  }, [sosActive, countdown])

  const handleSOSActivate = () => {
    setSosActive(true)
    setCountdown(10)
  }

  const handleSOSCancel = () => {
    setSosActive(false)
    setCountdown(10)
  }

  const emergencyContacts = [
    { name: "Emergency Services", number: "112", type: "Primary" },
    { name: "Local Police", number: "+91 98765 43210", type: "Police" },
    { name: "Fire Department", number: "+91 87654 32109", type: "Fire" },
    { name: "Medical Emergency", number: "+91 76543 21098", type: "Medical" },
    { name: "Disaster Hotline", number: "+91 65432 10987", type: "Disaster" },
  ]

  const emergencyTypes = [
    {
      type: "Medical Emergency",
      icon: Heart,
      color: "text-red-500",
      description: "Heart attack, severe injury, unconscious",
    },
    { type: "Fire Emergency", icon: Zap, color: "text-orange-500", description: "Building fire, wildfire, explosion" },
    {
      type: "Personal Safety",
      icon: Shield,
      color: "text-blue-500",
      description: "Violence, threat, unsafe situation",
    },
    {
      type: "Natural Disaster",
      icon: AlertTriangle,
      color: "text-yellow-500",
      description: "Earthquake, flood, severe weather",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto pt-20 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <p className="kicker">01 — Distress</p>
            <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">Emergency SOS</h1>
          </div>
          <p className="mt-3 text-muted-foreground max-w-2xl">Quick access to emergency services and SOS alerts</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* SOS Activation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main SOS Button */}
            <Card className={`${sosActive ? "border-red-500 bg-red-500/5" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Emergency SOS Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                {!sosActive ? (
                  <>
                    <div className="space-y-4">
                      <div
                        className="w-32 h-32 mx-auto bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                        onClick={handleSOSActivate}
                      >
                        <AlertTriangle className="h-16 w-16 text-white" />
                      </div>
                      <p className="text-lg font-semibold">Tap to Send Emergency Alert</p>
                      <p className="text-sm text-muted-foreground">
                        This will immediately alert emergency services and your emergency contacts
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="w-32 h-32 mx-auto bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-4xl font-bold text-white">{countdown}</span>
                      </div>
                      <p className="text-lg font-semibold text-red-500">SOS Alert in {countdown} seconds</p>
                      <Button
                        variant="outline"
                        onClick={handleSOSCancel}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-transparent"
                      >
                        Cancel Alert
                      </Button>
                    </div>
                  </>
                )}

                {/* Current Location */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Current Location</span>
                  </div>
                  <p className="text-sm">{location}</p>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Types */}
            <Card>
              <CardHeader>
                <CardTitle>Select Emergency Type</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {emergencyTypes.map((emergency, index) => {
                  const IconComponent = emergency.icon
                  return (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className={`h-5 w-5 ${emergency.color}`} />
                        <span className="font-medium">{emergency.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{emergency.description}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-3">
                <Button variant="outline" className="flex flex-col h-20 gap-2 bg-transparent">
                  <Phone className="h-5 w-5" />
                  <span className="text-xs">Call 112</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-20 gap-2 bg-transparent">
                  <MapPin className="h-5 w-5" />
                  <span className="text-xs">Share Location</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-20 gap-2 bg-transparent">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Alert Contacts</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.number}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {contact.type}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">GPS Location</span>
                  <Badge variant="outline" className="text-green-500">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network Connection</span>
                  <Badge variant="outline" className="text-green-500">
                    Strong
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Emergency Services</span>
                  <Badge variant="outline" className="text-green-500">
                    Available
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Battery Level</span>
                  <Badge variant="outline">85%</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Safety Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Stay calm and assess the situation</p>
                <p>• Provide clear location information</p>
                <p>• Follow dispatcher instructions</p>
                <p>• Keep phone charged and accessible</p>
                <p>• Know your emergency contacts</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
