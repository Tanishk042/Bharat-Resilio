"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Heart,
  Zap,
  Shield,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Loader2,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Navigation } from "@/components/navigation"
import { buildAssistantReply, QUICK_PROMPTS, detectHazard } from "@/lib/assistant-brain"
import { useResilioData } from "@/lib/use-resilio-data"
import { IndiaMap, hazardLabel, severityTier } from "@/components/india-map"

interface ChatMessage {
  id: number
  role: "user" | "bot"
  content: string
  hazard?: string
}

let msgSeq = 0

export default function AISurvivalAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: ++msgSeq,
      role: "bot",
      content:
        "Hello! I'm your AI Survival Assistant — powered live by the Resilio DeX-LLM and Preparedness Engine.\n\nI can register emergency reports, show the live situation, and guide you through any disaster. Try the mic 🎤",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [speakEnabled, setSpeakEnabled] = useState(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const { incidents, loading: dataLoading, refreshedAt } = useResilioData(15000)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* noop */
    }
    recognitionRef.current = null
    setListening(false)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || typeof window === "undefined" || !window.speechSynthesis) return
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(
          text.replace(/[#*•:]/g, " ").replace(/\s+/g, " ").trim(),
        )
        utterance.lang = "en-IN"
        utterance.rate = 1.05
        window.speechSynthesis.speak(utterance)
      } catch {
        /* unsupported */
      }
    },
    [speakEnabled],
  )

  const runReply = useCallback(
    async (userText: string) => {
      if (!userText.trim() || loading) return
      setLoading(true)
      setInput("")
      setMessages((prev) => [...prev, { id: ++msgSeq, role: "user", content: userText }])
      try {
        const reply = await buildAssistantReply(userText)
        setMessages((prev) => [
          ...prev,
          { id: ++msgSeq, role: "bot", content: reply.text, hazard: reply.hazard },
        ])
        speak(reply.spoken ?? reply.text)
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: ++msgSeq,
            role: "bot",
            content:
              "I hit a snag reaching the services. For immediate danger please dial 112 — I still work offline for preparedness guidance.",
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loading, speak],
  )

  const startListening = useCallback(() => {
    setVoiceError(null)
    if (typeof window === "undefined") return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setVoiceError("Voice input isn't supported in this browser — please type instead.")
      return
    }
    const recognition = new SR()
    recognition.lang = "en-IN"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim()
      if (transcript) runReply(transcript)
    }
    recognition.onerror = (event) => {
      setListening(false)
      setVoiceError(
        event.error === "no-speech"
          ? "I didn't catch that — try again or type."
          : event.error === "not-allowed"
            ? "Microphone permission denied."
            : `Mic error: ${event.error}`,
      )
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }
    recognitionRef.current = recognition
    setListening(true)
    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }, [runReply])

  const hazardType = input ? detectHazard(input) : null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto pt-20 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="kicker">01 — Voice first</p>
                <h1 className="display mt-3 text-3xl md:text-4xl tracking-tight">AI Survival Assistant</h1>
                <p className="mt-3 text-muted-foreground max-w-2xl">
                  Live emergencies, survival guidance and emergency reporting — by voice or text
                </p>
              </div>
            </div>
            <ProfileDropdown userRole="civilian" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[640px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat Assistant
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setSpeakEnabled((s) => !s)}
                      aria-label={speakEnabled ? "Mute voice replies" : "Enable voice replies"}
                    >
                      {speakEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
                      />
                      {loading ? "Processing…" : "Online"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`p-2 rounded-full flex-shrink-0 ${message.role === "user" ? "bg-primary" : "bg-muted"}`}
                        >
                          {message.role === "user" ? (
                            <User className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg break-words ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          {message.hazard && message.role === "bot" && (
                            <Badge variant="outline" className="mt-2 text-primary">
                              {hazardLabel(message.hazard)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-start gap-2">
                      <div className="p-2 rounded-full bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick prompts */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => runReply(prompt)}
                      className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      listening ? "Listening… speak now 🎤" : "Ask about survival, or say \"report flood near Sector 12\"…"
                    }
                    onKeyDown={(e) => e.key === "Enter" && runReply(input)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant={listening ? "destructive" : "outline"}
                    aria-label={listening ? "Stop listening" : "Speak"}
                    onClick={() => (listening ? stopRecognition() : startListening())}
                    className="relative"
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {listening && (
                      <span className="absolute -inset-1 rounded-full bg-destructive/30 animate-ping" aria-hidden />
                    )}
                  </Button>
                  <Button onClick={() => runReply(input)} size="icon" disabled={!input.trim() || loading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {voiceError && <p className="mt-2 text-xs text-destructive">{voiceError}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Emergency categories */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Emergency Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Report an emergency → assistant registers it</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
                  <Zap className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Natural disaster guidance</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                  <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Preparedness plans & kits</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                  <Heart className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Survival skills (offline)</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Current query detected: <Badge variant="secondary">{hazardType ? hazardLabel(hazardType) : "—"}</Badge>
                </p>
              </CardContent>
            </Card>

            {/* Live incident feed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Radio className="h-4 w-4 text-primary" />
                  Live Incidents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  {dataLoading
                    ? "Fetching from oracle…"
                    : `Streamed from oracle + mesh · last update ${refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : "—"}`}
                </p>
                {incidents.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No active incidents right now.
                  </p>
                ) : (
                  incidents
                    .slice(0, 5)
                    .map((inc) => (
                      <div
                        key={inc.incident_id}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">{hazardLabel(inc.hazard_type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {inc.location} · {inc.status}
                          </p>
                        </div>
                        <Badge className={severityTier(inc.severity).text} variant="outline">
                          {inc.severity}/10
                        </Badge>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {/* Mini live map */}
            <IndiaMap incidents={incidents} height="h-[260px]" title="Live Map" showLegend={false} />
          </div>
        </div>
      </div>
    </div>
  )
}