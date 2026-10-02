"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { CardContent } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Navigation,
  Download,
  AlertTriangle,
  Users,
  Package,
  Heart,
  Smartphone,
  QrCode,
  Settings,
  Wallet,
  Radio,
} from "lucide-react"

interface QuickActionsProps {
  userRole: "civilian" | "donor" | "ngo"
  variant?: "sidebar" | "grid" | "compact"
}

export function QuickActions({ userRole, variant = "sidebar" }: QuickActionsProps) {
  const router = useRouter()
  const [isDeploying, setIsDeploying] = useState(false)
  const [isRequestingSupplies, setIsRequestingSupplies] = useState(false)
  const [isCoordinating, setIsCoordinating] = useState(false)
  const [isDonating, setIsDonating] = useState(false)
  const [isTrackingImpact, setIsTrackingImpact] = useState(false)

  const handleQuickAction = async (action: string) => {
    console.log(`[v0] Quick action clicked: ${action} for role: ${userRole}`)

    switch (action) {
      case "ai-assistant":
        router.push("/ai-survival-assistant")
        break
      case "safe-route":
        router.push("/safe-route-finder")
        break
      case "offline-maps":
        router.push("/offline-maps")
        break
      case "emergency-sos":
        router.push("/emergency-sos")
        break
      case "mesh-network":
        router.push("/mesh")
        break
      case "quick-donate":
        router.push("/donor-dashboard/donate")
        break
      case "track-impact":
        router.push("/donor-dashboard/track")
        break
      case "blockchain-payment":
        router.push("/donor-dashboard/payment")
        break
      case "deploy-team":
        router.push("/ngo-dashboard/volunteers")
        break
      case "request-supplies":
        router.push("/ngo-dashboard/resources")
        break
      case "coordinate-volunteers":
        router.push("/ngo-dashboard/volunteers")
        break
      case "manage-operations":
        router.push("/ngo-dashboard/operations")
        break
      case "emergency-alerts":
        router.push("/ngo-dashboard/alerts")
        break
      default:
        console.log(`[v0] Unknown action: ${action}`)
    }
  }

  const getActionsForRole = () => {
    switch (userRole) {
      case "civilian":
        return [
          {
            id: "mesh-network",
            name: "मेश & परिवार",
            englishName: "Mesh & Family",
            icon: Radio,
            urgent: false,
            description: "डिवाइस से डिवाइस कनेक्शन",
          },
          {
            id: "ai-assistant",
            name: "AI सहायक",
            englishName: "AI Assistant",
            icon: MessageSquare,
            urgent: false,
            description: "आपातकालीन सलाह पाएं",
          },
          {
            id: "safe-route",
            name: "सुरक्षित मार्ग",
            englishName: "Safe Route",
            icon: Navigation,
            urgent: false,
            description: "सुरक्षित रास्ता खोजें",
          },
          {
            id: "offline-maps",
            name: "ऑफलाइन मैप",
            englishName: "Offline Maps",
            icon: Download,
            urgent: false,
            description: "मैप डाउनलोड करें",
          },
          {
            id: "emergency-sos",
            name: "आपातकालीन SOS",
            englishName: "Emergency SOS",
            icon: AlertTriangle,
            urgent: true,
            description: "तत्काल सहायता",
          },
        ]

      case "ngo":
        return [
          {
            id: "deploy-team",
            name: "टीम तैनात करें",
            englishName: "Deploy Team",
            icon: Users,
            urgent: true,
            description: "आपातकालीन टीम भेजें",
            loading: isDeploying,
          },
          {
            id: "request-supplies",
            name: "आपूर्ति मांगें",
            englishName: "Request Supplies",
            icon: Package,
            urgent: false,
            description: "जरूरी सामान मांगें",
            loading: isRequestingSupplies,
          },
          {
            id: "coordinate-volunteers",
            name: "स्वयंसेवक समन्वय",
            englishName: "Coordinate Volunteers",
            icon: Heart,
            urgent: true,
            description: "स्वयंसेवकों को व्यवस्थित करें",
            loading: isCoordinating,
          },
          {
            id: "manage-operations",
            name: "संचालन प्रबंधन",
            englishName: "Manage Operations",
            icon: Settings,
            urgent: false,
            description: "राहत कार्यों का प्रबंधन",
          },
          {
            id: "mesh-network",
            name: "मेश एवं परिवार",
            englishName: "Mesh & Family",
            icon: Radio,
            urgent: false,
            description: "मेश नेटवर्क से जुड़ें",
          },
          {
            id: "emergency-alerts",
            name: "आपातकालीन अलर्ट",
            englishName: "Emergency Alerts",
            icon: AlertTriangle,
            urgent: true,
            description: "तत्काल अलर्ट भेजें",
          },
        ]

      case "donor":
        return [
          {
            id: "quick-donate",
            name: "त्वरित दान",
            englishName: "Quick Donate",
            icon: Heart,
            urgent: false,
            description: "तुरंत दान करें",
            loading: isDonating,
          },
          {
            id: "track-impact",
            name: "प्रभाव ट्रैक करें",
            englishName: "Track Impact",
            icon: QrCode,
            urgent: false,
            description: "दान का प्रभाव देखें",
            loading: isTrackingImpact,
          },
          {
            id: "blockchain-payment",
            name: "ब्लॉकचेन भुगतान",
            englishName: "Blockchain Payment",
            icon: Wallet,
            urgent: false,
            description: "सुरक्षित क्रिप्टो दान",
          },
          {
            id: "mesh-network",
            name: "मेश एवं परिवार",
            englishName: "Mesh & Family",
            icon: Radio,
            urgent: false,
            description: "बिना इंटरनेट जुड़े रहें",
          },
          {
            id: "emergency-sos",
            name: "आपातकालीन दान",
            englishName: "Emergency Donation",
            icon: AlertTriangle,
            urgent: true,
            description: "आपातकालीन सहायता",
          },
        ]

      default:
        return []
    }
  }

  const actions = getActionsForRole()

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-2">
        {actions.slice(0, 3).map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              size="sm"
              variant={action.urgent ? "default" : "outline"}
              onClick={() => handleQuickAction(action.id)}
              disabled={action.loading}
              className="flex items-center gap-1"
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{action.loading ? "..." : action.name}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              variant={action.urgent ? "default" : "outline"}
              className="h-20 flex-col gap-2 p-4"
              onClick={() => handleQuickAction(action.id)}
              disabled={action.loading}
            >
              <Icon className="h-6 w-6" />
              <div className="text-center">
                <div className="text-xs font-medium">{action.loading ? "प्रक्रिया में..." : action.name}</div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {action.loading ? "Processing..." : action.englishName}
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          त्वरित कार्य / Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              className="w-full justify-start bg-transparent"
              variant={action.urgent ? "default" : "outline"}
              onClick={() => handleQuickAction(action.id)}
              disabled={action.loading}
            >
              <Icon className="h-4 w-4 mr-3" />
              <div className="flex-1 text-left">
                <div className="font-medium">{action.loading ? "प्रक्रिया में..." : action.name}</div>
                <div className="text-xs text-muted-foreground">
                  {action.loading ? "Processing..." : action.description}
                </div>
              </div>
              {action.urgent && !action.loading && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  तत्काल
                </Badge>
              )}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
