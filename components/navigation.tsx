"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Sun, Moon, Radio, LayoutDashboard } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useMeshHealth } from "@/components/connectivity-provider"
import { useAuth } from "@/components/auth-provider"
import { dashboardForRole } from "@/services/auth"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/disaster-preparedness", label: "Preparedness" },
  { href: "/real-time-alerts", label: "Alerts" },
  { href: "/mesh", label: "Mesh" },
  { href: "/ai-demo", label: "AI Demo" },
  { href: "/donate", label: "Donate" },
]

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { connected, availabilityPercent } = useMeshHealth()
  const { user } = useAuth()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMenuOpen])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 shrink-0 no-underline">
            <span className="grid place-items-center h-7 w-7 rounded-full border border-primary/40">
              <Radio className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="font-mono text-sm tracking-[0.35em] uppercase text-foreground leading-none">
              Resilio<span className="text-alert">®</span>
            </span>
          </Link>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-x-7 min-w-0">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-x-4 shrink-0 min-w-0">
            <div
              className={`flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase whitespace-nowrap ${
                connected ? "text-signal" : "text-muted-foreground"
              }`}
              title={connected ? `Mesh connected — ${availabilityPercent?.toFixed(1) ?? 0}% availability` : "Mesh offline"}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  connected ? "bg-signal" : "bg-muted-foreground"
                } ${connected ? "animate-pulse" : ""}`}
              />
              <span className="hidden xl:inline">{connected ? "Mesh live" : "Mesh offline"}</span>
            </div>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <Button asChild size="sm" className="shrink-0 rounded-full px-5">
              <Link href="/citizen-report">Report</Link>
            </Button>
            {mounted && user ? (
              <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full px-4">
                <Link href={dashboardForRole(user.role)}>
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full px-4">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-1 shrink-0">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen((v) => !v)} aria-label="Toggle menu">
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-background/95 backdrop-blur-md">
          <div className="px-6 py-6 space-y-1">
            <p className="kicker px-3 pb-2">Navigate</p>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-3 text-[13px] tracking-[0.22em] uppercase text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div
              className={`flex items-center gap-2 px-3 py-3 text-[11px] tracking-[0.18em] uppercase ${
                connected ? "text-signal" : "text-muted-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-signal animate-pulse" : "bg-muted-foreground"}`} />
              {connected ? `Mesh Live — ${availabilityPercent?.toFixed(1) ?? 0}%` : "Mesh Offline"}
            </div>
            <div className="flex flex-col gap-2 px-3 pt-2">
              <Button asChild size="sm" className="w-full rounded-full">
                <Link href="/citizen-report" onClick={() => setIsMenuOpen(false)}>
                  Report an incident
                </Link>
              </Button>
              {mounted && user ? (
                <Button asChild size="sm" className="w-full rounded-full">
                  <Link href={dashboardForRole(user.role)} onClick={() => setIsMenuOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild size="sm" className="w-full rounded-full">
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}