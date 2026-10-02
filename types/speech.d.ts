export {}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionStatic
    SpeechRecognition?: SpeechRecognitionStatic
  }

  type SpeechRecognitionErrorCode =
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported"

  interface SpeechRecognitionErrorEvent extends Event {
    error: SpeechRecognitionErrorCode
    message: string
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number
    results: SpeechRecognitionResultList
  }

  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
      | null
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
    onend: ((this: SpeechRecognition, ev: Event) => void) | null
    start(): void
    stop(): void
    abort(): void
  }

  interface SpeechRecognitionStatic {
    new (): SpeechRecognition
  }
}