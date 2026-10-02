"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Settings, LogOut, Shield, Heart, Users, Landmark } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

interface ProfileDropdownProps {
  userRole?: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  organization?: string
}

export function ProfileDropdown({
  userRole,
  userName,
  userEmail,
  userAvatar,
  organization,
}: ProfileDropdownProps) {
  const router = useRouter()
  const { user: sessionUser, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const role = userRole ?? sessionUser?.role ?? "civilian"
  const name = userName ?? sessionUser?.name ?? "राज कुमार / Raj Kumar"
  const email = userEmail ?? sessionUser?.email ?? "raj.kumar@email.com"

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      logout()
    } finally {
      setIsLoggingOut(false)
      router.replace("/login")
    }
  }

  const handleProfile = () => {
    router.push("/settings")
  }

  const getRoleInfo = () => {
    switch (role) {
      case "civilian":
        return {
          label: "नागरिक / Civilian",
          icon: Users,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
        }
      case "donor":
        return {
          label: "दानदाता / Donor",
          icon: Heart,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
        }
      case "ngo":
      case "authority":
        return {
          label: "प्राधिकरण / Authority",
          icon: Landmark,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
        }
      default:
        return {
          label: "User",
          icon: User,
          color: "text-gray-500",
          bgColor: "bg-gray-500/10",
        }
    }
  }

  const roleInfo = getRoleInfo()
  const RoleIcon = roleInfo.icon
  const initial = name.trim().split(/\s+/)[0]?.charAt(0) || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userAvatar || "/placeholder.svg"} alt={name} />
            <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color}`}>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar || "/placeholder.svg"} alt={name} />
                <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} text-xs`}>{initial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">{name}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{email}</p>
              </div>
            </div>
            <Badge variant="outline" className={`${roleInfo.color} border-current w-fit`}>
              <RoleIcon className="h-3 w-3 mr-1" />
              {roleInfo.label}
            </Badge>
            {organization ? (
              <p className="text-xs text-muted-foreground truncate">{organization}</p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>प्रोफ़ाइल / Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>सेटिंग्स / Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? "लॉग आउट हो रहे हैं..." : "लॉग आउट / Logout"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}