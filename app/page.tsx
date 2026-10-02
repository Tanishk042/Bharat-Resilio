"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/section"
import { useResilioData } from "@/lib/use-resilio-data"
import { useMeshHealth } from "@/components/connectivity-provider"
import { getChainState } from "@/services/api"
import { ML_BASE } from "@/lib/config"
import { ArrowRight, ArrowUpRight } from "lucide-react"

const ISSUE_ROWS = [
  { title: "Alerts reach the phone — not the person", body: "Broadcast warnings stop at a notification. Nobody knows if their family is safe, or what to do next." },
  { title: "The internet goes silent first", body: "When a disaster hits, towers fall before the responders arrive. The people who need help lose the network in the same minute." },
  { title: "Reports are scattered and untrusted", body: "Panic messages, rumours and official feeds never reconcile. Trust collapses just when decisive action matters." },
  { title: "Aid is opaque and slow", body: "Donated money takes weeks, tracked in spreadsheets nobody can verify. Recovery is measured in months after a crisis measured in hours." },
  { title: "Preparedness never reaches the household", body: "Guidance exists in PDFs and portals. It never meets the person sanding their doorway at 2am wishing someone had told them sooner." },
]

const VALUE_ROWS = [
  { num: "01", title: "Predict before the ground shakes", body: "From-scratch models rate seismic, hydrological and atmospheric telemetry into a hazard, a severity and a tier — not a probability bar.", href: "/ai-demo" },
  { num: "02", title: "Route people around the danger", body: "A GNN on the real road graph re-plans safe evacuation paths in seconds, zone by zone, as the hazard changes.", href: "/safe-route-finder" },
  { num: "03", title: "Broadcast without a network", body: "Device-to-device mesh with CRDT state keeps families, neighbours and responders exchanging verified updates offline.", href: "/mesh" },
  { num: "04", title: "Verify every report on-chain", body: "Each incident is corroborated by independent witnesses, then anchored on a proof-of-authority ledger with an immutable trail.", href: "/real-time-alerts" },
  { num: "05", title: "Track every rupee of aid", body: "From donation to delivery, the blockchain records the path — so donors see exactly what their money became.", href: "/donate" },
]

const PROCESS_STEPS = [
  { step: "01", title: "Sense", body: "Sensors, acoustic models and citizen reports feed the hazard engine in real time." },
  { step: "02", title: "Parse", body: "DeX-LLM turns raw reports into structured incidents with location, hazard and severity." },
  { step: "03", title: "Verify", body: "Corroboration across witnesses + the oracle consensus confirms what is true." },
  { step: "04", title: "Warn", body: "Verified alerts propagate over mesh in the lift, and over the chain for the record." },
  { step: "05", title: "Recover", body: "Donors, NGOs and communities mobilise on data they can actually trust." },
]

const TOOLS = [
  { href: "/ai-demo", num: "01", name: "AI prediction demo", desc: "Walk a live report through parse, predict and route." },
  { href: "/real-time-alerts", num: "02", name: "Real-time alerts", desc: "Verified incidents on the national map, live." },
  { href: "/mesh", num: "03", name: "Mesh hub", desc: "P2P broadcasting with family codes and QR pairing." },
  { href: "/safe-route-finder", num: "04", name: "Safe route finder", desc: "GNN-planned evacuation paths." },
  { href: "/offline-maps", num: "05", name: "Offline maps", desc: "Navigate the district with no signal." },
  { href: "/citizen-report", num: "06", name: "Citizen report", desc: "Submit and corroborate incidents." },
  { href: "/emergency-sos", num: "07", name: "Emergency SOS", desc: "One-tap distress over mesh + SMS." },
  { href: "/disaster-preparedness", num: "08", name: "Preparedness kits", desc: "Role-specific survival guidance." },
  { href: "/donate", num: "09", name: "Donate & trace", desc: "On-chain aid distribution." },
  { href: "/community", num: "10", name: "Community", desc: "Local resilience, neighbourhood-sized." },
]

