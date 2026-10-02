import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Settings, FileText, Shield, Bell, Phone, Mail, Upload, Eye, Edit, Download, Trash2 } from "lucide-react"

const userDocuments = [
  {
    id: "1",
    name: "Emergency Plan.pdf",
    type: "Emergency Plan",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    status: "verified",
  },
  {
    id: "2",
    name: "Disaster Kit List.pdf",
    type: "Disaster Kit",
    size: "1.8 MB",
    uploadDate: "2024-01-10",
    status: "verified",
  },
  {
    id: "3",
    name: "Evacuation Routes.pdf",
    type: "Evacuation Routes",
    size: "3.2 MB",
    uploadDate: "2024-01-08",
    status: "pending",
  },
  {
    id: "4",
    name: "Insurance Policy.pdf",
    type: "Insurance Policy",
    size: "4.1 MB",
    uploadDate: "2024-01-05",
    status: "verified",
  },
]

const identificationDocs = [
  {
    id: "1",
    name: "Driver's License",
    status: "verified",
    expiryDate: "2027-03-15",
  },
  {
    id: "2",
    name: "Passport",
    status: "verified",
    expiryDate: "2029-08-22",
  },
  {
    id: "3",
    name: "Health Insurance Card",
    status: "pending",
    expiryDate: "2024-12-31",
  },
]

export default function UserSettings() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <p className="kicker">01 — Profile</p>
            <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">User Settings</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">Manage your profile, documents, and account preferences</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Navigation */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <Button variant="default" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Privacy
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Account
                    </Button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src="/placeholder.svg?height=80&width=80" />
                      <AvatarFallback className="text-lg">AJ</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Alex Johnson</h3>
                      <p className="text-sm text-muted-foreground">Verified profile account</p>
                      <Button size="sm" variant="outline" className="bg-transparent">
                        <Upload className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value="Alex Johnson" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" type="email" value="alex.johnson@resilio.io" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Contact number</Label>
                        <Input id="phone" type="tel" value="+1 234 567 890" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthdate">Birth date</Label>
                        <Input id="birthdate" type="date" value="1985-12-15" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" value="United States" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">Languages spoken</Label>
                        <Input id="language" value="English, Spanish" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Current address</Label>
                      <Input id="address" value="1234 Main St, New York, USA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency">Emergency contact</Label>
                      <Input id="emergency" value="+1 987 654 321" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Medical conditions</Label>
                      <Input placeholder="Asthma" />
                    </div>
                    <div className="space-y-2">
                      <Label>Special needs</Label>
                      <Input placeholder="None" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button>Save Changes</Button>
                    <Button variant="outline" className="bg-transparent">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documents
                    </CardTitle>
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Store and manage your emergency documents securely</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{doc.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{doc.type}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.uploadDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            doc.status === "verified"
                              ? "text-green-500 border-green-500/50"
                              : "text-orange-500 border-orange-500/50"
                          }
                        >
                          {doc.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Identification Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Identification Documents</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage your identification documents for emergency verification
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {identificationDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Shield className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-medium">{doc.name}</h3>
                          <p className="text-sm text-muted-foreground">Expires: {doc.expiryDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            doc.status === "verified"
                              ? "text-green-500 border-green-500/50"
                              : "text-orange-500 border-orange-500/50"
                          }
                        >
                          {doc.status}
                        </Badge>
                        <Button size="sm" variant="outline" className="bg-transparent">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full bg-transparent">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Emergency Alerts</h3>
                        <p className="text-sm text-muted-foreground">
                          Critical disaster warnings and evacuation orders
                        </p>
                      </div>
                      <div className="w-10 h-6 bg-primary rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Weather Updates</h3>
                        <p className="text-sm text-muted-foreground">
                          Daily weather forecasts and severe weather alerts
                        </p>
                      </div>
                      <div className="w-10 h-6 bg-primary rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Community Updates</h3>
                        <p className="text-sm text-muted-foreground">
                          Local community news and volunteer opportunities
                        </p>
                      </div>
                      <div className="w-10 h-6 bg-muted rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Donation Receipts</h3>
                        <p className="text-sm text-muted-foreground">
                          Blockchain transaction confirmations and receipts
                        </p>
                      </div>
                      <div className="w-10 h-6 bg-primary rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Delivery Methods</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">SMS</span>
                        </div>
                        <div className="w-8 h-5 bg-primary rounded-full relative">
                          <div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">Email</span>
                        </div>
                        <div className="w-8 h-5 bg-muted rounded-full relative">
                          <div className="w-3 h-3 bg-white rounded-full absolute top-1 left-1"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <span className="text-sm">Push</span>
                        </div>
                        <div className="w-8 h-5 bg-primary rounded-full relative">
                          <div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Profile Visibility</h3>
                      <p className="text-sm text-muted-foreground">Control who can see your profile information</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default">
                        Private
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent">
                        Public
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Location Sharing</h3>
                      <p className="text-sm text-muted-foreground">Share your location for emergency services</p>
                    </div>
                    <div className="w-10 h-6 bg-primary rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Data Analytics</h3>
                      <p className="text-sm text-muted-foreground">Help improve our services with usage data</p>
                    </div>
                    <div className="w-10 h-6 bg-muted rounded-full relative">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Button variant="outline" className="w-full bg-transparent">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent">
                      Enable Two-Factor Authentication
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent">
                      Download My Data
                    </Button>
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
