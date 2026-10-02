"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react"
import { useState } from "react"

interface Testimonial {
  id: string
  name: string
  role: string
  location: string
  content: string
  rating: number
  avatar: string
  impact: string
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Priya Sharma",
    role: "Cyclone Survivor",
    location: "Chennai, Tamil Nadu",
    content:
      "Resilio's AI predictions helped my family evacuate 2 days before Cyclone Nivar hit. The real-time alerts and community support saved our lives. We received immediate assistance through the platform's volunteer network.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
    impact: "Family of 4 safely evacuated",
  },
  {
    id: "2",
    name: "Rajesh Kumar",
    role: "Volunteer Coordinator",
    location: "Mumbai, Maharashtra",
    content:
      "The blockchain donation system is revolutionary. Complete transparency means donors can see exactly how their money helps flood victims. We've coordinated over ₹15 crores in aid through this platform.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
    impact: "Coordinated ₹15 crores+ in relief aid",
  },
  {
    id: "3",
    name: "Dr. Anita Patel",
    role: "Emergency Physician",
    location: "Ahmedabad, Gujarat",
    content:
      "Having access to patients' medical documents through Resilio during the Gujarat floods was crucial. The platform saved precious time in emergency care and helped us treat over 200 patients efficiently.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
    impact: "Treated 200+ emergency patients",
  },
  {
    id: "4",
    name: "Vikram Singh",
    role: "Fire Chief",
    location: "Bangalore, Karnataka",
    content:
      "The real-time disaster mapping and AI predictions have transformed our emergency response. We can now deploy resources 30% faster and coordinate with neighboring departments seamlessly.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
    impact: "30% faster emergency response",
  },
]

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <Card className="relative overflow-hidden glassmorphism neon-glow">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Quote className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Community Impact Stories</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={prevTestimonial} className="glassmorphism bg-transparent">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={nextTestimonial} className="glassmorphism bg-transparent">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
              <AvatarImage src={currentTestimonial.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-lg">
                {currentTestimonial.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-lg">{currentTestimonial.name}</h4>
              <p className="text-muted-foreground">{currentTestimonial.role}</p>
              <p className="text-sm text-muted-foreground">{currentTestimonial.location}</p>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(currentTestimonial.rating)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
          </div>

          <blockquote className="text-lg italic leading-relaxed text-balance">
            "{currentTestimonial.content}"
          </blockquote>

          <div className="flex items-center justify-between">
            <div className="bg-primary/10 px-4 py-2 rounded-lg glassmorphism">
              <span className="text-sm font-medium text-primary">{currentTestimonial.impact}</span>
            </div>
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? "bg-primary" : "bg-muted"
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