const FAQ = [
  { q: "What happens when the internet goes down?", a: "The mesh takes over. Phones form a device-to-device network with CRDT-synchronised state, and a family code or QR pairs the household. Location beacons, SOS and incident exchange keep working with zero infrastructure." },
  { q: "How does the AI prediction actually work?", a: "Every model is trained and served from scratch — a multi-task hazard network, a GNN evacuation router, an acoustic classifier and DeX-LLM. Each endpoint degrades to a deterministic fallback so the system never blanks during a cold start." },
  { q: "Are the alerts trustworthy?", a: "An incident is only broadcast after corroboration from independent reporters, weighed by the oracle consensus. The result is anchored on a proof-of-authority chain; the source data is shown to you on every alert." },
  { q: "Where does donated money go?", a: "Donations are recorded as transactions on the Resilio ledger and traced through dispatch. The donor dashboard shows the path, transfer by transfer — nobody can rewrite the trail." },
  { q: "Can this run on my own hardware?", a: "Yes. The whole platform packages as Docker Compose — frontend, ML service, oracle, two mesh nodes and the chain — with env-configured service URLs and health-checked brings-up." },
]

const blueprints = [
  "01 — REPORT",
  "02 — PARSE",
  "03 — MESH",
  "04 — ORACLE",
  "05 — CHAIN",
  "06 — ALERT",
  "07 — RECOVER",
]

