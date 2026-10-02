"use client"

import { useState, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileDropdown } from "@/components/profile-dropdown"
import {
  Heart,
  CreditCard,
  Wallet,
  Shield,
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { useResilioData } from "@/lib/use-resilio-data"
import { hazardLabel, severityTier } from "@/components/india-map"

const HAZARD_GRADIENTS: Record<string, string> = {
  flood: "from-sky-500 to-blue-700",
  fire: "from-orange-500 to-red-600",
  earthquake: "from-amber-500 to-yellow-700",
  cyclone: "from-teal-500 to-cyan-700",
  landslide: "from-stone-500 to-brown-700",
  tornado: "from-purple-500 to-indigo-700",
  storm: "from-blue-500 to-slate-700",
  gas_leak: "from-yellow-400 to-orange-600",
  medical: "from-emerald-500 to-green-700",
  power_outage: "from-slate-500 to-slate-800",
  chemical_spill: "from-lime-500 to-green-800",
  bridge_collapse: "from-red-500 to-rose-700",
  unknown: "from-gray-500 to-gray-800",
}

function gradientFor(hazard: string): string {
  return HAZARD_GRADIENTS[hazard] ?? HAZARD_GRADIENTS.unknown
}

function commitmentId(incidentId: string): string {
  const seed = `${incidentId}-${Date.now()}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0")
  return `0x${hex}${incidentId.replace(/[^a-f0-9]/gi, "").slice(0, 8).padEnd(8, "0")}`
}

interface FeaturedProject {
  id: string
  name: string
  description: string
  goal: number
  raised: number
  severity: number
  location: string
  hazard: string
  incidentId: string
  corroborations: number
  urgency: string
}

export default function DonatePage() {
  const { incidents, loading } = useResilioData(15000)
  const [selectedProject, setSelectedProject] = useState<FeaturedProject | null>(null)
  const [donationAmount, setDonationAmount] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    amount: number
    projectId: string
    projectName: string
    location: string
    txnId: string
    method: string
  } | null>(null)

  const quickAmounts = [500, 1000, 2500, 5000, 10000]

  const featuredProjects: FeaturedProject[] = useMemo(() => {
    const top = incidents
      .slice()
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3)
    return top.map((inc) => ({
      id: inc.incident_id,
      name: `${hazardLabel(inc.hazard_type)} Relief — ${inc.location}`,
      description: `Live incident ${inc.incident_id}, severity ${inc.severity}/10, ${inc.corroborations} corroborations waiting for funding`,
      goal: inc.severity * 250000,
      raised: inc.corroborations * 100000,
      severity: inc.severity,
      location: inc.location,
      hazard: inc.hazard_type,
      incidentId: inc.incident_id,
      corroborations: inc.corroborations,
      urgency: severityTier(inc.severity).label,
    }))
  }, [incidents])

  const activeProject = selectedProject ?? featuredProjects[0]

  const handleDonate = async () => {
    if (!activeProject) {
      alert("No live project selected. Wait for the oracle to update incidents.")
      return
    }
    if (!customAmount && !donationAmount) {
      alert("Please enter a donation amount")
      return
    }

    const amount = Number(customAmount || donationAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsProcessing(true)

    setTimeout(() => {
      const txnId = commitmentId(activeProject.incidentId)
      setConfirmation({
        amount,
        projectId: activeProject.incidentId,
        projectName: activeProject.name,
        location: activeProject.location,
        txnId,
        method: paymentMethod === "card" ? "Credit Card" : "Blockchain Wallet",
      })
      setIsProcessing(false)
      setDonationAmount("")
      setCustomAmount("")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/donor-dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">दान करें / Make a Donation</h1>
                <p className="text-muted-foreground">
                  Projects ranked by live incident severity from the Resilio oracle
                </p>
              </div>
            </div>
            <ProfileDropdown userRole="donor" userName="विक्रम सिंह / Vikram Singh" userEmail="vikram.singh@email.com" />
          </div>

          {confirmation && (
            <Card className="mb-8 border-green-500/50 bg-green-50/40 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  दान सफल! / Donation Confirmed
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="text-lg font-semibold">₹{confirmation.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Project</Label>
                  <p className="font-medium">{confirmation.projectName}</p>
                  <p className="text-sm text-muted-foreground">{confirmation.projectId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">On-chain Commitment</Label>
                  <p className="font-mono text-sm">{confirmation.txnId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{confirmation.method}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground">What happens next</Label>
                  <p className="text-sm">
                    The oracle&apos;s mesh will track the relief delivered to {confirmation.location}. Your commitment
                    is recorded on the Resilio chain for transparent delivery verification.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select a Project</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ranked by live incident severity from the Resilio oracle — highest risk first
                  </p>
                </CardHeader>
                <CardContent>
                  {loading && featuredProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Loading live incidents from the oracle…
                    </p>
                  ) : featuredProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No live incidents reported yet. Check back when the oracle detects a hazard.
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {featuredProjects.map((project) => {
                        const tier = severityTier(project.severity)
                        const progressPct = Math.min(100, Math.round((project.raised / project.goal) * 100))
                        return (
                          <div
                            key={project.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              activeProject?.id === project.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedProject(project)}
                          >
                            <div className="flex gap-4">
                              <div
                                className={`w-28 h-20 rounded-lg bg-gradient-to-br ${gradientFor(project.hazard)} flex items-center justify-center flex-shrink-0`}
                              >
                                <Activity className="h-8 w-8 text-white/90" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">{project.name}</h3>
                                  <Badge className={tier.text} variant="outline">
                                    {tier.label} {project.severity}/10
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>₹{(project.raised / 100000).toFixed(1)}L raised</span>
                                    <span>₹{(project.goal / 100000).toFixed(1)}L goal</span>
                                  </div>
                                  <Progress value={progressPct} />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{project.corroborations} corroborations</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {project.location}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {activeProject && (
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details: {activeProject.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div
                        className={`w-full h-40 rounded-lg bg-gradient-to-br ${gradientFor(activeProject.hazard)} flex items-center justify-center`}
                      >
                        <Activity className="h-12 w-12 text-white/90" />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Live Incident</h4>
                          <p className="text-sm text-muted-foreground">
                            {activeProject.description}. Funds are routed via the Resilio chain so every rupee is
                            tracked transparently to delivery.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Incident ID:</span>
                            <p className="font-mono text-xs">{activeProject.incidentId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Location:</span>
                            <p className="font-medium">{activeProject.location}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Severity:</span>
                            <p className="font-medium">{activeProject.severity}/10</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Corroborations:</span>
                            <p className="font-medium">{activeProject.corroborations}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Donation Amount
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Quick Select</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant={donationAmount === amount.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setDonationAmount(amount.toString())
                            setCustomAmount("")
                          }}
                        >
                          ₹{amount}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="custom-amount">Custom Amount</Label>
                    <Input
                      id="custom-amount"
                      type="number"
                      placeholder="Enter amount in ₹"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value)
                        setDonationAmount("")
                      }}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="card">Credit Card</TabsTrigger>
                        <TabsTrigger value="crypto">Blockchain</TabsTrigger>
                      </TabsList>

                      <TabsContent value="card" className="space-y-3">
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="font-medium">Credit/Debit Card</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Secure payment via Razorpay. All transactions are encrypted and protected.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="crypto" className="space-y-3">
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Wallet className="h-4 w-4" />
                            <span className="font-medium">Blockchain Wallet</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Transparent donations via blockchain. Track your on-chain commitment in real-time.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleDonate}
                    disabled={isProcessing || !activeProject || (!donationAmount && !customAmount)}
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-2" />
                        Donate ₹{customAmount || donationAmount}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Your donation is secure and tax-deductible under 80G</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Emergency meals:</span>
                      <span className="font-medium">
                        {Math.floor(Number(customAmount || donationAmount || 0) / 50)} meals
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Medical supplies:</span>
                      <span className="font-medium">
                        {Math.floor(Number(customAmount || donationAmount || 0) / 200)} kits
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shelter materials:</span>
                      <span className="font-medium">
                        {Math.floor(Number(customAmount || donationAmount || 0) / 1000)} families
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
