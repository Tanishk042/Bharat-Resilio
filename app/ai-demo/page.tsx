"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Bell,
  Route as RouteIcon,
  MessageSquare,
  FileText,
  Database,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  MapPin,
  Radio,
  ShieldCheck,
  Play,
} from "lucide-react"
import { IndiaMap, hazardLabel } from "@/components/india-map"
import { useResilioData, type LiveIncident } from "@/lib/use-resilio-data"
import { useMeshHealth } from "@/components/connectivity-provider"
import { ML_BASE, API_BASE } from "@/lib/config"
import {
  predictHazard,
  submitIncident,
  getIncidents,
  findRoute,
  parseReport,
  submitChainIncident,
  getChainState,
} from "@/services/api"
import { buildAssistantReply, type AssistantReply } from "@/lib/assistant-brain"

interface Scenario {
  id: string
  name: string
  city: string
  lat: number
  lng: number
  hazard: string
  sensor: {
    seismic_magnitude: number
    seismic_frequency: number
    barometric_pressure: number
    barometric_trend: number
    water_level: number
    water_flow_rate: number
    wind_speed: number
    temperature: number
    audio_anomaly_weight: number
    precipitation: number
  }
  report: (city: string) => string
}

const SCENARIOS: Scenario[] = [
  {
    id: "kerala-floods",
    name: "Heavy rain → floods in Kerala",
    city: "Kochi",
    lat: 9.93,
    lng: 76.27,
    hazard: "flood",
    sensor: {
      seismic_magnitude: 0.6,
      seismic_frequency: 0.4,
      barometric_pressure: 985,
      barometric_trend: 3.0,
      water_level: 16,
      water_flow_rate: 16,
      wind_speed: 25,
      temperature: 30,
      audio_anomaly_weight: 1.0,
      precipitation: 16,
    },
    report: (c) =>
      `Weeks of heavy rain caused severe flooding in ${c} — our street is underwater and several families are trapped on rooftops. Send rescue boats urgently!`,
  },
  {
    id: "uttarakhand-quake",
    name: "Strong tremors → earthquake in Uttarakhand",
    city: "Dehradun",
    lat: 30.32,
    lng: 78.03,
    hazard: "earthquake",
    sensor: {
      seismic_magnitude: 20,
      seismic_frequency: 12,
      barometric_pressure: 1010,
      barometric_trend: 0.1,
      water_level: 0.3,
      water_flow_rate: 0.4,
      wind_speed: 6,
      temperature: 16,
      audio_anomaly_weight: 2.0,
      precipitation: 0.1,
    },
    report: (c) =>
      `Strong earthquake tremors near ${c} a few minutes ago — buildings are shaking, some people are injured and roads may be damaged. Need help!`,
  },
  {
    id: "odisha-cyclone",
    name: "Deep depression → cyclone off Odisha",
    city: "Bhubaneswar",
    lat: 20.3,
    lng: 85.82,
    hazard: "cyclone",
    sensor: {
      seismic_magnitude: 0.5,
      seismic_frequency: 0.3,
      barometric_pressure: 910,
      barometric_trend: -6,
      water_level: 9,
      water_flow_rate: 8,
      wind_speed: 150,
      temperature: 32,
      audio_anomaly_weight: 1.2,
      precipitation: 15,
    },
    report: (c) =>
      `A severe cyclone is forming near ${c} on the Odisha coast — high winds and storm surge expected, evacuate coastal villages immediately!`,
  },
]

const START_NODE = 18 // Delhi
const GOAL_NODE = 51 // Chennai
const GRID = 8

function cityToNode(lat: number, lng: number): number {
  const x = Math.min(GRID - 1, Math.max(0, Math.floor(((lng - 67.5) / 31) * GRID)))
  const y = Math.min(GRID - 1, Math.max(0, Math.floor(((37.5 - lat) / 31.5) * GRID)))
  return y * GRID + x
}

interface DemoResult {
  prediction?: {
    severity_score: number
    danger_tier: number
    tier_name: string
    confidence: number
    model: string
  }
  incident?: LiveIncident
  path?: number[]
  routeCost?: number
  routeMode?: string
  gnnAvailable?: boolean
  assistant?: AssistantReply
  parsed?: {
    hazard_classification?: string
    criticality_index?: number
    confidence?: number
    source?: string
    extracted_location?: { description: string } | string
    redacted_text?: string
    redaction_log?: Record<string, string[]>
  }
  chain?: { blocks: number; tipHash: string }
  mapIncidents?: LiveIncident[]
  predictError?: string
  alertError?: string
  routeError?: string
  assistantError?: string
  reportError?: string
  chainError?: string
}

