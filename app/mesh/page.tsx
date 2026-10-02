"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Radio,
  Users,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  MessageSquare,
  Download,
  Navigation as NavIcon,
  Smartphone,
  Loader2,
  WifiOff,
  QrCode,
} from "lucide-react"
import QRCode from "qrcode"
import { MeshLocationShare } from "@/components/mesh-location-share"
import { useMeshHealth } from "@/components/connectivity-provider"
import { useMeshLocation } from "@/lib/use-mesh-location"

import { DEFAULT_MESH_NODES } from "@/lib/config"

interface MeshNodeInfo {
  url: string
  ok: boolean
  nodeId?: string
  peerCount?: number
  role?: string
}

const MESH_NODES = [
  { url: "http://127.0.0.1:8101", label: "My device (node A)", port: 8101 },
  { url: "http://127.0.0.1:8102", label: "Friend's device (node B)", port: 8102 },
]

export default function MeshHub() {
  const { connected, availabilityPercent, peers } = useMeshHealth()
  const { state, locate, share, joinFamilyCode } = useMeshLocation()
  const [nodes, setNodes] = useState<MeshNodeInfo[]>([])
  const [primary, setPrimary] = useState<{ nodeId: string; role: string } | null>(null)
  const [customNode, setCustomNode] = useState("")
  const [extraNodes, setExtraNodes] = useState<MeshNodeInfo[]>([])
  const [sendingSos, setSendingSos] = useState(false)
  const [sosResult, setSosResult] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !state.familyCode) return
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    if (code && code.trim().toUpperCase() !== state.familyCode) {
      joinFamilyCode(code.trim())
    }
  }, [state.familyCode, joinFamilyCode])

  const toggleQr = async () => {
    if (qrUrl) {
      setShowQr((prev) => !prev)
      return
    }
    if (!state.familyCode || typeof window === "undefined") return
    const target = `${window.location.origin}/mesh?code=${encodeURIComponent(state.familyCode)}`
    try {
      const dataUrl = await QRCode.toDataURL(target, { width: 220, margin: 1 })
      setQrUrl(dataUrl)
      setShowQr(true)
    } catch {
      setShowQr(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const info = await Promise.all(
        DEFAULT_MESH_NODES.map(async (node) => {
          try {
            const res = await fetch(`${node.url}/health`)
            const body = await res.json()
            return {
              url: node.label,
              ok: true,
              nodeId: String(body.nodeId ?? "").slice(-8),
              peerCount: Array.isArray(body.peers) ? body.peers.length : 0,
              role: String(body.role ?? ""),
            }
          } catch {
            return { url: node.label, ok: false }
          }
        }),
      )
      const extra = await Promise.all(
        extraNodes.map(async (node) => {
          try {
            const res = await fetch(`${node.url}/health`)
            const body = await res.json()
            return {
              url: node.url,
              ok: true,
              nodeId: String(body.nodeId ?? "").slice(-8),
              peerCount: Array.isArray(body.peers) ? body.peers.length : 0,
              role: String(body.role ?? ""),
            }
          } catch {
            return { url: node.url, ok: false }
          }
        }),
      )
      if (!cancelled) {
        setNodes(info)
        setExtraNodes(extra as MeshNodeInfo[])
        const self = [...info, ...(extra as MeshNodeInfo[])].find((n) => n.ok)
        if (self?.nodeId) setPrimary({ nodeId: self.nodeId, role: self.role ?? "node" })
      }
    }
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [extraNodes.length])

  const addCustomNode = () => {
    const url = customNode.trim()
    if (!url) return
    setExtraNodes((prev) => [...prev, { url, ok: false }])
    setCustomNode("")
  }

  const quickLinks = [
    { href: "/emergency-sos", label: "Emergency SOS", icon: AlertTriangle, urgent: true },
    { href: "/ai-survival-assistant", label: "AI Assistant", icon: MessageSquare, urgent: false },
    { href: "/offline-maps", label: "Offline Maps", icon: Download, urgent: false },
    { href: "/safe-route-finder", label: "Safe Route", icon: NavIcon, urgent: false },
    { href: "/citizen-report", label: "Report Incident", icon: MapPin, urgent: false },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="kicker">01 — Offline by design</p>
              <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight flex items-center gap-3">
                <Radio className="h-6 w-6 text-primary" /> Mesh &amp; Family Hub
              </h1>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Device-to-device communication that works when the internet doesn't.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={connected ? "default" : "outline"}
                className={connected ? "gap-1" : "gap-1 text-muted-foreground"}
              >
                <WifiOff className="h-3 w-3" />{" "}
                {connected
                  ? primary
                    ? `My device · node-${primary.nodeId}`
                    : "Connected"
                  : "My device offline"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" /> {peers.filter((p) => p.connected).length} peer device(s)
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Radio className="h-3 w-3" />
                {availabilityPercent != null ? `${availabilityPercent.toFixed(1)}% availability` : "—"}
              </Badge>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={link.urgent ? "default" : "outline"}
                  className="h-20 w-full flex-col gap-2 p-4"
                >
                  <link.icon className={`h-5 w-5 ${link.urgent ? "" : "text-primary"}`} />
                  <span className="text-xs font-medium">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>

          {/* Location share */}
          <MeshLocationShare />

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Devices on the mesh */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Devices on the mesh
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Every device below is a real Resilio mesh node exchanging signed packets over a TCP link —
                  no internet required.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...nodes, ...extraNodes].map((node, i) => {
                  const isSelf = Boolean(primary && node.ok && node.nodeId === primary.nodeId)
                  return (
                    <div key={`${node.url}-${i}`} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div
                        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          node.ok ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">{node.url}</span>
                          {node.nodeId && (
                            <Badge variant="outline" className="font-mono text-xs">
                              node-{node.nodeId}
                            </Badge>
                          )}
                          <Badge variant={isSelf ? "default" : "secondary"}>
                            {isSelf ? "This device" : "Peer device"}
                          </Badge>
                          {node.role && <Badge variant="outline">{node.role}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {node.ok
                            ? `${node.peerCount ?? 0} peer link(s) on the mesh link`
                            : "unreachable right now — is the node process running?"}
                        </p>
                      </div>
                      <Badge variant={node.ok ? "default" : "destructive"}>
                        {node.ok ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  )
                })}

                <div className="flex gap-2 pt-1">
                  <Input
                    value={customNode}
                    onChange={(e) => setCustomNode(e.target.value)}
                    placeholder="Add another device: http://127.0.0.1:PORT"
                    className="h-9"
                  />
                  <Button size="sm" className="h-9" onClick={addCustomNode} disabled={!customNode.trim()}>
                    Add
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Start a node with{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    API_PORT=8103 MESH_PORT=7103 SEEDS=127.0.0.1:7100 node …/mesh-node/src/cli.js
                  </code>{" "}
                  and it appears here automatically.
                </p>
              </CardContent>
            </Card>

            {/* Family & friends */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Family &amp; friends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Devices that join with the same invite code appear here and receive your location instantly —
                  even offline.
                </p>

                <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your invite code</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={toggleQr}>
                        <QrCode className="h-3.5 w-3.5" />
                        {showQr ? "Hide QR" : "Pair by QR"}
                      </Button>
                      <Badge variant="default" className="font-mono">
                        {state.familyCode || "RES-····"}
                      </Badge>
                    </div>
                  </div>
                  {showQr && qrUrl && (
                    <div className="flex flex-col items-center gap-2 pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="Pair code QR" className="rounded-lg border bg-white p-2 w-36 h-36" />
                      <p className="text-xs text-muted-foreground text-center">
                        Scan with a phone on the same network — it opens this page with your code pre-filled.
                      </p>
                    </div>
                  )}
                  {state.familyTabs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {state.familyTabs.map((name) => (
                        <Badge key={name} variant="secondary" className="gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Open this page in a second browser tab = a second device. Have your friend enter the same code
                      above and both appear here as online.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Share with everyone right now</h4>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled={sendingSos}
                    onClick={async () => {
                      setSendingSos(true)
                      setSosResult(null)
                      await locate()
                      const ok = await share("both", "SOS: please check on me")
                      setSosResult(
                        ok
                          ? "Location broadcast to family tabs, mesh nodes and authorities."
                          : "Could not send — use the share widget above.",
                      )
                      setSendingSos(false)
                    }}
                  >
                    {sendingSos ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />}
                    Send location to my circle
                  </Button>
                  {sosResult && <p className="text-xs text-muted-foreground">{sosResult}</p>}
                  <p className="text-xs text-muted-foreground">
                    Tip: pick <strong>Family members</strong> or <strong>Both</strong> in the share widget above to
                    ping their devices directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}