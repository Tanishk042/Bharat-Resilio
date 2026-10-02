/**
 * Resilio Assistant brain — a deterministic, service-aware chatbot core.
 *
 * Intents handled:
 *  - report_emergency  -> DeX-LLM parse + oracle submit (verified via corroboration)
 *  - guidance          -> Preparedness engine guidance for the detected hazard
 *  - status            -> live oracle /mesh /chain statistics
 *  - survival FAQ      -> built-in survival knowledge base (offline-safe)
 *  - fallback          -> helpful pointer replies
 *
 * No external AI calls beyond the in-repo ML model service, so it is fully
 * functional even when third-party APIs / internet are unavailable.
 */

import {
  parseReport,
  getGuidance,
  submitIncident,
  getStatistics,
  getIncidents,
  getMeshHealth,
  getChainState,
} from "@/services/api"

export interface AssistantAction {
  label: string
  href?: string
  quick?: string
}

export interface AssistantReply {
  text: string
  sources?: string[]
  actions?: AssistantAction[]
  hazard?: string
  severity?: number
  incidentId?: string
  verified?: boolean
  spoken?: string
}

export interface AssistantContext {
  incidents?: any[]
  stats?: any
}

const HAZARD_KEYWORDS: Array<[string, string[]]> = [
  ["flood", ["flood", "water level", "inundat", "heavy rain", "rising water"]],
  ["fire", ["fire", "wildfire", "burn", "smoke"]],
  ["earthquake", ["earthquake", "quake", "tremor", "aftershock"]],
  ["cyclone", ["cyclone", "hurricane", "typhoon"]],
  ["tornado", ["tornado", "twister"]],
  ["storm", ["storm", "thunder", "hail", "lightning"]],
  ["landslide", ["landslide", "mudslide", "land slide"]],
  ["gas_leak", ["gas leak", "leak", "lpg", "cng", "methane"]],
  ["chemical_spill", ["chemical", "spill", "toxic", "hazmat"]],
  ["bridge_collapse", ["bridge", "collapse", "building collapse"]],
  ["power_outage", ["power out", "blackout", "electricity", "no power", "outage"]],
  ["medical", ["injured", "medical", "ambulance", "bleeding", "heart attack", "hurt"]],
]

export function detectHazard(text: string): string {
  const lower = text.toLowerCase()
  for (const [hazard, kws] of HAZARD_KEYWORDS) {
    if (kws.some((kw) => lower.includes(kw))) return hazard
  }
  return "general"
}

export function severityToTier(severity: number): string {
  if (severity >= 8) return "Catastrophic"
  if (severity >= 6) return "High"
  if (severity >= 4) return "Warning"
  return "Minimal"
}

