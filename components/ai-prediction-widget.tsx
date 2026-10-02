"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Brain, AlertTriangle, MapPin, Clock } from "lucide-react"
import { useState } from "react"

interface DisasterPrediction {
  type: string
  location: string
  probability: number
  confidence: "Low" | "Medium" | "High"
  timeframe: string
  recommendation: string
  lastUpdated: string
}

export function AIPredictionWidget() {
  const [prediction, setPrediction] = useState<DisasterPrediction>({
    type: "Cyclone",
    location: "Tamil Nadu Coast",
    probability: 73,
    confidence: "High",
    timeframe: "Next 7 days",
    recommendation: "Review evacuation plan and prepare emergency kit",
    lastUpdated: "2 minutes ago",
  })

  const [isLoading, setIsLoading] = useState(false)

  const refreshPrediction = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setPrediction((prev) => ({
        ...prev,
        probability: Math.floor(Math.random() * 40) + 60, // 60-100%
        lastUpdated: "Just now",
      }))
      setIsLoading(false)
    }, 1000)
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High":
        return "text-green-500 border-green-500/50"
      case "Medium":
        return "text-yellow-500 border-yellow-500/50"
      case "Low":
        return "text-red-500 border-red-500/50"
      default:
        return "text-muted-foreground"
    }
  }

  const getRiskColor = (probability: number) => {
    if (probability >= 70) return "text-red-500"
    if (probability >= 40) return "text-orange-500"
    return "text-green-500"
  }

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">AI Disaster Prediction</CardTitle>
          </div>
          <Badge variant="outline" className={getConfidenceColor(prediction.confidence)}>
            {prediction.confidence} Confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                {prediction.type} Risk
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {prediction.location}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getRiskColor(prediction.probability)}`}>
                {prediction.probability}%
              </div>
              <div className="text-xs text-muted-foreground">{prediction.timeframe}</div>
            </div>
          </div>

          <Progress value={prediction.probability} className="h-3" />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Recommended action:</strong> {prediction.recommendation}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {prediction.lastUpdated}
              </div>
              <Button size="sm" variant="outline" onClick={refreshPrediction} disabled={isLoading}>
                {isLoading ? "Updating..." : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1">
              View Detailed Analysis
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
              Set Alert Preferences
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
