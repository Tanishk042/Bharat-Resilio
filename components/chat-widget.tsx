"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Bot, User, Send, Mic, MicOff, Volume2, VolumeX, X, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AssistantReply } from "@/lib/assistant-brain"
import { buildAssistantReply, QUICK_PROMPTS } from "@/lib/assistant-brain"

interface ChatMessage {
  id: number
  role: "user" | "bot"
  content: string
  actions?: AssistantReply["actions"]
}

let msgSeq = 0

function useVoiceSupported(): boolean {
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(Boolean(SR) && Boolean(window.speechSynthesis))
  }, [])
  return supported
}

type SpeechRecognitionRef = SpeechRecognition | null

export function ChatWidget() {
  const voiceSupported = useVoiceSupported()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: ++msgSeq,
      role: "bot",
      content:
        "Hello! I'm the Resilio assistant — always ready, even offline. Report an emergency, get live disaster status, or survival guidance. You can talk to me 🎤",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakEnabled, setSpeakEnabled] = useState(true)
  const [micError, setMicError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<SpeechRecognitionRef>(null)
  const keepMicOnRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, loading])

  const stopRecognition = useCallback(() => {
    keepMicOnRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {
      /* noop */
    }
    recognitionRef.current = null
    setListening(false)
  }, [])

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

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || typeof window === "undefined" || !window.speechSynthesis) return
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(
          text.replace(/[#*•:\n]/g, " ").replace(/\s+/g, " ").trim(),
        )
        utterance.lang = "en-IN"
        utterance.rate = 1.05
        window.speechSynthesis.speak(utterance)
      } catch {
        /* speech unsupported */
      }
    },
    [speakEnabled],
  )

  const pushMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  const runReply = useCallback(
    async (userText: string, forceSpoken?: boolean) => {
      setInput("")
      setLoading(true)
      try {
        const userMsg: ChatMessage = { id: ++msgSeq, role: "user", content: userText }
        pushMessage(userMsg)
        const reply = await buildAssistantReply(userText)
        pushMessage({ id: ++msgSeq, role: "bot", content: reply.text, actions: reply.actions })
        if (speakEnabled || forceSpoken) speak(reply.spoken ?? reply.text)
      } catch (error) {
        pushMessage({
          id: ++msgSeq,
          role: "bot",
          content: "I hit a snag reaching the services. Please try again in a moment — I also work fully offline for preparedness guidance.",
        })
      } finally {
        setLoading(false)
      }
    },
    [pushMessage, speak, speakEnabled],
  )

  const startListening = useCallback(() => {
    setMicError(null)
    if (typeof window === "undefined") return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMicError("Voice input is not supported in this browser — please type instead.")
      return
    }
    const recognition = new SR()
    recognition.lang = "en-IN"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()
      if (transcript) {
        setInput(transcript)
        keepMicOnRef.current = false
        recognition.stop()
        runReply(transcript)
      }
    }
    recognition.onerror = (event) => {
      setListening(false)
      if (event.error === "no-speech") {
        setMicError("I didn't catch that — try again or type.")
      } else if (event.error === "not-allowed") {
        setMicError("Microphone permission denied.")
      } else {
        setMicError(`Mic error: ${event.error}`)
      }
    }
    recognition.onend = () => {
      if (keepMicOnRef.current) {
        try {
          recognition.start()
          return
        } catch {
          /* fallthrough */
        }
      }
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    keepMicOnRef.current = true
    setListening(true)
    try {
      recognition.start()
    } catch {
      keepMicOnRef.current = false
      setListening(false)
    }
  }, [runReply])

  const onQuickPrompt = (prompt: string) => {
    setOpen(true)
    runReply(prompt)
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        aria-label="Open Resilio assistant"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex w-[380px] max-w-[calc(100vw-2.5rem)] flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-background/20 p-1.5">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Resilio Assistant</p>
                <p className="text-[10px] leading-tight text-primary-foreground/70 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                  Online · voice ready
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-md p-1.5 hover:bg-background/20"
                aria-label={speakEnabled ? "Mute voice replies" : "Enable voice replies"}
                onClick={() => setSpeakEnabled((s) => !s)}
              >
                {speakEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="h-[360px] overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex max-w-[85%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {msg.actions.map((action, i) =>
                          action.href ? (
                            <a
                              key={i}
                              href={action.href}
                              className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              {action.label}
                            </a>
                          ) : action.quick ? (
                            <button
                              key={i}
                              type="button"
                              onClick={() => runReply(action.quick!)}
                              className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              {action.label}
                            </button>
                          ) : null,
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="overflow-x-auto whitespace-nowrap border-t px-2 py-1.5 flex gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuickPrompt(prompt)}
                className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 border-t p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) runReply(input)
              }}
              placeholder="Ask or report an emergency…"
              className="h-9 flex-1 text-sm"
            />
            {voiceSupported && (
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "outline"}
                className="h-9 w-9 flex-shrink-0"
                aria-label={listening ? "Stop listening" : "Speak"}
                onClick={() => (listening ? stopRecognition() : startListening())}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              disabled={!input.trim() || loading}
              onClick={() => runReply(input)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {(micError || !voiceSupported) && (
            <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              {micError ?? "Voice not supported in this browser — type instead."}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export function ChatLauncherMessage() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
      <MessageSquare className="h-4 w-4" />
      Ask the Resilio assistant anything — voice enabled 🎤
    </div>
  )
}