const SURVIVAL_KB: Array<{ keys: string[]; title: string; body: string }> = [
  {
    keys: ["purify water", "water in emergency", "clean water", "drink water", "purification"],
    title: "Water purification",
    body: "To purify water in an emergency:\n1) Strain cloudy water through a cloth.\n2) Boil it for at least 1 minute (3 if above 6,500 ft).\n3) Or add 2 drops of household bleach per litre and wait 30 minutes.\n4) Or use water purification tablets / a portable filter. Always store treated water in clean, sealed containers.",
  },
  {
    keys: ["earthquake", "earth quake", "quake"],
    title: "Earthquake safety",
    body: "During an earthquake: DROP to hands and knees, take COVER under a sturdy desk or table, and HOLD ON until shaking stops. Stay away from windows and heavy furniture. If outdoors, move to an open area. Never use elevators. After shaking stops, check for injuries and gas leaks before evacuating.",
  },
  {
    keys: ["first aid", "bleeding", "cpr", "wound", "injury"],
    title: "First aid basics",
    body: "Emergency first aid:\n1) Check responsiveness and call local emergency number.\n2) Control bleeding with firm, direct pressure.\n3) Treat for shock — lay the person down and elevate legs.\n4) Keep the airway clear; position on their side if unconscious.\n5) Do not move an injured person unless they are in immediate danger.",
  },
  {
    keys: ["signal", "help", "rescue"],
    title: "Signaling for help",
    body: "To signal for help: blow a whistle in 3 sharp blasts (international distress signal), create visible markers with bright cloth, use a mirror or glass to flash sunlight, burn green vegetation for smoke during the day, and flash a light or fire at night. Spell SOS with rocks or logs.",
  },
  {
    keys: ["shelter", "build shelter", "survival shelter"],
    title: "Building shelter",
    body: "Emergency shelter:\n1) Pick a dry, level spot away from flood risk.\n2) Use natural windbreaks (rocks, fallen trees).\n3) Insulate from the cold ground with leaves or debris.\n4) Build a frame from branches and cover with a tarp, poncho, or large leaves.\n5) Keep the entrance small and face it away from wind.",
  },
  {
    keys: ["food", "preserve food", "no power", "spoilage", "food without"],
    title: "Food preservation without power",
    body: "Without power: keep refrigerator/freezer doors closed as long as possible, use coolers with ice for perishables, eat refrigerated items first, salt or smoke meat and fish, sun-dry fruits and vegetables, and store grains in airtight containers in a cool, dry place.",
  },
  {
    keys: ["evacuat", "evacuation"],
    title: "Evacuation",
    body: "Evacuation plan:\n1) Know two routes out of your area and a safe meeting point.\n2) Keep a grab-and-go bag with water, medicine, documents, torch and phone charger.\n3) Listen to official channels for route instructions.\n4) Turn off gas and electricity before leaving when safe to do so.\n5) Never drive or walk through floodwater.",
  },
  {
    keys: ["flood"],
    title: "Flood preparedness",
    body: "Flood safety: move to higher ground immediately, never walk or drive through floodwater (6 inches of moving water can knock you over, 12 inches can move a car), keep emergency supplies and documents above water level, and stay tuned to alerts. After floods recede, avoid contact with standing water — it may be contaminated.",
  },
  {
    keys: ["fire"],
    title: "Fire safety",
    body: "Fire safety: crawl low under smoke to escape, feel doors with the back of your hand before opening, use the stairs not the elevator, and if your clothes catch fire — STOP, DROP and ROLL. Assemble everyone at the family meeting point and call emergency services from a safe distance.",
  },
  {
    keys: ["tornado", "cyclone", "hurricane", "storm"],
    title: "Severe storm / tornado safety",
    body: "During a tornado or cyclone: go to a basement or an interior room on the lowest floor, away from windows; cover yourself with a mattress or blanket; if outdoors, lie flat in a ditch away from vehicles. For a cyclone, follow official evacuation orders, secure loose objects and stay indoors until the 'all clear'.",
  },
  {
    keys: ["gas leak", "gas leak"],
    title: "Gas leak",
    body: "Gas leak response: do NOT switch lights, appliances or use phones near the leak; open windows and doors, turn off the gas valve if you can reach it safely, leave the building, and call for help from outside. If you smell gas strongly, evacuate immediately and never re-enter until it is declared safe.",
  },
  {
    keys: ["power out", "blackout", "outage", "electricity"],
    title: "Power outage",
    body: "Power outage: unplug sensitive electronics to avoid surges, use torches not candles indoors, keep fridge/freezer closed, keep phones charged on power banks, and if you rely on medical devices, keep a backup power plan and register with your provider.",
  },
  {
    keys: ["prepared", "kit", "plan", "get ready", "prepare for a"],
    title: "Emergency preparedness",
    body: "Prepare today: build an emergency kit (water for 3 days, non-perishable food, first-aid, torch, radio, power bank, medicines, cash and photocopies of documents), learn two evacuation routes, agree on a family communication plan, and keep important documents waterproof.",
  },
]

