"use client"

import { useState } from "react"
import { AICalamityPredictor } from "@/components/ai-calamity-predictor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, MapPin, Battery, Wifi } from "lucide-react"
import { QuickActions } from "@/components/quick-actions"
import { ProfileDropdown } from "@/components/profile-dropdown"

export default function CivilianDashboard() {
  const [connectionStatus, setConnectionStatus] = useState({
    internet: "connected",
    meshNetwork: "available",
    offlineMode: "ready",
  })

  const [preparednessItems, setPreparednessItems] = useState([
    { id: "kit", name: "आपातकालीन किट / Emergency Kit", status: "complete", progress: 100 },
    { id: "plan", name: "निकासी योजना / Evacuation Plan", status: "needs-update", progress: 60 },
    { id: "contacts", name: "आपातकालीन संपर्क / Emergency Contacts", status: "updated", progress: 100 },
  ])

  const handleAlertClick = (alertType: string) => {
    console.log(`[v0] Alert clicked: ${alertType}`)
    switch (alertType) {
      case "flood-warning":
        alert(
          "बाढ़ चेतावनी विवरण!\n\n• स्थान: डाउनटाउन एरिया\n• गंभीरता: उच्च\n• अनुमानित समय: 2-4 घंटे\n• सुझाव: ऊंचे स्थान पर जाएं\n\nFlood Warning Details!\n• Location: Downtown Area\n• Severity: High\n• Estimated time: 2-4 hours\n• Advice: Move to higher ground",
        )
        break
      case "air-quality":
        alert(
          "वायु गुणवत्ता अलर्ट!\n\n• AQI: 156 (अस्वस्थ)\n• मुख्य प्रदूषक: PM2.5\n• सुझाव: घर के अंदर रहें\n• मास्क पहनें\n\nAir Quality Alert!\n• AQI: 156 (Unhealthy)\n• Primary pollutant: PM2.5\n• Advice: Stay indoors\n• Wear masks",
        )
        break
    }
  }

  const handleConnectionClick = (connectionType: string) => {
    console.log(`[v0] Connection clicked: ${connectionType}`)
    switch (connectionType) {
      case "internet":
        alert(
          "इंटरनेट कनेक्शन!\n\n• स्थिति: जुड़ा हुआ\n• गति: 45 Mbps\n• विलंबता: 23ms\n• प्रदाता: Airtel\n\nInternet Connection!\n• Status: Connected\n• Speed: 45 Mbps\n• Latency: 23ms\n• Provider: Airtel",
        )
        break
      case "mesh":
        alert(
          "मेश नेटवर्क!\n\n• स्थिति: उपलब्ध\n• नोड्स: 12 आसपास\n• सिग्नल: मजबूत\n• बैकअप: तैयार\n\nMesh Network!\n• Status: Available\n• Nodes: 12 nearby\n• Signal: Strong\n• Backup: Ready",
        )
        break
      case "offline":
        alert(
          "ऑफलाइन मोड!\n\n• स्थिति: तैयार\n• मैप्स: डाउनलोड किए गए\n• डेटा: सिंक किया गया\n• बैटरी: 85%\n\nOffline Mode!\n• Status: Ready\n• Maps: Downloaded\n• Data: Synced\n• Battery: 85%",
        )
        break
    }
  }

  const handlePreparednessClick = (itemId: string) => {
    console.log(`[v0] Preparedness item clicked: ${itemId}`)
    const item = preparednessItems.find((i) => i.id === itemId)
    switch (itemId) {
      case "kit":
        alert(
          "आपातकालीन किट!\n\n• स्थिति: पूर्ण\n• आइटम: 15/15\n• अंतिम जांच: 3 दिन पहले\n• अगली जांच: 27 दिन में\n\nEmergency Kit!\n• Status: Complete\n• Items: 15/15\n• Last check: 3 days ago\n• Next check: In 27 days",
        )
        break
      case "plan":
        alert(
          "निकासी योजना!\n\n• स्थिति: अपडेट चाहिए\n• अंतिम अपडेट: 6 महीने पहले\n• मार्ग: 3 वैकल्पिक\n• मीटिंग पॉइंट: निर्धारित\n\nEvacuation Plan!\n• Status: Needs update\n• Last update: 6 months ago\n• Routes: 3 alternatives\n• Meeting point: Set",
        )
        break
      case "contacts":
        alert(
          "आपातकालीन संपर्क!\n\n• स्थिति: अपडेटेड\n• संपर्क: 8 व्यक्ति\n• अंतिम जांच: 1 सप्ताह पहले\n• सभी सक्रिय: हां\n\nEmergency Contacts!\n• Status: Updated\n• Contacts: 8 people\n• Last check: 1 week ago\n• All active: Yes",
        )
        break
    }
  }

  const updatePreparednessItem = (itemId: string) => {
    console.log(`[v0] Updating preparedness item: ${itemId}`)
    setPreparednessItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: "updated", progress: Math.min(100, item.progress + 20) } : item,
      ),
    )
    alert(
      "आइटम अपडेट किया गया!\n\n• स्थिति: अपडेटेड\n• प्रगति: बेहतर\n• अगली समीक्षा: निर्धारित\n\nItem Updated!\n• Status: Updated\n• Progress: Improved\n• Next review: Scheduled",
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
      case "updated":
        return "text-green-500"
      case "needs-update":
        return "text-yellow-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "complete":
      case "updated":
        return "outline" as const
      case "needs-update":
        return "outline" as const
      default:
        return "outline" as const
    }
  }

  return (
    <div className="min-h-screen bg-background mesh-network">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">नागरिक डैशबोर्ड / Civilian Dashboard</h1>
            <p className="text-muted-foreground">तैयार रहें, सुरक्षित रहें / Stay prepared, stay safe</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              ऑनलाइन / Online
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Battery className="h-3 w-3" />
              85%
            </Badge>
            <ProfileDropdown userRole="civilian" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - AI Predictions */}
          <div className="lg:col-span-2 space-y-6">
            <AICalamityPredictor />

            {/* Real-time Alerts */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  सक्रिय अलर्ट / Active Alerts
                </CardTitle>
                <CardDescription>आपके क्षेत्र के लिए प्राथमिकता अलर्ट / Priority alerts for your area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div
                    className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/15 transition-colors"
                    onClick={() => handleAlertClick("flood-warning")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-orange-500">बाढ़ की चेतावनी / Flash Flood Warning</h3>
                      <Badge variant="destructive">उच्च / High</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      आपके क्षेत्र में भारी बारिश की संभावना। निचले इलाकों से बचें।
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Heavy rainfall expected in your area. Avoid low-lying roads.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      डाउनटाउन एरिया / Downtown Area • 2 घंटे पहले / 2 hours ago
                    </div>
                  </div>

                  <div
                    className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/15 transition-colors"
                    onClick={() => handleAlertClick("air-quality")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-yellow-500">वायु गुणवत्ता अलर्ट / Air Quality Alert</h3>
                      <Badge variant="secondary">मध्यम / Medium</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      आसपास की आग से धुआं वायु गुणवत्ता को प्रभावित कर रहा है।
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">Smoke from nearby fires affecting air quality.</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      क्षेत्रीय / Regional • 4 घंटे पहले / 4 hours ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Status */}
          <div className="space-y-6">
            {/* Connection Status */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-green-500" />
                  कनेक्शन स्थिति / Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  onClick={() => handleConnectionClick("internet")}
                >
                  <span className="text-sm">इंटरनेट / Internet</span>
                  <Badge variant="outline" className="text-green-500">
                    जुड़ा हुआ / Connected
                  </Badge>
                </div>
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  onClick={() => handleConnectionClick("mesh")}
                >
                  <span className="text-sm">मेश नेटवर्क / Mesh Network</span>
                  <Badge variant="outline" className="text-blue-500">
                    उपलब्ध / Available
                  </Badge>
                </div>
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  onClick={() => handleConnectionClick("offline")}
                >
                  <span className="text-sm">ऑफलाइन मोड / Offline Mode</span>
                  <Badge variant="outline">तैयार / Ready</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Kit Status */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  आपातकालीन तैयारी / Emergency Preparedness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>समग्र तैयारी / Overall Readiness</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>

                <div className="space-y-2 text-sm">
                  {preparednessItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handlePreparednessClick(item.id)}
                      >
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusColor(item.status)}>
                          {item.status === "complete"
                            ? "पूर्ण / Complete"
                            : item.status === "needs-update"
                              ? "अपडेट चाहिए / Needs Update"
                              : "अपडेटेड / Updated"}
                        </Badge>
                        {item.status === "needs-update" && (
                          <Button size="sm" variant="outline" onClick={() => updatePreparednessItem(item.id)}>
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <QuickActions userRole="civilian" variant="sidebar" />
          </div>
        </div>
      </div>
    </div>
  )
}
