"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Radio,
  MapPin,
  Users,
  ShieldCheck,
  Send,
  Loader2,
  Smartphone,
  WifiOff,
  Globe,
  RefreshCw,
  Copy,
  Check,
  Link2,
} from "lucide-react"
import type { Recipient } from "@/lib/use-mesh-location"
import { useMeshLocation } from "@/lib/use-mesh-location"

const RECIPIENT_OPTIONS: { value: Recipient; label: string; description: string; icon: typeof Users }[] = [
  {
    value: "family",
    label: "Family member",
    description: "Delivered instantly to nearby devices (other tabs / mesh). No internet.",
    icon: Users,
  },
  {
    value: "authorities",
    label: "Authorities",
    description: "Submitted to the Resilio oracle for the response teams to see.",
    icon: ShieldCheck,
  },
  {
    value: "both",
    label: "Both",
    description: "Sent to family devices and to the authorities simultaneously.",
    icon: Globe,
  },
]

function sourceIcon(source: string, size = "h-4 w-4") {
  switch (source) {
    case "tab":
      return <Smartphone className={`${size} text-blue-500`} />
    case "mesh-node":
      return <Radio className={`${size} text-violet-500`} />
    case "oracle":
      return <ShieldCheck className={`${size} text-green-500`} />
    default:
      return <MapPin className={`${size} text-primary`} />
  }
}

function sourceLabel(packet: { source: string; nodeId?: string }) {
  switch (packet.source) {
    case "tab":
      return "Tab-to-tab (Browser channel)"
    case "mesh-node":
      return `Mesh node ${packet.nodeId ? `· ${packet.nodeId.slice(-6)}` : ""}`
    case "oracle":
      return "Oracle / authorities"
    default:
      return "This device"
  }
}

export function MeshLocationShare() {
  const { state, locate, share, joinFamilyCode } = useMeshLocation()
  const [recipient, setRecipient] = useState<Recipient>("both")
  const [note, setNote] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!state.familyCode) return
    try {
      await navigator.clipboard.writeText(state.familyCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Mesh Location Share
                <Badge variant="outline" className="gap-1 border-green-500/40 text-green-600">
                  <WifiOff className="h-3 w-3" /> works offline
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Share your live location device-to-device outside the internet.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <StatusChip
              label="Family tabs"
              value={state.familyTabs.length}
              ok={state.familyTabs.length > 0}
              icon={<Smartphone className="h-3 w-3" />}
            />
            <StatusChip label="Mesh node" value={state.meshOnline ? 1 : 0} ok={state.meshOnline} icon={<Radio className="h-3 w-3" />} />
            <StatusChip label="Oracle" value={state.oracleOnline ? 1 : 0} ok={state.oracleOnline} icon={<Globe className="h-3 w-3" />} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Family pairing */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl border bg-muted/20 p-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Connect friends &amp; family</p>
              <p className="text-xs text-muted-foreground">
                Same invite code on both devices pairs them — no internet needed.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.familyCode && (
              <button
                type="button"
                onClick={copyCode}
                title="Copy invite code"
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm hover:bg-muted/60"
              >
                <span className="text-primary">{state.familyCode}</span>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter friend's code"
                className="h-8 w-40"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={!joinCode.trim()}
                onClick={() => {
                  joinFamilyCode(joinCode)
                  setJoinCode("")
                }}
              >
                Join
              </Button>
            </div>
            {state.familyTabs.length > 0 && (
              <Badge variant="default" className="gap-1">
                <Users className="h-3 w-3" /> {state.familyTabs.length} device(s) online
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> My current location
              </h4>
              <Button size="sm" variant="outline" onClick={locate} disabled={state.locating}>
                {state.locating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                {state.lat === null ? "Get location" : "Update"}
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
              {state.lat === null || state.lng === null ? (
                <p className="text-sm text-muted-foreground">
                  No position yet. Allow location access — or press{" "}
                  <strong className="text-foreground">Get location</strong> to simulate one for the demo.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{state.label}</div>
                    {state.simulated && <Badge variant="secondary">simulated</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block">Latitude</span>
                      <span className="font-mono text-foreground">{state.lat.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="block">Longitude</span>
                      <span className="font-mono text-foreground">{state.lng.toFixed(6)}</span>
                    </div>
                    {state.accuracy > 0 && (
                      <div className="col-span-2">
                        <span className="block">Accuracy</span>
                        <span className="font-mono text-foreground">±{state.accuracy.toFixed(0)} m</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Demo tip:</strong> open this dashboard in a{" "}
              <strong className="text-foreground">second browser tab</strong> = a second device. Ask for a
              location on that tab too, share from one, and watch the packet appear in the other — even with WiFi switched off.
            </p>
          </div>

          {/* Recipient + share */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Where should this location go?</h4>
            <div className="space-y-2">
              {RECIPIENT_OPTIONS.map((opt) => {
                const active = recipient === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecipient(opt.value)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <opt.icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{opt.label}</span>
                      {active && <Badge className="ml-auto">selected</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                  </button>
                )
              })}
            </div>

            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note, e.g. 'I'm safe — heading to the shelter'"
              disabled={state.lat === null}
            />

            <Button
              className="w-full"
              disabled={state.lat === null || state.sending}
              onClick={async () => {
                await share(recipient, note)
                setNote("")
              }}
            >
              {state.sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Share live location · {RECIPIENT_OPTIONS.find((o) => o.value === recipient)?.label}
            </Button>

            {state.lastResult && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{state.lastResult}</p>
            )}
          </div>
        </div>

        {/* Transmission log */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-primary" /> Live transmission log
            </h4>
            <Badge variant="outline">{state.packets.length} packet(s)</Badge>
          </div>

          {state.packets.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No location packets yet. Share your location above — packets sync instantly to other tabs and mesh nodes{" "}
              <strong className="text-foreground">with the internet off</strong>.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {state.packets.map((packet) => (
                <div key={packet.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className="mt-0.5 flex-shrink-0">{sourceIcon(packet.source)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">{packet.label}</span>
                      <Badge variant={packet.recipients === "both" ? "default" : "outline"}>
                        {packet.recipients === "family" ? "family" : packet.recipients === "authorities" ? "authorities" : "both"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sourceLabel(packet)} · {packet.deviceName} · {new Date(packet.timestamp).toLocaleTimeString()}
                    </p>
                    {packet.note && <p className="text-xs mt-1 text-foreground/80">“{packet.note}”</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted-foreground">{packet.lat.toFixed(4)}, {packet.lng.toFixed(4)}</p>
                    <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[110px]">{packet.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusChip({
  label,
  value,
  ok,
  icon,
}: {
  label: string
  value: number
  ok: boolean
  icon: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${ok ? "border-green-500/40 text-green-600" : "border-border text-muted-foreground"}`}>
      {icon}
      <span>
        {label} <strong>{value}</strong>
      </span>
    </div>
  )
}