"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ExternalLink, Shield, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useState } from "react"

interface DonationFlow {
  id: string
  stage: string
  status: "completed" | "in-progress" | "pending"
  amount: number
  timestamp: string
  txHash?: string
  description: string
}

const donationFlowStages: DonationFlow[] = [
  {
    id: "1",
    stage: "Donation Received",
    status: "completed",
    amount: 40000,
    timestamp: "2024-01-15 10:30 AM",
    txHash: "0x1a2b3c4d5e6f...",
    description: "Your donation has been received and confirmed on the blockchain",
  },
  {
    id: "2",
    stage: "Funds Allocated",
    status: "completed",
    amount: 40000,
    timestamp: "2024-01-15 11:45 AM",
    txHash: "0x2b3c4d5e6f7g...",
    description: "Funds allocated to Cyclone Relief Emergency Supplies",
  },
  {
    id: "3",
    stage: "Supplies Purchased",
    status: "completed",
    amount: 38400,
    timestamp: "2024-01-16 09:15 AM",
    txHash: "0x3c4d5e6f7g8h...",
    description: "Emergency supplies purchased from verified vendors",
  },
  {
    id: "4",
    stage: "Distribution Center",
    status: "in-progress",
    amount: 38400,
    timestamp: "2024-01-16 02:30 PM",
    description: "Supplies arrived at local distribution center",
  },
  {
    id: "5",
    stage: "Delivered to Recipients",
    status: "pending",
    amount: 38400,
    timestamp: "Estimated: 2024-01-17",
    description: "Final delivery to disaster-affected families",
  },
]

export function BlockchainDonationTracker() {
  const [selectedDonation, setSelectedDonation] = useState("recent")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500 border-green-500/50"
      case "in-progress":
        return "text-orange-500 border-orange-500/50"
      case "pending":
        return "text-muted-foreground border-muted-foreground/50"
      default:
        return "text-muted-foreground"
    }
  }

  const completedStages = donationFlowStages.filter((stage) => stage.status === "completed").length
  const totalStages = donationFlowStages.length
  const progressPercentage = (completedStages / totalStages) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Donation Flow Tracker
          </CardTitle>
          <Badge variant="outline" className="text-primary border-primary/50">
            {Math.round(progressPercentage)}% Complete
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your donation from wallet to recipient with full blockchain transparency
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">
              {completedStages} of {totalStages} stages
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-4">
          {donationFlowStages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {index < donationFlowStages.length - 1 && (
                <div className="absolute left-2 top-8 w-0.5 h-12 bg-border"></div>
              )}

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{getStatusIcon(stage.status)}</div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{stage.stage}</div>
                      <div className="text-xs text-muted-foreground">{stage.timestamp}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">₹{stage.amount.toLocaleString()}</div>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(stage.status)}`}>
                        {stage.status.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{stage.description}</p>

                  {stage.txHash && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">TX:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{stage.txHash}</code>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button size="sm" className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Blockchain
          </Button>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            Download Receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
