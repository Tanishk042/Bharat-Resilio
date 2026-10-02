"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Brain, MapPin, Clock } from "lucide-react"

interface DisasterPrediction {
  type: string
  probability: number
  severity: "low" | "medium" | "high" | "critical"
  location: string
  timeframe: string
  confidence: number
  recommendations: string[]
}

export function AICalamityPredictor() {
  const [predictions, setPredictions] = useState<DisasterPrediction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate AI prediction API call
    const fetchPredictions = async () => {
      setIsLoading(true)
      // Mock AI predictions with realistic data
      const mockPredictions: DisasterPrediction[] = [
        {
          type: "Cyclone",
          probability: 78,
          severity: "high",
          location: "Odisha Coast",
          timeframe: "Next 72 hours",
          confidence: 92,
          recommendations: ["Secure outdoor items", "Stock emergency supplies", "Review evacuation routes"],
        },
        {
          type: "Wildfire",
          probability: 45,
          severity: "medium",
          location: "Western Ghats, Karnataka",
          timeframe: "Next 7 days",
          confidence: 85,
          recommendations: ["Clear vegetation around property", "Prepare go-bag", "Monitor air quality"],
        },
        {
          type: "Earthquake",
          probability: 23,
          severity: "low",
          location: "Delhi NCR",
          timeframe: "Next 30 days",
          confidence: 67,
          recommendations: ["Secure heavy furniture", "Practice drop, cover, hold", "Check emergency kit"],
        },
      ]

      setTimeout(() => {
        setPredictions(mockPredictions)
        setIsLoading(false)
      }, 1500)
    }

    fetchPredictions()

    // Update predictions every 5 minutes
    const interval = setInterval(fetchPredictions, 300000)
    return () => clearInterval(interval)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  if (isLoading) {
    return (
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            AI Disaster Predictions
          </CardTitle>
          <CardDescription>Analyzing patterns and generating forecasts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glassmorphism neon-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Disaster Predictions
        </CardTitle>
        <CardDescription>
          Machine learning analysis of weather patterns, seismic data, and historical trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map((prediction, index) => (
            <div key={index} className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <h3 className="font-semibold">{prediction.type}</h3>
                  <Badge variant="outline" className={getSeverityColor(prediction.severity)}>
                    {prediction.severity}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{prediction.confidence}% confidence</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {prediction.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {prediction.timeframe}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Probability</span>
                    <span>{prediction.probability}%</span>
                  </div>
                  <Progress value={prediction.probability} className="h-2" />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">AI Recommendations:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {prediction.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
