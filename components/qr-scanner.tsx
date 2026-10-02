"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Camera, Upload, Search, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

interface QRScannerProps {
  onScanResult?: (result: any) => void
  onError?: (error: string) => void
}

interface ScanResult {
  type: "donation" | "transaction" | "wallet" | "unknown"
  data: any
  timestamp: string
  valid: boolean
}

export function QRScanner({ onScanResult, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      setIsScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Simulate QR code detection after 3 seconds
      setTimeout(() => {
        simulateQRDetection()
      }, 3000)
    } catch (error) {
      onError?.("Camera access denied or not available")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const simulateQRDetection = () => {
    const mockResults = [
      {
        type: "donation" as const,
        data: {
          transactionId: "0x" + Math.random().toString(16).substr(2, 64),
          amount: "2500",
          project: "Emergency Relief Fund",
          donor: "Anonymous",
          status: "confirmed",
          blockNumber: Math.floor(Math.random() * 1000000) + 2000000,
        },
        timestamp: new Date().toISOString(),
        valid: true,
      },
      {
        type: "wallet" as const,
        data: {
          address: "0x" + Math.random().toString(16).substr(2, 40),
          balance: (Math.random() * 10 + 1).toFixed(4) + " ETH",
          network: "Ethereum Mainnet",
        },
        timestamp: new Date().toISOString(),
        valid: true,
      },
      {
        type: "transaction" as const,
        data: {
          hash: "0x" + Math.random().toString(16).substr(2, 64),
          from: "0x" + Math.random().toString(16).substr(2, 40),
          to: "0x" + Math.random().toString(16).substr(2, 40),
          value: "1.5 ETH",
          gasUsed: "21000",
          status: "success",
        },
        timestamp: new Date().toISOString(),
        valid: true,
      },
    ]

    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)]
    setScanResult(randomResult)
    setScanHistory((prev) => [randomResult, ...prev.slice(0, 9)]) // Keep last 10 scans
    onScanResult?.(randomResult)
    stopCamera()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Simulate QR code reading from image
      setTimeout(() => {
        simulateQRDetection()
      }, 1000)
    }
  }

  const handleManualInput = () => {
    if (!manualInput.trim()) return

    let result: ScanResult

    if (manualInput.startsWith("0x") && manualInput.length === 66) {
      // Transaction hash
      result = {
        type: "transaction",
        data: {
          hash: manualInput,
          status: "pending",
          network: "Ethereum",
        },
        timestamp: new Date().toISOString(),
        valid: true,
      }
    } else if (manualInput.startsWith("0x") && manualInput.length === 42) {
      // Wallet address
      result = {
        type: "wallet",
        data: {
          address: manualInput,
          network: "Ethereum",
        },
        timestamp: new Date().toISOString(),
        valid: true,
      }
    } else {
      // Unknown format
      result = {
        type: "unknown",
        data: { input: manualInput },
        timestamp: new Date().toISOString(),
        valid: false,
      }
    }

    setScanResult(result)
    setScanHistory((prev) => [result, ...prev.slice(0, 9)])
    onScanResult?.(result)
    setManualInput("")
  }

  const getResultIcon = (type: string, valid: boolean) => {
    if (!valid) return <AlertCircle className="h-5 w-5 text-red-500" />

    switch (type) {
      case "donation":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "transaction":
        return <ExternalLink className="h-5 w-5 text-blue-500" />
      case "wallet":
        return <QrCode className="h-5 w-5 text-purple-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getResultColor = (type: string, valid: boolean) => {
    if (!valid) return "destructive"

    switch (type) {
      case "donation":
        return "default"
      case "transaction":
        return "secondary"
      case "wallet":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      {/* Scanner Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan QR codes to track donations, transactions, and wallet addresses
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Camera View */}
            <div className="relative">
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {isScanning ? (
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                  </div>
                )}
              </div>

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Scanner Controls */}
            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startCamera} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="outline" className="flex-1 bg-transparent">
                  Stop Camera
                </Button>
              )}

              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>

            {/* Manual Input */}
            <div className="space-y-2">
              <Label htmlFor="manual-input">Manual Input</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-input"
                  placeholder="Enter transaction hash or wallet address"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                />
                <Button onClick={handleManualInput}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(scanResult.type, scanResult.valid)}
              Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={getResultColor(scanResult.type, scanResult.valid) as any}>
                  {scanResult.type.charAt(0).toUpperCase() + scanResult.type.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">{new Date(scanResult.timestamp).toLocaleString()}</span>
              </div>

              {scanResult.type === "donation" && scanResult.valid && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium">₹{scanResult.data.amount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Project:</span>
                    <p className="font-medium">{scanResult.data.project}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{scanResult.data.status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Block:</span>
                    <p className="font-medium">#{scanResult.data.blockNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <p className="font-mono text-xs break-all">{scanResult.data.transactionId}</p>
                  </div>
                </div>
              )}

              {scanResult.type === "wallet" && scanResult.valid && (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-mono text-xs break-all">{scanResult.data.address}</p>
                  </div>
                  {scanResult.data.balance && (
                    <div>
                      <span className="text-muted-foreground">Balance:</span>
                      <p className="font-medium">{scanResult.data.balance}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Network:</span>
                    <p className="font-medium">{scanResult.data.network}</p>
                  </div>
                </div>
              )}

              {scanResult.type === "transaction" && scanResult.valid && (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Hash:</span>
                    <p className="font-mono text-xs break-all">{scanResult.data.hash}</p>
                  </div>
                  {scanResult.data.from && (
                    <div>
                      <span className="text-muted-foreground">From:</span>
                      <p className="font-mono text-xs break-all">{scanResult.data.from}</p>
                    </div>
                  )}
                  {scanResult.data.to && (
                    <div>
                      <span className="text-muted-foreground">To:</span>
                      <p className="font-mono text-xs break-all">{scanResult.data.to}</p>
                    </div>
                  )}
                  {scanResult.data.value && (
                    <div>
                      <span className="text-muted-foreground">Value:</span>
                      <p className="font-medium">{scanResult.data.value}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{scanResult.data.status}</p>
                  </div>
                </div>
              )}

              {!scanResult.valid && (
                <div className="text-sm text-red-500">
                  Invalid QR code format. Please scan a valid donation, transaction, or wallet QR code.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanHistory.map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getResultIcon(scan.type, scan.valid)}
                    <div>
                      <p className="font-medium capitalize">{scan.type}</p>
                      <p className="text-sm text-muted-foreground">{new Date(scan.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant={getResultColor(scan.type, scan.valid) as any}>
                    {scan.valid ? "Valid" : "Invalid"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