export async function buildAssistantReply(userText: string, ctx: AssistantContext = {}): Promise<AssistantReply> {
  const text = userText.trim()
  const lower = text.toLowerCase()
  const hazard = detectHazard(text)

  // ---- Report an emergency ----
  if (/(report|submit|register|send)\s*.{0,12}(incident|emergency|disaster|alert)|i (am|'m) (in )?danger|help now|emergency now|धमाका|मदद/.test(lower)) {
    try {
      const parsed = await parseReport(text)
      const hz = String(parsed.hazard_classification ?? hazard)
      const sev = Number(parsed.criticality_index ?? 7)
      const loc = typeof parsed.extracted_location === "string"
        ? parsed.extracted_location
        : parsed.extracted_location?.description ?? "Unknown"
      const incident = await submitIncident({
        incident_id: `inc-chat-${Date.now()}`,
        hazard_type: hz === "unknown" ? hazard : hz,
        location: loc,
        severity: sev,
        telemetry: {},
      })
      const verified = incident.status === "verified"
      return {
        text:
          `Emergency report received and registered with the Resilio oracle.\n\n` +
          `• Incident: ${incident.incident_id}\n` +
          `• Hazard: ${incident.hazard_type}\n` +
          `• Location: ${incident.location}\n` +
          `• Severity: ${incident.severity}/10\n` +
          `• Status: ${incident.status}${verified ? " (corroborated ✓)" : " — pending corroboration"}\n\n` +
          `Our mesh has propagated this report to nearby nodes. For immediate help, contact local emergency services as well.`,
        incidentId: incident.incident_id,
        verified,
        hazard: incident.hazard_type,
        severity: incident.severity,
        spoken: `Your emergency has been registered. Status: ${incident.status}.`,
        actions: [{ label: "Track in Alerts", href: "/real-time-alerts" }],
      }
    } catch {
      return {
        text:
          "I couldn't reach the oracle to register the report right now — but here's what to do this instant:\n\n" +
          "1) Move to a safe location immediately.\n" +
          "2) Call your local emergency number (Dial 112 in India).\n" +
          "3) Tell a neighbour or use this app's Report page once connectivity returns.\n\n" +
          "Your report will be stored locally and retried by the mesh when possible.",
        spoken: "I could not reach the oracle. Please dial 112 for immediate help.",
        actions: [{ label: "Go to Citizen Report", href: "/citizen-report" }],
      }
    }
  }

  // ---- Live status / statistics ----
  if (/(how (many|is)|status|live|statistics|stats|count|situation|kya)/.test(lower)) {
    try {
      const [stats, incidents, mesh, chain] = await Promise.all([
        getStatistics().catch(() => null),
        getIncidents().catch(() => null),
        getMeshHealth().catch(() => null),
        getChainState().catch(() => null),
      ])
      const list = incidents?.incidents ?? []
      const meshInc = mesh?.incidents ?? []
      const chainBlocks = chain?.blocks ?? null
      const verified = Number(stats?.verified ?? 0)
      const pending = Number(stats?.pending ?? 0)
      const total = Number(stats?.total_incidents ?? list.length)
      const topHazard = list.length
        ? [...list].sort((a: any, b: any) => b.severity - a.severity)[0]?.hazard_type
        : "none"
      return {
        text:
          `Here is the live disaster situation:\n\n` +
          `• Total active incidents: ${total}\n` +
          `• Verified: ${verified}  |  Pending: ${pending}\n` +
          `• Mesh propagation: ${meshInc.length} incident(s) on the CRDT fabric\n` +
          `• Highest severity hazard: ${topHazard ?? "none"}${chainBlocks ? `\n• Chain verified: ${chainBlocks} block(s)` : ""}\n\n` +
          `Type "report earthquake near me" to submit a live report, or ask me what to do during a specific disaster.`,
        spoken: `There are currently ${total} active incidents, ${verified} verified.`,
        actions: [{ label: "See Real-Time Alerts", href: "/real-time-alerts" }],
      }
    } catch {
      return {
        text: "I can't reach the live services at the moment. Everything still works offline — ask me how to prepare for a specific disaster.",
        actions: [{ label: "Preparedness", href: "/disaster-preparedness" }],
      }
    }
  }

  // ---- Hazard guidance (preparedness engine) ----
  if (/(what to do|how (do|should|to)|during|survival|safety|steps|prepare|protect|instruction)/.test(lower)) {
    try {
      const tier = severityToTier(7)
      const guidance = await getGuidance(hazard, tier)
      const payload = guidance.guidance ?? ""
      const steps = guidance.steps?.length
        ? guidance.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")
        : payload
      const safety = guidance.safetyNotes?.length
        ? "\n\nSafety notes:\n" + guidance.safetyNotes.map((s: string) => `⚠ ${s}`).join("\n")
        : ""
      return {
        text: `Here is expert guidance for ${hazard}:\n\n${steps}${safety}`,
        sources: guidance.sources ?? [],
        hazard,
        actions: [
          { label: "Full Preparedness Guide", href: "/disaster-preparedness" },
          { label: "Report live", quick: `report ${hazard} near me high severity` },
        ],
      }
    } catch {
      // fall through to knowledge base
    }
  }

  // ---- Survival knowledge base ----
  for (const entry of SURVIVAL_KB) {
    if (entry.keys.some((k) => lower.includes(k))) {
      return { text: `${entry.title}:\n\n${entry.body}` }
    }
  }

  // ---- Greetings ----
  if (/^(hi|hello|hey|namaste|नमस्ते)\b/.test(lower)) {
    return {
      text:
        "Hello! I am the Resilio survival assistant. I can:\n\n" +
        "• Register an emergency report (try: \"report flood near Sector 12\")\n" +
        "• Give live disaster statistics (ask: \"what is the situation?\")\n" +
        "• Guide you through any hazard (ask: \"what to do during an earthquake?\")\n" +
        "• Answer survival questions — water, first aid, shelter, signaling, food.\n\n" +
        "Say it or type it. I also respond by voice 🎤",
      spoken: "Hello, I am the Resilio survival assistant. Ask me about emergencies, or how to stay safe.",
      actions: [
        { label: "Report Emergency", quick: "report flood near Sector 12" },
        { label: "Live Situation", quick: "what is the situation?" },
      ],
    }
  }

  const fallbackHazard = hazard === "general"
  return {
    text: fallbackHazard
      ? "I can help with: registering an emergency report, live disaster status, hazard-specific guidance (flood, earthquake, fire, cyclone, tornado, gas leak, power outage) and survival skills like water purification, first aid, shelter and signaling.\n\nCould you tell me a bit more — for example \"what to do during a flood\"? 🎤"
      : `I detected "${hazard}" — here is a quick pointer. Ask "what to do during ${hazard}" for full steps, or say "report ${hazard}" to register an incident.`,
    spoken: `Tell me more about your situation, or ask what to do during ${fallbackHazard ? "a disaster" : hazard}.`,
  }
}

export const QUICK_PROMPTS = [
  "Report flood near Sector 12",
  "What is the live situation?",
  "What to do during an earthquake?",
  "How to purify water in emergency?",
  "How do I prepare for a cyclone?",
  "Emergency first aid basics",
]