"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Radio,
  MapPin,
  Clock,
  Link2,
  Blocks,
} from "lucide-react"
import { parseReport, submitIncident } from "@/services/api"
import { useResilioData, mergeIncidents } from "@/lib/use-resilio-data"
import { IndiaMap } from "@/components/india-map"

interface SubmittedIncident {
  incident_id: string
  hazard_type: string
  location: string
  severity: number
  status: string
  corroborations: number
}

export default function CitizenReportPage() {
  const [reportText, setReportText] = useState("")
  const [location, setLocation] = useState("")
  const [severity, setSeverity] = useState(5)
  const [hazardType, setHazardType] = useState("unknown")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState<SubmittedIncident | null>(null)

  const { incidents, meshIncidents, refresh } = useResilioData()
  const allIncidents = mergeIncidents(incidents, meshIncidents)

  const handleSubmit = async () => {
    if (!reportText.trim()) {
      setError("Please enter a report description")
      return
    }

    setLoading(true)
    setError("")
    setSubmitted(null)

    let finalHazard = hazardType
    let finalSeverity = severity
    let finalLocation = location || "Area not specified"

    try {
      const parsed = await parseReport(reportText)
      finalHazard = parsed.hazard_classification ?? hazardType
      finalLocation = (parsed.extracted_location?.formatted ?? parsed.extracted_location ?? location) || "Area not specified"
      finalSeverity = parsed.criticality_index ?? severity
    } catch {
      // ML unreachable — use form values as fallback
    }

    const incidentId = `inc-${Date.now()}`

    try {
      const result = await submitIncident({
        incident_id: incidentId,
        hazard_type: finalHazard,
        location: finalLocation,
        severity: finalSeverity,
        telemetry: {},
      })

      setSubmitted({
        incident_id: result.incident_id ?? incidentId,
        hazard_type: result.hazard_type ?? finalHazard,
        location: result.location ?? finalLocation,
        severity: result.severity ?? finalSeverity,
        status: result.status ?? "pending",
        corroborations: result.corroborations ?? 0,
      })

      await refresh()
    } catch (err) {
      setError("Failed to submit incident to the oracle. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const hazards = [
    "flood", "fire", "earthquake", "cyclone", "tornado",
    "storm", "landslide", "gas_leak", "chemical_spill",
    "bridge_collapse", "power_outage", "medical", "unknown",
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="kicker">01 — Line to the mesh</p>
              <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">Citizen Report</h1>
            </div>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Submit a disaster report. Our AI extracts key details and propagates your incident through the mesh and chain.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report an Incident</CardTitle>
                  <CardDescription>
                    Describe what you are witnessing. The system will auto-classify the hazard and submit it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Describe the incident, location, severity, and any relevant details..."
                      className="min-h-[200px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="City / area / coordinates"
                          className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Severity: <span className="font-bold text-primary">{severity}/10</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={severity}
                        onChange={(e) => setSeverity(Number(e.target.value))}
                        className="w-full mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Hazard Type (override)</label>
                    <select
                      value={hazardType}
                      onChange={(e) => setHazardType(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {hazards.map((h) => (
                        <option key={h} value={h}>
                          {h.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <Button onClick={handleSubmit} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Radio className="h-4 w-4 mr-2 animate-spin" />
                        Parsing &amp; Submitting…
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Submit Report
                      </>
                    )}
                  </Button>

                  {submitted && (
                    <div className="border rounded-lg p-4 space-y-3 bg-green-500/5">
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle className="h-5 w-5" />
                        Incident Submitted Successfully
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">ID</span>
                          <p className="font-mono text-xs">{submitted.incident_id}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Hazard</span>
                          <p className="font-medium capitalize">{submitted.hazard_type.replace(/_/g, " ")}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Location</span>
                          <p className="font-medium">{submitted.location}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground">Severity</span>
                          <p className="font-medium">{submitted.severity}/10</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={submitted.status === "verified" ? "default" : "secondary"}>
                          {submitted.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {submitted.corroborations} corroboration{submitted.corroborations !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Blocks className="h-3.5 w-3.5" />
                        Propagated via mesh CRDT + chain LogIncidentTx
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                    <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Your report is parsed by the DeX-LLM, propagated across the mesh network, and logged on-chain for transparency.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <IndiaMap incidents={allIncidents} title="Live Incidents" height="h-[320px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
