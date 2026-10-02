"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useMeshHealth } from "@/components/connectivity-provider"

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { href: "/", label: "Home" },
      { href: "/mesh", label: "Mesh hub" },
      { href: "/ai-demo", label: "AI demo" },
      { href: "/real-time-alerts", label: "Real-time alerts" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Act",
    links: [
      { href: "/citizen-report", label: "Report an incident" },
      { href: "/emergency-sos", label: "Emergency SOS" },
      { href: "/donate", label: "Donate & help" },
      { href: "/disaster-preparedness", label: "Preparedness" },
      { href: "/recovery-resources", label: "Recovery" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/safe-route-finder", label: "Safe route finder" },
      { href: "/offline-maps", label: "Offline maps" },
      { href: "/community", label: "Community" },
      { href: "/donor-dashboard", label: "Donor dashboard" },
      { href: "/ngo-dashboard", label: "NGO dashboard" },
    ],
  },
]

export function Footer() {
  const { connected, nodeId, incidentCount } = useMeshHealth()
  return (
    <footer className="mt-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-b border-border pb-12">
          <div>
            <p className="kicker">Line is open</p>
            <p className="display mt-3 text-3xl md:text-4xl tracking-tight">
              Prepare. Connect. Recover.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm" className="rounded-full px-6">
              <Link href="/citizen-report">Report an incident</Link>
            </Button>
            <Button variant="outline" asChild size="sm" className="rounded-full px-6">
              <Link href="/donate">Donate</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 py-12">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="kicker mb-4">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="kicker mb-4">Network</p>
            <div className="space-y-3 text-sm">
              <p className={`flex items-center gap-2 ${connected ? "text-signal" : "text-muted-foreground"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-signal animate-pulse" : "bg-muted-foreground"}`} />
                {connected ? "Mesh connected" : "Mesh offline"}
              </p>
              {connected && nodeId ? <p className="font-mono text-xs text-muted-foreground">node /{nodeId.slice(-8)}</p> : null}
              <p className="font-mono text-xs text-muted-foreground">synced incidents /{incidentCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            © {new Date().getFullYear()} Resilio
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Made for the next disaster — not the last one
          </p>
        </div>
      </div>
    </footer>
  )
}