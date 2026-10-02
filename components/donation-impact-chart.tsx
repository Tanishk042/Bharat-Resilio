"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis } from "recharts"
import { TrendingUp, Users, MapPin, Heart } from "lucide-react"

const impactData = [
  { month: "Jan", lives: 120, projects: 3, amount: 2500 },
  { month: "Feb", lives: 280, projects: 5, amount: 3200 },
  { month: "Mar", lives: 450, projects: 8, amount: 2800 },
  { month: "Apr", lives: 680, projects: 12, amount: 4100 },
  { month: "May", lives: 920, projects: 18, amount: 3600 },
  { month: "Jun", lives: 1247, projects: 23, amount: 5200 },
]

const chartConfig = {
  lives: {
    label: "Lives Impacted",
    color: "hsl(var(--primary))",
  },
  projects: {
    label: "Projects",
    color: "hsl(var(--accent))",
  },
}

export function DonationImpactChart() {
  const totalLives = impactData[impactData.length - 1].lives
  const totalProjects = impactData[impactData.length - 1].projects
  const totalAmount = impactData.reduce((sum, item) => sum + item.amount, 0)
  const monthlyGrowth = (
    ((impactData[impactData.length - 1].lives - impactData[impactData.length - 2].lives) /
      impactData[impactData.length - 2].lives) *
    100
  ).toFixed(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Cumulative Impact Over Time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how your donations have grown in impact over the past 6 months
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{totalLives.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground">Lives Impacted</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="text-2xl font-bold text-accent">{totalProjects}</span>
            </div>
            <div className="text-xs text-muted-foreground">Projects Funded</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-500">₹{(totalAmount * 80).toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground">Total Donated</div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[250px]">
          <AreaChart data={impactData}>
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="lives"
              stackId="1"
              stroke="var(--color-lives)"
              fill="var(--color-lives)"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Monthly Growth</span>
          <div className="flex items-center gap-1 text-green-500">
            <TrendingUp className="h-3 w-3" />
            <span className="font-medium">+{monthlyGrowth}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
