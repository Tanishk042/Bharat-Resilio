"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Copy, Download, Share2, Smartphone } from "lucide-react"

interface QRCodeGeneratorProps {
  walletAddress?: string
  amount?: string
  projectName?: string
  onScan?: (data: any) => void
}

export function QRCodeGenerator({
  walletAddress = "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  amount = "1000",
  projectName = "Emergency Relief Fund",
  onScan,
}: QRCodeGeneratorProps) {
  const [qrData, setQrData] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [customAmount, setCustomAmount] = useState(amount)

  useEffect(() => {
    generateQRCode()
  }, [walletAddress, customAmount, projectName])

  const generateQRCode = () => {
    setIsGenerating(true)

    // Simulate QR code generation
    setTimeout(() => {
      const qrPayload = {
        address: walletAddress,
        amount: customAmount,
        project: projectName,
        currency: "INR",
        network: "ethereum",
        timestamp: new Date().toISOString(),
      }

      setQrData(JSON.stringify(qrPayload))
      setIsGenerating(false)
    }, 1000)
  }

  const copyQRData = () => {
    navigator.clipboard.writeText(qrData)
    alert("QR code data copied to clipboard!")
  }

  const downloadQR = () => {
    // In a real implementation, this would generate and download a QR code image
    alert("QR code download started! (This would download a PNG file in a real implementation)")
  }

  const shareQR = () => {
    if (navigator.share) {
      navigator.share({
        title: `Donate to ${projectName}`,
        text: `Scan this QR code to donate ₹${customAmount} to ${projectName}`,
        url: window.location.href,
      })
    } else {
      copyQRData()
    }
  }

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Donation QR Code
          </CardTitle>
          <p className="text-sm text-muted-foreground">Scan with any blockchain wallet app to make a donation</p>
        </CardHeader>
        <CardContent className="text-center">
          <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 relative">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <QrCode className="h-12 w-12 text-muted-foreground animate-pulse" />
                <span className="text-sm text-muted-foreground">Generating...</span>
              </div>
            ) : (
              <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                {/* In a real implementation, this would be an actual QR code */}
                <div className="grid grid-cols-8 gap-1 p-4">
                  {Array.from({ length: 64 }, (_, i) => (
                    <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? "bg-black" : "bg-white"}`} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={copyQRData}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Data
            </Button>
            <Button size="sm" variant="outline" onClick={downloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={shareQR}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Customize QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="amount">Donation Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <div>
            <Label htmlFor="wallet">Wallet Address</Label>
            <div className="flex items-center gap-2">
              <Input id="wallet" value={walletAddress} readOnly className="font-mono text-sm" />
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(walletAddress)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="project">Project Name</Label>
            <Input id="project" value={projectName} readOnly />
          </div>

          <Button onClick={generateQRCode} disabled={isGenerating} className="w-full">
            {isGenerating ? "Generating..." : "Update QR Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium">1</span>
              </div>
              <div>
                <p className="font-medium">Open your wallet app</p>
                <p className="text-muted-foreground">Use MetaMask, Trust Wallet, or any compatible blockchain wallet</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium">2</span>
              </div>
              <div>
                <p className="font-medium">Scan the QR code</p>
                <p className="text-muted-foreground">Point your camera at the QR code above</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium">3</span>
              </div>
              <div>
                <p className="font-medium">Confirm transaction</p>
                <p className="text-muted-foreground">Review the details and confirm your donation</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium">4</span>
              </div>
              <div>
                <p className="font-medium">Track your impact</p>
                <p className="text-muted-foreground">Use the transaction hash to track your donation's impact</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