function StatLine({ label, value, tone }: { label: string; value: string | number; tone?: "signal" | "alert" }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border last:border-0 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tone === "signal" ? "text-signal" : tone === "alert" ? "text-alert" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

export default function HomePage() {
  const { incidents, stats, loading } = useResilioData()
  const { connected, availabilityPercent, incidentCount } = useMeshHealth()
  const [chainInfo, setChainInfo] = useState<{ blocks: number; tipHash: string } | null>(null)
  const [mlOnline, setMlOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const chain = await getChainState()
        if (!cancelled && chain) {
          setChainInfo({
            blocks: Array.isArray(chain.blocks) ? chain.blocks.length : Number(chain.height ?? 0),
            tipHash: String(chain.tipHash ?? chain.tip_hash ?? ""),
          })
        }
      } catch {
        if (!cancelled) setChainInfo(null)
      }
      try {
        const ml = await fetch(`${ML_BASE}/health`).then((r) => r.json())
        if (!cancelled) setMlOnline(Boolean(ml && ml.status === "healthy"))
      } catch {
        if (!cancelled) setMlOnline(false)
      }
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const liveStats = useMemo(() => {
    const verified = Number(stats?.verified ?? 0)
    const total = Number(stats?.total_incidents ?? incidents.length)
    return { verified, total }
  }, [stats, incidents])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
            <div>
              <p className="kicker">01 — Issue / Disaster resilience platform, India</p>
              <h1 className="display mt-6 text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight">
                We don&apos;t just warn people. We keep them connected <span className="italic text-muted-foreground">through</span> the disaster.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Resilio is the end-to-end system for what happens after the ground shakes — AI that predicts, mesh that
                broadcasts without the internet, oracle-enabled trust, and a ledger that tracks every rupee of recovery.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link href="/citizen-report">Report a live incident <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                  <Link href="/ai-demo">Run the live demo</Link>
                </Button>
              </div>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Est. 2026 — Built for every city, tested when it counts
              </p>
            </div>

            {/* LIVE SYSTEM PANEL */}
            <div className="border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <p className="kicker">System blueprint / live</p>
                <p className={`font-mono text-[10px] uppercase tracking-[0.24em] ${loading ? "text-muted-foreground" : "text-signal"}`}>
                  {loading ? "connecting…" : "synced"}
                </p>
              </div>
              <div className="px-5 py-4 space-y-1">
                <StatLine label="Mesh network" value={connected ? `${availabilityPercent?.toFixed(0) ?? "—"}% up` : "offline"} tone={connected ? "signal" : "alert"} />
                <StatLine label="Incidents on mesh" value={incidentCount} />
                <StatLine label="Oracle verified" value={`${liveStats.verified} / ${liveStats.total}`} tone="signal" />
                <StatLine label="Chain blocks" value={chainInfo?.blocks ?? "—"} />
                <StatLine label="Chain tip" value={chainInfo?.tipHash ? `${chainInfo.tipHash.slice(0, 12)}…` : "—"} />
                <StatLine label="ML service" value={mlOnline === null ? "checking" : mlOnline ? "healthy" : "offline"} tone={mlOnline ? "signal" : "alert"} />
              </div>
              <div className="px-5 py-4 border-t border-border">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">The loop</p>
                <div className="flex flex-wrap gap-y-2 gap-x-3">
                  {blueprints.map((b, i) => (
                    <span key={b} className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-foreground">{b}</span>
                      {i < blueprints.length - 1 ? <span className="text-muted-foreground">/</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — APPROACH */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-x-12 gap-y-10">
            <div>
              <p className="kicker">02 — Approach</p>
              <h2 className="display mt-4 text-3xl md:text-4xl tracking-tight">
                Sense, connect, verify — one loop, not three tools.
              </h2>
            </div>
            {[
              { title: "Sense", body: "Custom models read telemetry, audio and citizen reports the moment they arrive — no vendor APIs, no black boxes." },
              { title: "Connect", body: "The mesh keeps people talking when towers don't. Family codes, offline maps and SOS travel device-to-device." },
              { title: "Verify", body: "Witness corroboration, oracle consensus and an on-chain ledger turn reports into a record no one can rewrite." },
            ].map((c) => (
              <div key={c.title} className="border-t border-border pt-5">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-foreground">{c.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — VALUE */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="kicker">03 — Value</p>
          <h2 className="display mt-4 text-3xl md:text-[2.75rem] tracking-tight max-w-3xl">
            Five things the platform does for a city that will flood, burn or shake tonight.
          </h2>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {VALUE_ROWS.map((row) => (
              <Link key={row.num} href={row.href} className="group grid gap-2 py-7 md:grid-cols-[72px_1fr_auto] md:items-baseline">
                <span className="font-mono text-xs text-muted-foreground">{row.num}</span>
                <div>
                  <h3 className="text-xl md:text-2xl tracking-tight group-hover:translate-x-1 transition-transform">{row.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{row.body}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform justify-self-start md:justify-self-end" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 04 — TOOLS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="kicker">04 — Platform</p>
          <h2 className="display mt-4 text-3xl md:text-[2.75rem] tracking-tight max-w-3xl">
            Every screen, one belief: the person closest to the disaster knows most.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="group bg-card p-7 hover:bg-muted transition-colors">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t.num}</p>
                <h3 className="display mt-4 text-xl tracking-tight group-hover:underline underline-offset-4">{t.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — PROCESS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-1">
              <p className="kicker">05 — Process</p>
              <h2 className="display mt-4 text-2xl md:text-3xl tracking-tight">Hours, arranged.</h2>
            </div>
            {PROCESS_STEPS.map((s) => (
              <div key={s.step} className="border-t border-border pt-5">
                <p className="font-mono text-xs text-muted-foreground">{s.step}</p>
                <h3 className="display mt-2 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 — PHILOSOPHY */}
      <section className="py-24 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker">06 — Philosophy</p>
          <p className="display mt-8 text-3xl md:text-[2.6rem] leading-tight tracking-tight">
            Resilience is not a feature. It is a system that connects the sensor, the neighbour, the responder and the donor — before the next disaster asks for it.
          </p>
          <p className="mt-8 font-mono text-xs text-muted-foreground">
            Sense ／ link ／ verify ／ warn ／ recover ／ repeat
          </p>
        </div>
      </section>

      {/* 07 — FAQ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="kicker">07 — FAQ</p>
          <h2 className="display mt-4 text-3xl md:text-4xl tracking-tight">Asked before the sirens.</h2>
          <div className="mt-10 divide-y divide-border border-y border-border">
            {FAQ.map((f, i) => (
              <details key={f.q} className="group py-6">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="text-lg tracking-tight pr-6">{f.q}</span>
                  <span className="font-mono text-sm text-muted-foreground group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-3xl">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 08 — CTA */}
      <section className="py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="kicker">08 — Line is open</p>
          <h2 className="display mt-4 text-3xl md:text-5xl tracking-tight">The next disaster won&apos;t announce itself.</h2>
          <p className="mt-5 text-lg text-muted-foreground">Patch your neighbourhood into the mesh, or follow a live report end-to-end right now.</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/mesh">Join the mesh</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/ai-demo">Follow a live report →</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}