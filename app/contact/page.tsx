"use client"

import type React from "react"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, MapPin, Clock, MessageSquare, Users, Shield, CheckCircle } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    subject: "",
    message: "",
    urgency: "",
  })

  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Contact form submitted:", formData)
    setIsSubmitted(true)
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="kicker">00 — Line is open</p>
            <h1 className="display mt-3 text-4xl md:text-5xl tracking-tight">Get in Touch</h1>
            <p className="mt-3 text-xl text-muted-foreground max-w-3xl mx-auto">
              Have questions about Resilio? Need support during an emergency? We're here to help 24/7.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Emergency Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">24/7 Emergency Hotline</p>
                      <p className="text-sm text-muted-foreground">+91 1800-RESILIO</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Emergency Email</p>
                      <p className="text-sm text-muted-foreground">emergency@resilio.in</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">&lt; 5 minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    General Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Support Line</p>
                      <p className="text-sm text-muted-foreground">+91 1800-SUPPORT</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">General Inquiries</p>
                      <p className="text-sm text-muted-foreground">hello@resilio.in</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Business Hours</p>
                      <p className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM IST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Office Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">Headquarters</p>
                    <p className="text-sm text-muted-foreground">
                      123 Disaster Prep Avenue
                      <br />
                      Mumbai, Maharashtra 400001
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">South India Office</p>
                    <p className="text-sm text-muted-foreground">
                      456 Resilience Boulevard
                      <br />
                      Bangalore, Karnataka 560001
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Send us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
                      <p className="text-muted-foreground">
                        Thank you for contacting us. We'll get back to you within 24 hours.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="Your full name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            placeholder="your.email@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="organization">Organization</Label>
                          <Input
                            id="organization"
                            value={formData.organization}
                            onChange={(e) => handleInputChange("organization", e.target.value)}
                            placeholder="Your organization (optional)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="urgency">Urgency Level</Label>
                          <Select onValueChange={(value) => handleInputChange("urgency", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select urgency level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low - General inquiry</SelectItem>
                              <SelectItem value="medium">Medium - Support needed</SelectItem>
                              <SelectItem value="high">High - Urgent assistance</SelectItem>
                              <SelectItem value="emergency">Emergency - Immediate help</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => handleInputChange("subject", e.target.value)}
                          placeholder="Brief description of your inquiry"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => handleInputChange("message", e.target.value)}
                          placeholder="Please provide details about your inquiry or the assistance you need..."
                          rows={6}
                          required
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button type="submit" className="flex-1">
                          Send Message
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setFormData({
                              name: "",
                              email: "",
                              organization: "",
                              subject: "",
                              message: "",
                              urgency: "",
                            })
                          }
                        >
                          Clear Form
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* FAQ Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">How quickly can I get help during an emergency?</h4>
                      <p className="text-sm text-muted-foreground">
                        Our emergency support team responds within 5 minutes, 24/7. Call our emergency hotline for
                        immediate assistance.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Do you offer training for disaster preparedness?</h4>
                      <p className="text-sm text-muted-foreground">
                        Yes, we provide comprehensive training programs for individuals, organizations, and communities.
                        Contact us for details.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Can Resilio work without internet connectivity?</h4>
                      <p className="text-sm text-muted-foreground">
                        Absolutely. Our offline-first design ensures critical features work even when infrastructure
                        fails.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        How do I integrate Resilio with existing emergency systems?
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        We offer comprehensive API documentation and integration support. Our technical team can assist
                        with custom implementations.
                      </p>
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
