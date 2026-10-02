"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ArrowLeft, CreditCard, QrCode, Shield, CheckCircle, Clock, Copy } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BlockchainWalletConnector } from "@/components/blockchain-wallet-connector"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { loadWalletIdentity } from "@/lib/chain-wallet"

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "failed">("pending")
  const [transactionId, setTransactionId] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [qrCodeData, setQrCodeData] = useState("")

  // Get donation details from URL params
  const amount = searchParams.get("amount") || "1000"
  const project = searchParams.get("project") || "Emergency Relief Fund"

  useEffect(() => {
    // Generate wallet address and QR code data for blockchain payments
    if (paymentMethod === "crypto") {
      loadWalletIdentity().then((identity) => {
        const walletAddressValue = identity ? identity.publicKeyHex.slice(0, 64) : "resilio-chain-address"
        setWalletAddress(walletAddressValue)
        setQrCodeData(`resilio:${walletAddressValue}?value=${amount}&project=${encodeURIComponent(project)}`)
      })
    }
  }, [paymentMethod, amount, project])

  const handleCardPayment = async () => {
    setIsProcessing(true)
    setPaymentStatus("processing")

    // Simulate payment processing
    setTimeout(() => {
      const txId = "TXN" + Math.random().toString(16).substr(2, 8).toUpperCase()
      setTransactionId(txId)
      setPaymentStatus("success")
      setIsProcessing(false)
    }, 3000)
  }

  const handleCryptoPayment = async () => {
    setIsProcessing(true)
    setPaymentStatus("processing")

    // Simulate blockchain transaction
    setTimeout(() => {
      const txId = "0x" + Math.random().toString(16).substr(2, 64)
      setTransactionId(txId)
      setPaymentStatus("success")
      setIsProcessing(false)
    }, 5000)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="pt-20 pb-8">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
                <p className="text-muted-foreground mb-6">
                  Thank you for your generous donation. Your contribution will make a real difference.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">₹{amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Project:</span>
                    <span className="font-medium">{project}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{transactionId}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transactionId)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className="bg-green-500">Confirmed</Badge>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <Link href="/donor-dashboard">
                    <Button>Back to Dashboard</Button>
                  </Link>
                  <Link href="/donor-dashboard/track">
                    <Button variant="outline">
                      <QrCode className="h-4 w-4 mr-2" />
                      Track Donation
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/donor-dashboard/donate">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Secure Payment</h1>
                <p className="text-muted-foreground">Complete your donation securely</p>
              </div>
            </div>
            <ProfileDropdown userRole="donor" userName="विक्रम सिंह / Vikram Singh" userEmail="vikram.singh@email.com" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Payment Methods */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Choose Payment Method</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred payment method for secure donation
                  </p>
                </CardHeader>
                <CardContent>
                  <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="card">Credit/Debit Card</TabsTrigger>
                      <TabsTrigger value="crypto">Blockchain Wallet</TabsTrigger>
                    </TabsList>

                    <TabsContent value="card" className="space-y-6 mt-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="card-number">Card Number</Label>
                            <Input id="card-number" placeholder="1234 5678 9012 3456" />
                          </div>
                          <div>
                            <Label htmlFor="card-name">Cardholder Name</Label>
                            <Input id="card-name" placeholder="John Doe" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input id="expiry" placeholder="MM/YY" />
                          </div>
                          <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          <span>Your payment information is encrypted and secure</span>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleCardPayment} disabled={isProcessing}>
                          {isProcessing ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Processing Payment...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay ₹{amount}
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="crypto" className="space-y-6 mt-6">
                      <div className="space-y-6">
                        <BlockchainWalletConnector
                          amount={amount}
                          projectName={project}
                          onWalletConnect={(walletInfo) => {
                            console.log("[v0] Wallet connected:", walletInfo)
                          }}
                          onPaymentComplete={(txInfo) => {
                            console.log("[v0] Payment completed:", txInfo)
                            setIsProcessing(false)
                            setPaymentStatus("success")
                            setTransactionId(txInfo.transactionHash)
                          }}
                        />

                        <div className="border-t pt-6">
                          <h4 className="font-medium mb-4">Alternative: Scan QR Code</h4>
                          <QRCodeGenerator
                            amount={amount}
                            projectName={project}
                            onScan={(data) => {
                              console.log("[v0] QR code scanned:", data)
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Donation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Project:</span>
                      <span className="font-medium text-right">{project}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Donation Amount:</span>
                      <span className="font-medium">₹{amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Fee:</span>
                      <span className="font-medium">₹0</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>₹{amount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>• 100% of your donation goes to the project</p>
                    <p>• Tax deductible under Section 80G</p>
                    <p>• Receipt will be sent via email</p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Features */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Security Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Blockchain transparency</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Real-time tracking</span>
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
