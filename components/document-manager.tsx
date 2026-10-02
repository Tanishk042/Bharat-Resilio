"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Upload, Eye, Download, Trash2, Search, Plus } from "lucide-react"
import { useState } from "react"

interface Document {
  id: string
  name: string
  type: string
  size: string
  uploadDate: string
  status: "verified" | "pending" | "rejected"
  category: "emergency" | "identification" | "insurance" | "medical"
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Emergency Plan.pdf",
    type: "Emergency Plan",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    status: "verified",
    category: "emergency",
  },
  {
    id: "2",
    name: "Driver License.jpg",
    type: "Driver's License",
    size: "1.2 MB",
    uploadDate: "2024-01-12",
    status: "verified",
    category: "identification",
  },
  {
    id: "3",
    name: "Health Insurance.pdf",
    type: "Health Insurance",
    size: "3.1 MB",
    uploadDate: "2024-01-10",
    status: "pending",
    category: "insurance",
  },
  {
    id: "4",
    name: "Medical Records.pdf",
    type: "Medical Records",
    size: "4.5 MB",
    uploadDate: "2024-01-08",
    status: "verified",
    category: "medical",
  },
]

export function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "text-green-500 border-green-500/50 bg-green-500/10"
      case "pending":
        return "text-orange-500 border-orange-500/50 bg-orange-500/10"
      case "rejected":
        return "text-red-500 border-red-500/50 bg-red-500/10"
      default:
        return "text-muted-foreground"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "emergency":
        return "bg-red-500/10 text-red-500"
      case "identification":
        return "bg-blue-500/10 text-blue-500"
      case "insurance":
        return "bg-green-500/10 text-green-500"
      case "medical":
        return "bg-purple-500/10 text-purple-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Manager
          </CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Securely store and manage your important documents for emergency situations
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className={selectedCategory !== "all" ? "bg-transparent" : ""}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "emergency" ? "default" : "outline"}
              onClick={() => setSelectedCategory("emergency")}
              className={selectedCategory !== "emergency" ? "bg-transparent" : ""}
            >
              Emergency
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "identification" ? "default" : "outline"}
              onClick={() => setSelectedCategory("identification")}
              className={selectedCategory !== "identification" ? "bg-transparent" : ""}
            >
              ID
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === "insurance" ? "default" : "outline"}
              onClick={() => setSelectedCategory("insurance")}
              className={selectedCategory !== "insurance" ? "bg-transparent" : ""}
            >
              Insurance
            </Button>
          </div>
        </div>

        {/* Document List */}
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium">{doc.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>Uploaded {doc.uploadDate}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(doc.status)}>
                  {doc.status}
                </Badge>
                <Button size="sm" variant="ghost">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Upload your first document to get started"}
            </p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        )}

        {/* Storage Usage */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Storage Used</span>
            <span className="text-sm text-muted-foreground">12.3 MB of 100 MB</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: "12.3%" }}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
