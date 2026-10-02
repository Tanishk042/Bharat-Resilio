"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Heart,
  DollarSign,
  Users,
  Shield,
  Truck,
  Home,
  Utensils,
  Shirt,
  Gift,
  CreditCard,
  Building,
  Star,
  TrendingUp,
  CheckCircle,
  Globe,
} from "lucide-react"
import { useState } from "react"

export default function Donate() {
  const [donationType, setDonationType] = useState("money")
  const [donationAmount, setDonationAmount] = useState("2000")
  const [customAmount, setCustomAmount] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedCause, setSelectedCause] = useState("general")

  const donationAmounts = [
    { value: "2000", label: "₹2,000", description: "Provides emergency supplies for 1 person" },
    { value: "4000", label: "₹4,000", description: "Feeds a family of 4 for 3 days" },
    { value: "8000", label: "₹8,000", description: "Emergency shelter for 1 night" },
    { value: "20000", label: "₹20,000", description: "Medical supplies for 10 people" },
    { value: "custom", label: "Custom", description: "Enter your own amount" },
  ]

  const causes = [
    {
      id: "general",
      name: "General Disaster Relief",
      description: "Support overall disaster response efforts",
      icon: Shield,
      raised: 10000000, // ₹1 crore
      goal: 16000000, // ₹1.6 crores
      donors: 1250,
    },
    {
      id: "housing",
      name: "Emergency Housing",
      description: "Provide temporary shelter for displaced families",
      icon: Home,
      raised: 6800000, // ₹68 lakhs
      goal: 12000000, // ₹1.2 crores
      donors: 890,
    },
    {
      id: "food",
      name: "Food & Water",
      description: "Deliver essential nutrition to survivors",
      icon: Utensils,
      raised: 7600000, // ₹76 lakhs
      goal: 9600000, // ₹96 lakhs
      donors: 1100,
    },
    {
      id: "medical",
      name: "Medical Aid",
      description: "Emergency medical care and supplies",
      icon: Heart,
      raised: 5200000, // ₹52 lakhs
      goal: 8000000, // ₹80 lakhs
      donors: 650,
    },
  ]

  const impactStats = [
    { icon: Users, value: "50,000+", label: "People Helped" },
    { icon: Home, value: "2,500", label: "Families Housed" },
    { icon: Utensils, value: "100,000", label: "Meals Provided" },
    { icon: Heart, value: "15,000", label: "Medical Treatments" },
  ]

  const recentDonations = [
    { name: "Anonymous", amount: 40000, time: "2 minutes ago", cause: "General Relief" },
    { name: "Priya M.", amount: 8000, time: "5 minutes ago", cause: "Emergency Housing" },
    { name: "Tech Corp", amount: 200000, time: "10 minutes ago", cause: "Medical Aid" },
    { name: "Rajesh D.", amount: 6000, time: "15 minutes ago", cause: "Food & Water" },
  ]

  const selectedCauseData = causes.find((cause) => cause.id === selectedCause)
  const progressPercentage = selectedCauseData ? (selectedCauseData.raised / selectedCauseData.goal) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Heart className="h-12 w-12 text-red-500 mr-4" />
              <p className="kicker">01 — Aid</p>
              <h1 className="display mt-3 text-4xl md:text-5xl tracking-tight">Make a Difference</h1>
            </div>
            <p className="mt-3 text-xl text-muted-foreground max-w-3xl mx-auto">
              Your donation helps provide immediate relief and long-term recovery support to communities affected by
              disasters.
            </p>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {impactStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <Icon className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Donation Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="h-6 w-6 text-primary mr-2" />
                    Make Your Donation
                  </CardTitle>
                  <CardDescription>Choose how you'd like to help disaster survivors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Donation Type */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">Donation Type</Label>
                    <RadioGroup value={donationType} onValueChange={setDonationType} className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value="money" id="money" />
                        <Label htmlFor="money" className="flex items-center cursor-pointer">
                          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                          Monetary Donation
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value="supplies" id="supplies" />
                        <Label htmlFor="supplies" className="flex items-center cursor-pointer">
                          <Truck className="h-5 w-5 text-blue-600 mr-2" />
                          Supply Donation
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {donationType === "money" && (
                    <>
                      {/* Cause Selection */}
                      <div>
                        <Label className="text-base font-medium mb-3 block">Choose a Cause</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {causes.map((cause) => {
                            const Icon = cause.icon
                            return (
                              <div
                                key={cause.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                  selectedCause === cause.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setSelectedCause(cause.id)}
                              >
                                <div className="flex items-start space-x-3">
                                  <Icon className="h-5 w-5 text-primary mt-1" />
                                  <div className="flex-1">
                                    <h3 className="font-medium">{cause.name}</h3>
                                    <p className="text-sm text-muted-foreground">{cause.description}</p>
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>₹{(cause.raised / 100000).toFixed(1)}L raised</span>
                                        <span>₹{(cause.goal / 100000).toFixed(1)}L goal</span>
                                      </div>
                                      <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                          className="bg-primary h-2 rounded-full"
                                          style={{ width: `${(cause.raised / cause.goal) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Amount Selection */}
                      <div>
                        <Label className="text-base font-medium mb-3 block">Donation Amount</Label>
                        <RadioGroup
                          value={donationAmount}
                          onValueChange={setDonationAmount}
                          className="grid grid-cols-2 md:grid-cols-3 gap-4"
                        >
                          {donationAmounts.map((amount) => (
                            <div key={amount.value} className="flex items-center space-x-2 border rounded-lg p-4">
                              <RadioGroupItem value={amount.value} id={amount.value} />
                              <Label htmlFor={amount.value} className="cursor-pointer flex-1">
                                <div className="font-medium">{amount.label}</div>
                                <div className="text-xs text-muted-foreground">{amount.description}</div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>

                        {donationAmount === "custom" && (
                          <div className="mt-4">
                            <Label htmlFor="custom-amount">Custom Amount</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                ₹
                              </span>
                              <Input
                                id="custom-amount"
                                type="number"
                                placeholder="Enter amount"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recurring Donation */}
                      <div className="flex items-center space-x-2">
                        <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(checked) => setIsRecurring(!!checked)} />
                        <Label htmlFor="recurring" className="text-sm">
                          Make this a monthly recurring donation
                        </Label>
                      </div>

                      {/* Donation Button */}
                      <Button size="lg" className="w-full">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Donate ₹{donationAmount === "custom" ? customAmount || "0" : donationAmount}
                        {isRecurring ? " Monthly" : " Now"}
                      </Button>
                    </>
                  )}

                  {donationType === "supplies" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                          <Utensils className="h-8 w-8 text-primary mx-auto mb-2" />
                          <h3 className="font-medium">Food Items</h3>
                          <p className="text-xs text-muted-foreground">Non-perishable foods</p>
                        </Card>
                        <Card className="p-4 text-center">
                          <Shirt className="h-8 w-8 text-primary mx-auto mb-2" />
                          <h3 className="font-medium">Clothing</h3>
                          <p className="text-xs text-muted-foreground">Clean, gently used</p>
                        </Card>
                        <Card className="p-4 text-center">
                          <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                          <h3 className="font-medium">Medical</h3>
                          <p className="text-xs text-muted-foreground">First aid supplies</p>
                        </Card>
                        <Card className="p-4 text-center">
                          <Home className="h-8 w-8 text-primary mx-auto mb-2" />
                          <h3 className="font-medium">Household</h3>
                          <p className="text-xs text-muted-foreground">Basic necessities</p>
                        </Card>
                      </div>
                      <Button size="lg" className="w-full">
                        <Truck className="h-5 w-5 mr-2" />
                        Schedule Supply Pickup
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Campaign */}
              {selectedCauseData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                      Campaign Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">₹{(selectedCauseData.raised / 100000).toFixed(1)}L</span>
                          <span className="text-muted-foreground">
                            ₹{(selectedCauseData.goal / 100000).toFixed(1)}L
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{Math.round(progressPercentage)}% funded</span>
                          <span>{selectedCauseData.donors} donors</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Donations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    Recent Donations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentDonations.map((donation, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{donation.name}</div>
                          <div className="text-xs text-muted-foreground">{donation.cause}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">₹{donation.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{donation.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Shield className="h-5 w-5 text-green-600 mr-2" />
                    Your Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>100% of donations go to relief efforts</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Globe className="h-4 w-4 text-blue-600 mr-2" />
                    <span>Transparent blockchain tracking</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 text-yellow-600 mr-2" />
                    <span>4.9/5 donor satisfaction rating</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 text-purple-600 mr-2" />
                    <span>Registered 501(c)(3) nonprofit</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