const STEPS = [
  { id: 1, label: "Predict", icon: Brain },
  { id: 2, label: "Alert", icon: Bell },
  { id: 3, label: "Route", icon: RouteIcon },
  { id: 4, label: "Assistant", icon: MessageSquare },
  { id: 5, label: "Report", icon: FileText },
  { id: 6, label: "Chain", icon: Database },
]

export default function AiDemoPage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<DemoResult>({})
  const [lastStats, setLastStats] = useState<any>(null)
  const [chat, setChat] = useState<Array<{ role: "user" | "ai"; text: string }>>([])
  const [chatInput, setChatInput] = useState("")

  const { incidents: liveIncidents, refresh, stats } = useResilioData(15000)
  const { connected } = useMeshHealth()
  const [mlOnline, setMlOnline] = useState(false)
  const [oracleOnline, setOracleOnline] = useState(false)
  const [chainInfo, setChainInfo] = useState<{ blocks: number; tipHash: string } | null>(null)

  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0], [scenarioId])
  const hazardNode = useMemo(() => cityToNode(scenario.lat, scenario.lng), [scenario])

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const ml = await fetch(`${ML_BASE}/health`).then((r) => r.json())
        const oracle = await fetch(`${API_BASE}/health`).then((r) => r.json())
        const chain = await getChainState().catch(() => null)
        if (cancelled) return
        setMlOnline(Boolean(ml && ml.status === "healthy"))
        setOracleOnline(Boolean(oracle && oracle.status === "healthy"))
        if (chain) {
          const blocks = Array.isArray(chain.blocks) ? chain.blocks.length : Number(chain?.height ?? 0)
          setChainInfo({ blocks, tipHash: String(chain.tipHash ?? chain.tip_hash ?? "") })
        }
      } catch {
        if (!cancelled) {
          setMlOnline(false)
          setOracleOnline(false)
        }
      }
    }
    poll()
    const t = setInterval(poll, 8000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const setIncidentOnMap = useCallback(
    async (inc: LiveIncident) => {
      setResult((r) => ({ ...r, incident: inc }))
      try {
        const list = await getIncidents()
        const merged = (list?.incidents ?? []).map((i: any) => ({
          incident_id: String(i.incident_id ?? i.id ?? "inc-unknown"),
          hazard_type: String(i.hazard_type ?? i.kind ?? "unknown"),
          location: String(i.location ?? "Unknown"),
          severity: Number(i.severity ?? 5),
          status: String(i.status ?? "pending"),
          corroborations: Number(i.corroborations ?? 0),
          submitted_at: i.submitted_at ?? i.timestamp ?? undefined,
        }))
        setResult((r) => ({ ...r, mapIncidents: merged }))
      } catch {
        setResult((r) => ({ ...r, mapIncidents: [inc] }))
      }
    },
    [],
  )

  const runPrediction = async () => {
    setBusy("predict")
    try {
      const prediction = await predictHazard(scenario.sensor)
      setResult((r) => ({ ...r, prediction }))
    } catch (e) {
      setResult((r) => ({ ...r, predictError: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const pushAlert = async () => {
    setBusy("alert")
    const severity = Math.round(result.prediction?.severity_score ?? 7)
    try {
      const incident = await submitIncident({
        incident_id: `inc-ai-demo-${Date.now()}`,
        hazard_type: scenario.hazard,
        location: scenario.city,
        severity,
        telemetry: { source: "ai-demo", ml_model: result.prediction?.model },
      })
      await setIncidentOnMap(incident as LiveIncident)
      await refresh()
    } catch (e) {
      setResult((r) => ({ ...r, alertError: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const runRoute = async () => {
    setBusy("route")
    try {
      const res = await findRoute({
        start_node: START_NODE,
        goal_node: GOAL_NODE,
        hazard_zones: [hazardNode],
      })
      setResult((r) => ({
        ...r,
        path: res.path,
        routeCost: res.cost,
        routeMode: res.routing_mode,
        gnnAvailable: res.gnn_available,
      }))
    } catch (e) {
      setResult((r) => ({ ...r, routeError: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const askAssistant = async (text?: string) => {
    const question = text ?? `What to do during ${scenario.hazard}?`
    setBusy("assistant")
    try {
      const reply = await buildAssistantReply(question)
      setResult((r) => ({ ...r, assistant: reply }))
      setChat((c) => [...c, { role: "ai", text: reply.text }])
    } catch (e) {
      setResult((r) => ({ ...r, assistantError: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const knownHazards = [
    "flood",
    "fire",
    "earthquake",
    "cyclone",
    "tornado",
    "storm",
    "landslide",
    "gas_leak",
    "chemical_spill",
    "bridge_collapse",
    "medical",
    "power_outage",
  ]

  const runReportLoop = async () => {
    setBusy("report")
    try {
      const text = scenario.report(scenario.city)
      let parsed = await parseReport(text)
      const hz0 = String(parsed.hazard_classification ?? "unknown").toLowerCase()
      const locTest = String(
        typeof parsed.extracted_location === "string"
          ? parsed.extracted_location
          : parsed.extracted_location?.description ?? "",
      )
      const plausible =
        knownHazards.includes(hz0) &&
        hz0 === scenario.hazard &&
        /kochi|dehradun|bhubaneswar|kerala|uttarakhand|odisha/i.test(locTest)
      if (!plausible) {
        parsed = await parseReport(text, false)
      }
      const hz = String(parsed.hazard_classification ?? scenario.hazard)
      const sev = Math.max(1, Math.min(10, Number(parsed.criticality_index ?? 7)))
      const loc =
        typeof parsed.extracted_location === "string"
          ? parsed.extracted_location
          : parsed.extracted_location?.description ?? scenario.city
      const incident = await submitIncident({
        incident_id: `inc-citizen-${Date.now()}`,
        hazard_type: hz,
        location: loc,
        severity: sev,
        telemetry: { source: "ai-demo", ml_parse: String(parsed.source ?? "") },
      })
      setResult((r) => ({ ...r, parsed, incident }))
      await setIncidentOnMap(incident as LiveIncident)
      await refresh()
      const list = (await getIncidents()) as any
      setLastStats(list)
    } catch (e) {
      setResult((r) => ({ ...r, reportError: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const mineChain = async () => {
    setBusy("chain")
    try {
      const sev = result.incident?.severity ?? result.prediction?.severity_score ?? 7
      const incidentId = result.incident?.incident_id ?? `demo-${Date.now()}`
      const tier = sev >= 8 ? "Catastrophic" : sev >= 6 ? "High" : sev >= 4 ? "Warning" : "Minimal"
      await submitChainIncident({ incidentId, tier, reporterNodeId: "ai-demo" })
      const state = (await getChainState()) as any
      setResult((r) => ({
        ...r,
        chain: {
          blocks: state?.blocks ? state.blocks.length : Number(state?.height ?? 0),
          tipHash: String(state?.tipHash ?? state?.tip_hash ?? ""),
        },
      }))
    } catch (e) {
      setResult((r) => ({ ...r, chainError: String(e) }))
    } finally {
      setBusy(null)
    }
  }

  const goTo = (next: number) => {
    setStep(Math.max(1, Math.min(STEPS.length, next)))
    if (next === 4 && !result.assistant) askAssistant()
    if (next === 3 && !result.path) runRoute()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    setChat((c) => [...c, { role: "user", text }])
    setChatInput("")
    askAssistant(text)
  }

  const completedSteps = useMemo(() => {
    const done: number[] = []
    if (result.prediction) done.push(1)
    if (result.incident) done.push(2)
    if (result.path) done.push(3)
    if (result.assistant) done.push(4)
    if (result.parsed) done.push(5)
    if (result.chain) done.push(6)
    return done
  }, [result])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div>
            <p className="kicker">01 — Walk through one disaster</p>
            <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" /> Guided AI Walkthrough
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              One disaster story, end-to-end: the ML model predicts it, the oracle alerts it, the GNN routes around it,
              the assistant explains it, the citizens confirm it, the blockchain records it.
            </p>
          </div>

          {/* Service chips */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={mlOnline ? "default" : "outline"} className={mlOnline ? "gap-1" : "gap-1 text-muted-foreground"}>
              <Brain className="h-3 w-3" /> ML service {mlOnline ? "online" : "offline"}
            </Badge>
            <Badge variant={oracleOnline ? "default" : "outline"} className={oracleOnline ? "gap-1" : "gap-1 text-muted-foreground"}>
              <Bell className="h-3 w-3" /> Oracle {oracleOnline ? "online" : "offline"}
            </Badge>
            <Badge variant={connected ? "default" : "outline"} className={connected ? "gap-1" : "gap-1 text-muted-foreground"}>
              <Radio className="h-3 w-3" /> Mesh {connected ? "connected" : "standalone"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" /> Chain {chainInfo ? `${chainInfo.blocks} block(s)` : "…"}
            </Badge>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(s.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  step === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : completedSteps.includes(s.id)
                    ? "border-green-500/40 text-green-600 dark:text-green-400"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {completedSteps.includes(s.id) && s.id !== step ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
                {i + 1}. {s.label}
                {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 opacity-50" />}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Step content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-5">
                  {step === 1 && (
                    <>
                      <StepHeader
                        icon={Brain}
                        step={1}
                        title="Hazard prediction from sensor data"
                        sub="MultiTask Hazard CNN — every field on the left is fed to the model over HTTP, not mocked."
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        {SCENARIOS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setScenarioId(s.id)}
                            className={`text-left rounded-xl border p-4 transition-colors ${
                              scenarioId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{s.name}</span>
                              <Badge variant="secondary">{hazardLabel(s.hazard)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {s.city} · {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                            </p>
                          </button>
                        ))}
                      </div>
                      <SensorTable sensor={scenario.sensor} />
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button onClick={runPrediction} disabled={busy === "predict"}>
                          {busy === "predict" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          Run ML prediction
                        </Button>
                        {result.prediction && <Badge variant="outline">model: {result.prediction.model}</Badge>}
                      </div>
                      <PredictionPanel prediction={result.prediction} />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <StepHeader
                        icon={Bell}
                        step={2}
                        title="Push the prediction into the live alert feed"
                        sub="The oracle (8080) receives the predicted hazard, corroborates it against other reports, and streams it to every dashboard."
                      />
                      {result.prediction ? (
                        <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
                          <p>
                            Predicted: <strong className="capitalize">{hazardLabel(scenario.hazard)}</strong> in{" "}
                            <strong>{scenario.city}</strong> · severity{" "}
                            <strong>{Math.round(result.prediction.severity_score)}/10</strong> ·{" "}
                            {result.prediction.tier_name} tier.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Run step 1 first so this alert carries a real ML prediction.
                        </p>
                      )}
                      <Button onClick={pushAlert} disabled={busy === "alert" || !result.prediction}>
                        {busy === "alert" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                        Register as live alert
                      </Button>
                      {result.incident && (
                        <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4 text-sm space-y-1">
                          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" /> Alert registered
                          </p>
                          <p>
                            ID <code className="rounded bg-muted px-1 font-mono">{result.incident.incident_id}</code> ·
                            status <strong className="capitalize">{result.incident.status}</strong>
                          </p>
                          <p className="text-muted-foreground">
                            {result.incident.corroborations} corroboration(s) · see the pin on the live map → and watch
                            it roll into Real-time Alerts.
                          </p>
                          <Link href="/real-time-alerts" className="inline-block text-sm font-medium text-primary hover:underline">
                            Open Real-time Alerts →
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <StepHeader
                        icon={RouteIcon}
                        step={3}
                        title="Evacuation route that avoids the danger"
                        sub="The GNN router reads live edge congestion + hazard scores on an 8×8 road graph, then runs Dijkstra on the learned weights."
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Route from <strong className="text-foreground">Delhi</strong> to{" "}
                            <strong className="text-foreground">Chennai</strong> while{" "}
                            <strong className="text-foreground">{scenario.city}</strong> is a hazard zone (node{" "}
                            {hazardNode}).
                          </p>
                          <div className="grid grid-cols-8 gap-1 p-2 rounded-xl border bg-muted/20">
                            {Array.from({ length: 64 }).map((_, n) => {
                              const cell =
                                n === hazardNode
                                  ? "bg-red-500"
                                  : n === START_NODE
                                  ? "bg-green-500"
                                  : n === GOAL_NODE
                                  ? "bg-blue-500"
                                  : result.path?.includes(n)
                                  ? "bg-orange-400"
                                  : "bg-slate-200 dark:bg-slate-700"
                              return (
                                <div
                                  key={n}
                                  className={`aspect-square rounded ${cell} ${result.path?.includes(n) || n === hazardNode || n === START_NODE || n === GOAL_NODE ? "ring-1 ring-black/20" : "opacity-60"}`}
                                  title={`Node ${n}`}
                                />
                              )
                            })}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded bg-green-500" /> Start</span>
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded bg-blue-500" /> Goal</span>
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded bg-red-500" /> Hazard</span>
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded bg-orange-400" /> Evacuation path</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Button onClick={runRoute} disabled={busy === "route"}>
                            {busy === "route" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RouteIcon className="h-4 w-4 mr-2" />}
                            Compute safe route
                          </Button>
                          {result.path && (
                            <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={result.gnnAvailable ? "default" : "outline"}>
                                  {result.routeMode} {result.gnnAvailable ? "· trained weights" : "· fallback heuristic"}
                                </Badge>
                              </div>
                              <p>
                                Nodes traveled: <strong>{result.path.length}</strong> · total cost{" "}
                                <strong>{result.routeCost?.toFixed(3)}</strong>
                              </p>
                              <p className="font-mono text-[11px] text-muted-foreground break-all">
                                {result.path.join(" → ")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <StepHeader
                        icon={MessageSquare}
                        step={4}
                        title="Ask the AI survival assistant about the hazard"
                        sub="A retrieval + generator brain (preparedness engine + knowledge base) answers in plain language — and it can register reports too."
                      />
                      <div className="space-y-3">
                        {chat.map((m, i) => (
                          <div
                            key={i}
                            className={`rounded-xl border p-3 text-sm whitespace-pre-wrap ${
                              m.role === "user" ? "bg-primary/5 border-primary/20 ml-auto max-w-[85%]" : "bg-muted/30 max-w-[90%]"
                            }`}
                          >
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                              {m.role === "user" ? "You" : "Survival AI"}
                            </p>
                            {m.text}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={sendChat} className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder='Ask "what to do during an earthquake?" …'
                          className="flex-1 rounded-lg border px-3 py-2 text-sm bg-background"
                        />
                        <Button type="submit" disabled={busy === "assistant" || !chatInput.trim()} size="sm" className="h-9">
                          {busy === "assistant" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
                        </Button>
                      </form>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => askAssistant()}>
                          Ask auto: {scenario.hazard}
                        </Button>
                        {result.assistant?.actions?.map((a) =>
                          a.href ? (
                            <Button key={a.label} variant="outline" size="sm" asChild>
                              <Link href={a.href}>{a.label}</Link>
                            </Button>
                          ) : a.quick ? (
                            <Button
                              key={a.label}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (a.quick) askAssistant(a.quick)
                              }}
                            >
                              {a.label}
                            </Button>
                          ) : null,
                        )}
                        {result.assistant?.sources && result.assistant.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {result.assistant.sources.slice(0, 3).map((s) => (
                              <Badge key={s} variant="secondary">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {step === 5 && (
                    <>
                      <StepHeader
                        icon={FileText}
                        step={5}
                        title="A citizen report confirms the ML prediction"
                        sub="Free text → DeX-LLM parse (hazard, location, severity, PII redaction) → submitted to the oracle → corroborates the alert. Output is verified against the hazard ontology; if the model drifts, the deterministic extractor takes over."
                      />
                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Raw report</p>
                        <p className="text-sm">{scenario.report(scenario.city)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button onClick={runReportLoop} disabled={busy === "report"}>
                          {busy === "report" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          Parse &amp; submit
                        </Button>
                      </div>
                      {result.parsed && (
                        <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4 text-sm space-y-2">
                          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" /> DeX-LLM structured output
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Hazard" value={hazardLabel(String(result.parsed.hazard_classification ?? ""))} />
                            <Field label="Severity" value={`${result.parsed.criticality_index ?? "?"}/10`} />
                            <Field
                              label="Location"
                              value={
                                typeof result.parsed.extracted_location === "string"
                                  ? result.parsed.extracted_location
                                  : result.parsed.extracted_location?.description ?? "?"
                              }
                            />
                            <Field label="Confidence" value={`${Math.round(Number(result.parsed.confidence ?? 0) * 100)}%`} />
                            <Field label="Source" value={String(result.parsed.source ?? "?")} />
                            {result.incident && <Field label="Oracle ID" value={result.incident.incident_id} mono />}
                          </div>
                          {result.parsed.redacted_text && result.parsed.redacted_text !== scenario.report(scenario.city) && (
                            <p className="text-xs text-muted-foreground">
                              PII redaction: <code className="rounded bg-muted px-1 font-mono">{result.parsed.redacted_text}</code>
                            </p>
                          )}
                          {result.incident && (
                            <p className="text-xs text-muted-foreground">
                              Submitted → status <strong className="capitalize">{result.incident.status}</strong> ·{" "}
                              {result.incident.corroborations} corroboration(s). Total reports now on the oracle:{" "}
                              <strong>{stats?.total_incidents ?? liveIncidents.length}</strong>.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {step === 6 && (
                    <>
                      <StepHeader
                        icon={Database}
                        step={6}
                        title="Anchor the whole story on the blockchain"
                        sub="A LogIncidentTx is mined by the proof-of-authority chain — append-only, tamper-evident."
                      />
                      <Button onClick={mineChain} disabled={busy === "chain"}>
                        {busy === "chain" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                        Mine incident to chain
                      </Button>
                      {result.chain && (
                        <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4 text-sm space-y-1">
                          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" /> On-chain
                          </p>
                          <p>
                            Chain height <strong>{result.chain.blocks}</strong>
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground break-all">tip {result.chain.tipHash}</p>
                        </div>
                      )}
                      {result.chain && (
                        <div className="rounded-xl border bg-primary/5 p-4 text-sm space-y-2">
                          <p className="font-medium">Demo complete — full pipeline ran live</p>
                          <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                            <li>CNN predicted {hazardLabel(scenario.hazard)} (severity {Math.round(result.prediction?.severity_score ?? 0)}/10)</li>
                            <li>Oracle issued alert for {scenario.city}</li>
                            <li>GNN plotted a {result.routeMode} evacuation route avoiding node {hazardNode}</li>
                            <li>Assistant explained {scenario.hazard} safety</li>
                            <li>DeX-LLM parsed the citizen report and corroborated it</li>
                            <li>PoA chain anchored the incident record</li>
                          </ul>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/dashboard">Civilian Dashboard</Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/real-time-alerts">Real-time Alerts</Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/mesh">Mesh &amp; Family</Link>
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {step > 1 && step <= 6 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => goTo(step - 1)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button size="sm" onClick={() => goTo(step + 1)} disabled={step >= STEPS.length}>
                        Next step <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Side rail */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-primary" /> Everything on one live map
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <IndiaMap height="h-[360px]" incidents={result.mapIncidents ?? liveIncidents} interactive />
                </CardContent>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Pins come straight from the oracle — submit an alert or report and a new pin appears here.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Journey so far
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {STEPS.map((s) => {
                    const done = completedSteps.includes(s.id)
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="inline-block h-4 w-4 rounded-full border" />
                        )}
                        <span className={done ? "text-foreground" : "text-muted-foreground"}>
                          {s.label}
                        </span>
                        {s.id === 5 && result.parsed && lastStats && (
                          <span className="ml-auto text-xs text-muted-foreground">{lastStats.count} reports</span>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepHeader({
  icon: Icon,
  step,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  step: number
  title: string
  sub: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-primary/10 p-1.5">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="font-semibold">
          <span className="text-muted-foreground mr-1">Step {step}.</span>
          {title}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function SensorTable({ sensor }: { sensor: Scenario["sensor"] }) {
  const rows = [
    ["Seismic magnitude", sensor.seismic_magnitude],
    ["Seismic frequency", sensor.seismic_frequency],
    ["Barometric pressure", sensor.barometric_pressure],
    ["Barometric trend", sensor.barometric_trend],
    ["Water level", sensor.water_level],
    ["Water flow rate", sensor.water_flow_rate],
    ["Wind speed", sensor.wind_speed],
    ["Temperature", sensor.temperature],
    ["Audio anomaly weight", sensor.audio_anomaly_weight],
    ["Precipitation", sensor.precipitation],
  ]
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Live sensor telemetry (10 channels)</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-3 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-sm font-medium tabular-nums">{Number(value).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PredictionPanel({ prediction }: { prediction?: DemoResult["prediction"] }) {
  if (!prediction) return null
  const score = Number(prediction.severity_score ?? 0)
  const color = score >= 8 ? "bg-red-500" : score >= 6 ? "bg-orange-500" : score >= 4 ? "bg-yellow-500" : "bg-green-500"
  return (
    <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4 text-sm space-y-3">
      <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" /> Prediction output
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Severity score" value={`${prediction.severity_score}/10`} />
        <Field label="Danger tier" value={`${prediction.tier_name} (${prediction.danger_tier})`} />
        <Field label="Confidence" value={`${Math.round(Number(prediction.confidence ?? 0) * 100)}%`} />
        <Field label="Model" value={prediction.model} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Severity gauge</p>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  )
}