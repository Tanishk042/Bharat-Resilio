"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, FileText, Bell, Shield, Settings, LogOut, Crown } from "lucide-react"
import { useState } from "react"

interface ProfileSidebarProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function ProfileSidebar({ activeSection = "profile", onSectionChange }: ProfileSidebarProps) {
  const [currentSection, setCurrentSection] = useState(activeSection)

  const handleSectionChange = (section: string) => {
    setCurrentSection(section)
    onSectionChange?.(section)
  }

  const menuItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "account", label: "Account", icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src="/placeholder.svg?height=80&width=80" />
              <AvatarFallback className="text-lg">SI</AvatarFallback>
            </Avatar>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Suresh Iyer</h3>
              <p className="text-sm text-muted-foreground">suresh.iyer@resilio.in</p>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Crown className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Menu */}
      <Card>
        <CardContent className="p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentSection === item.id

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleSectionChange(item.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              )
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent text-red-500 hover:text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
