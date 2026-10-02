"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Heart, Users, Shield, Radio } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { dashboardForRole } from "@/services/auth"

const ROLE_TABS = [
  {
    value: "civilian",
    label: "नागरिक",
    latin: "Civilian",
    roleForSubmit: "civilian",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    title: "नागरिक लॉगिन",
    subtitle: "Civilian Login",
    description: "आपातकालीन तैयारी और सुरक्षा के लिए साइन इन करें",
    englishDesc: "Sign in for emergency preparedness and safety",
  },
  {
    value: "donor",
    label: "दानदाता",
    latin: "Donor",
    roleForSubmit: "donor",
    icon: Heart,
    color: "text-red-600",
    bgColor: "bg-red-50",
    title: "दानदाता लॉगिन",
    subtitle: "Donor Login",
    description: "आपदा राहत में योगदान के लिए साइन इन करें",
    englishDesc: "Sign in to contribute to disaster relief",
  },
  {
    value: "authority",
    label: "प्राधिकरण",
    latin: "Authority",
    roleForSubmit: "ngo",
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-50",
    title: "प्राधिकरण लॉगिन",
    subtitle: "Authority / NDMA & NGO Login",
    description: "आपदा प्रबंधन संचालन के लिए साइन इन करें",
    englishDesc: "Sign in to manage disaster response operations",
  },
]

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("civilian")
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, session } = useAuth()
  const router = useRouter()

  const currentRole = ROLE_TABS.find((r) => r.value === activeTab) ?? ROLE_TABS[0]
  const Icon = currentRole.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const user = await login(formData.email, formData.password)
      if (user.role !== currentRole.roleForSubmit) {
        // Role mismatch — signed in but with a different role than selected.
        // Still forward them to their own dashboard so the session isn't lost.
        router.replace(dashboardForRole(user.role))
        return
      }
      router.replace(dashboardForRole(currentRole.roleForSubmit))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.")
      setIsLoading(false)
    }
  }

  if (session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <p className="kicker">Already signed in</p>
            <p className="text-muted-foreground">
              You are signed in as <strong className="text-foreground">{session.user.name}</strong>.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link href={dashboardForRole(session.user.role)}>Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-3 mb-8">
        <span className="grid place-items-center h-7 w-7 rounded-full border border-primary/40">
          <Radio className="h-3.5 w-3.5 text-primary" />
        </span>
        <span className="font-mono text-sm tracking-[0.35em] uppercase text-foreground leading-none">
          Resilio<span className="text-alert">®</span>
        </span>
      </Link>
      <Card className="w-full max-w-md shadow-none border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${currentRole.bgColor}`}>
              <Icon className={`h-8 w-8 ${currentRole.color}`} />
            </div>
          </div>
          <p className="kicker">Sign in</p>
          <CardTitle className="display mt-3 text-2xl tracking-tight">{currentRole.title}</CardTitle>
          <CardDescription className="text-base font-medium text-muted-foreground">{currentRole.subtitle}</CardDescription>
          <p className="text-sm text-muted-foreground mt-1">{currentRole.description}</p>
          <p className="text-xs text-muted-foreground">{currentRole.englishDesc}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              {ROLE_TABS.map((role) => (
                <TabsTrigger key={role.value} value={role.value} className="text-xs sm:text-sm">
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">ईमेल / Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="आपका ईमेल दर्ज करें"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">पासवर्ड / Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="आपका पासवर्ड दर्ज करें"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "साइन इन हो रहा है..." : "साइन इन करें / Sign In"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">खाता नहीं है? / Don't have an account? </span>
              <Link href={`/signup?role=${currentRole.value}`} className="text-primary hover:underline font-medium">
                साइन अप करें / Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}