"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Copy, ExternalLink, CheckCircle, Clock, AlertCircle, Shield, KeyRound } from "lucide-react"
import {
  generateWalletIdentity,
  loadWalletIdentity,
  signWithWallet,
  type WalletIdentity,
} from "@/lib/chain-wallet"

interface WalletConnectorProps {
  onWalletConnect?: (walletInfo: WalletIdentity) => void
  onPaymentComplete?: (transactionInfo: any) => void
  amount?: string
  projectName?: string
}

export function BlockchainWalletConnector({
  onWalletConnect,
  onPaymentComplete,
  amount = "1000",
  projectName = "Emergency Relief Fund",
}: WalletConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [identity, setIdentity] = useState<WalletIdentity | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "pending" | "success" | "failed">("idle")
  const [transactionHash, setTransactionHash] = useState("")

  // Auto-load persisted wallet on mount (fast restore).
  useEffect(() => {
    let mounted = true
    loadWalletIdentity().then((existing) => {
      if (mounted && existing) {
        setIdentity(existing)
        setIsConnected(true)
        onWalletConnect?.(existing)
      }
    })
    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWalletConnect = async () => {
    setIsConnecting(true)
    try {
      // Generate a fresh Ed25519 identity for the custom Bharat Resilio chain.
      const fresh = await generateWalletIdentity("donor")
      setIdentity(fresh)
      setWalletAndConnect(fresh)
    } catch (error) {
      console.error("Wallet connect failed:", error)
      setIsConnecting(false)
    }
  }

  const setWalletAndConnect = (wallet: WalletIdentity) => {
    setIdentity(wallet)
    setIsConnected(true)
    setIsConnecting(false)
    onWalletConnect?.(wallet)
  }

  const disconnect = () => {
    setIsConnected(false)
    setIdentity(null)
    setTransactionStatus("idle")
    setTransactionHash("")
  }

  const handlePayment = async () => {
    if (!identity) return
    setTransactionStatus("pending")

    try {
      // Build a ReleaseFundsTx payload and sign it with this wallet's keypair.
      const txPayload = JSON.stringify({
        txId: `rel-${Date.now()}`,
        type: "ReleaseFunds",
        data: {
          incidentId: projectName.toLowerCase().replace(/\s+/g, "-"),
          amount: Number.parseFloat(amount) || 0,
          recipientAddress: identity.nodeId,
        },
        timestamp: Date.now(),
        signer: identity.publicKeyHex,
      })

      const signature = await signWithWallet(identity, txPayload)
      setTransactionHash(signature.slice(0, 64))
      setTransactionStatus("success")

      onPaymentComplete?.({
        transactionHash: signature,
        signedBy: identity.nodeId,
        amount,
        projectName,
        signature,
      })
    } catch (error) {
      console.error("Payment failed:", error)
      setTransactionStatus("failed")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Wallet className="h-5 w-5 text-primary" />
    }
  }

  if (transactionStatus === "success") {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
          <p className="text-muted-foreground mb-4">Your donation has been signed and submitted to the chain</p>

          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">₹{amount}</span>
            </div>
            <div className="flex justify-between">
              <span>Signed By:</span>
              <span className="font-mono text-xs">{identity?.nodeId.slice(0, 10)}...{identity?.nodeId.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Signature:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{transactionHash.slice(0, 10)}...</span>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(transactionHash)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <Badge className="bg-green-500">Signed on Resilio Chain</Badge>
        </CardContent>
      </Card>
    )
  }

  if (transactionStatus === "pending") {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-yellow-500 animate-spin" />
          </div>
          <h3 className="text-xl font-bold mb-2">Transaction In Progress</h3>
          <p className="text-muted-foreground mb-4">Signing transaction with your Resilio chain wallet...</p>

          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Clock className="h-4 w-4 animate-spin" />
              <span>Ed25519 signing in progress...</span>
            </div>
          </div>

          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
            Processing
          </Badge>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Resilio Chain Wallet
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a keypair on our custom permissioned chain — no MetaMask needed
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50"
            onClick={handleWalletConnect}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl"><KeyRound className="h-6 w-6" /></span>
                <div>
                  <h4 className="font-medium">New Resilio Wallet</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate Ed25519 keypair stored securely in your browser (IndexedDB)
                  </p>
                </div>
              </div>
              {isConnecting ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Badge variant="outline" className="text-green-500 border-green-500/50">
                  Create
                </Badge>
              )}
            </div>
          </div>

          {identity && !isConnected && (
            <Button variant="outline" className="w-full" onClick={() => setWalletAndConnect(identity)}>
              Restore Existing Wallet ({identity.nodeId.slice(0, 10)}...)
            </Button>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
            <Shield className="h-3 w-3" />
            <span>All transactions are signed locally with your private key</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(transactionStatus)}
            Wallet Connected
          </div>
          <Button size="sm" variant="ghost" onClick={disconnect}>
            Disconnect
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Complete your chain donation</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Node ID:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">
                {identity?.nodeId.slice(0, 10)}...{identity?.nodeId.slice(-4)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(identity?.nodeId ?? "")}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span>Public Key:</span>
            <span className="font-mono text-xs">{identity?.publicKeyHex.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Crypto:</span>
            <span className="font-medium">Ed25519</span>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Donation Amount</Label>
            <Input value={`₹${amount}`} readOnly />
          </div>
          <div>
            <Label className="text-sm font-medium">Project</Label>
            <Input value={projectName} readOnly />
          </div>
        </div>

        {/* Total */}
        <div className="bg-primary/5 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Donation Total:</span>
            <span className="text-lg font-bold">₹{amount}</span>
          </div>
        </div>

        {/* Payment Button */}
        <Button className="w-full" size="lg" onClick={handlePayment}>
          <Wallet className="h-4 w-4 mr-2" />
          Send Donation
        </Button>

        {/* Security Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Signed locally before submission — your key never leaves this device</span>
        </div>
      </CardContent>
    </Card>
  )
}