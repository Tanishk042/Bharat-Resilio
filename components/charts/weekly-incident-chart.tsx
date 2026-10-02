"use client"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis } from "recharts"

export function WeeklyIncidentChart({
  data,
  config,
  colorVar = "var(--color-reports)",
  className = "h-[200px]",
}: {
  data: Array<{ day: string; reports: number }>
  config: any
  colorVar?: string
  className?: string
}) {
  return (
    <ChartContainer config={config} className={className}>
      <BarChart data={data}>
        <XAxis dataKey="day" />
        <YAxis allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="reports" fill={colorVar} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export function ChartLoading({
  height,
}: {
  height?: string
}) {
  return <div className={height ?? "h-[200px]"} />
}