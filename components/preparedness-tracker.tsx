"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, AlertCircle, Shield } from "lucide-react"

interface PreparednessItem {
  id: string
  category: string
  progress: number
  status: "completed" | "in-progress" | "not-started"
  priority: "high" | "medium" | "low"
  lastUpdated: string
}

const preparednessItems: PreparednessItem[] = [
  {
    id: "1",
    category: "Emergency Kit",
    progress: 85,
    status: "in-progress",
    priority: "high",
    lastUpdated: "2 days ago",
  },
  {
    id: "2",
    category: "Communication Plan",
    progress: 70,
    status: "in-progress",
    priority: "high",
    lastUpdated: "1 week ago",
  },
  {
    id: "3",
    category: "Evacuation Route",
    progress: 100,
    status: "completed",
    priority: "high",
    lastUpdated: "3 days ago",
  },
  {
    id: "4",
    category: "Insurance Documents",
    progress: 60,
    status: "in-progress",
    priority: "medium",
    lastUpdated: "2 weeks ago",
  },
  {
    id: "5",
    category: "Family Meeting Point",
    progress: 0,
    status: "not-started",
    priority: "medium",
    lastUpdated: "Never",
  },
]

export function PreparednessTracker() {
  const overallProgress = Math.round(
    preparednessItems.reduce((sum, item) => sum + item.progress, 0) / preparednessItems.length,
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in-progress":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "not-started":
        return <Circle className="h-4 w-4 text-muted-foreground" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Preparedness Tracker
          </CardTitle>
          <Badge variant="outline" className="text-primary border-primary/50">
            {overallProgress}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {preparednessItems.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="font-medium text-sm">{item.category}</span>
                  <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </Badge>
                </div>
                <span className="text-sm font-medium">{item.progress}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={item.progress} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">{item.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1">
            Update Progress
          </Button>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
