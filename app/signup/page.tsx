"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Heart, Users, Building2, Radio } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { dashboardForRole } from "@/services/auth"

const ROLE_OPTIONS = [
  {
    value: "civilian",
    roleForSubmit: "civilian",
    icon: Users,
    color: "text-blue-600",
    label: "नागरिक / Civilian",
    description: "आपातकालीन तैयारी चाहने वाला व्यक्ति / Individual seeking disaster preparedness",
  },
  {
    value: "donor",
    roleForSubmit: "donor",
    icon: Heart,
    color: "text-red-600",
    label: "दानदाता / Donor",
    description: "आपदा राहत प्रयासों का समर्थन / Supporting disaster relief efforts",
  },
  {
    value: "authority",
    roleForSubmit: "ngo",
    icon: Shield,
    color: "text-green-600",
    label: "प्राधिकरण / Authority (NDMA · NGO)",
    description: "आपदा प्रतिक्रिया संचालन का प्रबंधन / Managing disaster response operations",
  },
]

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh",
]

function SignUpForm() {
  const searchParams = useSearchParams()
  const initialRole = searchParams.get("role")
  const defaultRole: "civilian" | "donor" | "authority" =
    initialRole === "authority" ? "authority" : initialRole === "donor" ? "donor" : "civilian"

  const [role, setRole] = useState<"civilian" | "donor" | "authority">(defaultRole)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    organization: "",
    phone: "",
    state: "",
    district: "",
    pincode: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register } = useAuth()
  const router = useRouter()

  const selected = ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("पासवर्ड मेल नहीं खाते / Passwords don't match")
      return
    }
    if (formData.password.length < 6) {
      setError("पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters")
      return
    }
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      setError("कृपया वैध भारतीय मोबाइल नंबर दर्ज करें / Please enter a valid Indian mobile number")
      return
    }
    if (role === "authority" && !formData.organization.trim()) {
      setError("कृपया संगठन का नाम दर्ज करें / Please enter your organization name")
      return
    }

    setIsLoading(true)
    try {
      const user = await register({
        role: selected.roleForSubmit,
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        organization: formData.organization,
        state: formData.state,
        district: formData.district,
        pincode: formData.pincode,
      })
      router.replace(dashboardForRole(user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
      setIsLoading(false)
    }
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
      <Card className="w-full max-w-lg shadow-none border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-secondary">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <p className="kicker">Create account</p>
          <CardTitle className="display mt-3 text-2xl tracking-tight">रेसिलियो में शामिल हों</CardTitle>
          <CardDescription className="text-base font-medium text-muted-foreground">Join Resilio</CardDescription>
          <p className="text-sm text-muted-foreground">आपदा प्रबंधन के लिए अपनी भूमिका चुनें</p>
          <p className="text-xs text-muted-foreground">Choose your role for disaster management</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label className="text-base font-medium">मैं हूँ / I am a:</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as typeof role)}>
                {ROLE_OPTIONS.map((option, i) => {
                  const Icon = option.icon
                  const baseColor =
                    i === 0 ? "hover:bg-blue-50" : i === 1 ? "hover:bg-red-50" : "hover:bg-green-50"
                  return (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 ${baseColor} transition-colors`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Icon className={`h-5 w-5 ${option.color}`} />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="font-medium text-foreground">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">पूरा नाम / Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="आपका पूरा नाम"
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">मोबाइल नंबर / Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="10 अंकों का नंबर"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {role === "authority" && (
              <div>
                <Label htmlFor="organization">संगठन का नाम / Organization Name *</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="आपके संगठन का नाम"
                  value={formData.organization}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">राज्य / State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, state: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="राज्य चुनें" />
                  </SelectTrigger>
                  <SelectContent>
                    {indianStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="district">जिला / District</Label>
                <Input
                  id="district"
                  type="text"
                  placeholder="आपका जिला"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pincode">पिनकोड / PIN Code</Label>
                <Input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={formData.pincode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div />
            </div>

            <div>
              <Label htmlFor="email">ईमेल / Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="आपका ईमेल पता"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">पासवर्ड / Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="मजबूत पासवर्ड बनाएं"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">पासवर्ड पुष्टि / Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="पासवर्ड दोबारा दर्ज करें"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "खाता बनाया जा रहा है..." : "खाता बनाएं / Create Account"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">पहले से खाता है? / Already have an account? </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                साइन इन करें / Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}