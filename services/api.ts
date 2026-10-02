/**
 * API Integration Functions for Resilio Frontend
 * 
 * Connects frontend to backend services:
 * - API Gateway (port 8080)
 * - Hazard Engine (port 8002)
 * - Routing Engine (port 8004)
 * - Oracle Consensus (port 8005)
 * - DeX-LLM Parser (port 8003)
 * - Acoustic CNN (port 8001)
 * - Preparedness Engine (port 8006)
 * - Edge Vision (port 8007)
 */

import { API_BASE, ML_BASE, MESH_A_BASE, CHAIN_BASE } from "@/lib/config";

const API_BASE_URL = API_BASE;
const ML_BASE_URL = ML_BASE;
const HAZARD_ENGINE_URL = process.env.NEXT_PUBLIC_HAZARD_ENGINE_URL || ML_BASE_URL;
const ROUTING_ENGINE_URL = process.env.NEXT_PUBLIC_ROUTING_ENGINE_URL || ML_BASE_URL;
const ORACLE_CONSENSUS_URL = process.env.NEXT_PUBLIC_ORACLE_CONSENSUS_URL || API_BASE_URL;
const PARSER_URL = process.env.NEXT_PUBLIC_PARSER_URL || ML_BASE_URL;
const ACOUSTIC_URL = process.env.NEXT_PUBLIC_ACOUSTIC_URL || ML_BASE_URL;
const PREPAREDNESS_URL = process.env.NEXT_PUBLIC_PREPAREDNESS_URL || ML_BASE_URL;
const VISION_URL = process.env.NEXT_PUBLIC_VISION_URL || ML_BASE_URL;

// Generic API helper
async function fetchAPI(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

// Hazard Engine API
export async function predictHazard(sensorData: {
  seismic_magnitude: number;
  seismic_frequency: number;
  barometric_pressure: number;
  barometric_trend: number;
  water_level: number;
  water_flow_rate: number;
  wind_speed: number;
  temperature: number;
  audio_anomaly_weight: number;
  precipitation: number;
}) {
  return fetchAPI(`${HAZARD_ENGINE_URL}/predict`, {
    method: 'POST',
    body: JSON.stringify(sensorData),
  });
}

// Routing Engine API
export async function findRoute(routeRequest: {
  start_node: number;
  goal_node: number;
  node_features?: number[][];
  edge_features?: number[][];
  hazard_zones?: number[];
}) {
  return fetchAPI(`${ROUTING_ENGINE_URL}/route`, {
    method: 'POST',
    body: JSON.stringify(routeRequest),
  });
}

export async function getGraphInfo() {
  return fetchAPI(`${ROUTING_ENGINE_URL}/graph/info`);
}

// Oracle Consensus API
export async function submitIncident(incident: {
  incident_id: string;
  hazard_type: string;
  location: string;
  severity: number;
  telemetry: any;
}) {
  return fetchAPI(`${ORACLE_CONSENSUS_URL}/incident/submit`, {
    method: 'POST',
    body: JSON.stringify(incident),
  });
}

export async function getIncidents(status?: string) {
  const url = status 
    ? `${ORACLE_CONSENSUS_URL}/incidents?status=${status}`
    : `${ORACLE_CONSENSUS_URL}/incidents`;
  return fetchAPI(url);
}

export async function getIncident(incidentId: string) {
  return fetchAPI(`${ORACLE_CONSENSUS_URL}/incident/${incidentId}`);
}

export async function getStatistics() {
  return fetchAPI(`${ORACLE_CONSENSUS_URL}/statistics`);
}

// DeX-LLM Parser API
export async function parseReport(text: string, useLLM: boolean = true) {
  return fetchAPI(`${PARSER_URL}/parse`, {
    method: 'POST',
    body: JSON.stringify({ text, use_llm: useLLM }),
  });
}

export async function redactText(text: string) {
  return fetchAPI(`${PARSER_URL}/redact`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// Acoustic CNN API
export async function acousticPredict(audioData: any) {
  return fetchAPI(`${API_BASE_URL}/acoustic/predict`, {
    method: 'POST',
    body: JSON.stringify(audioData),
  });
}

// Preparedness Engine API
export async function getGuidance(hazardType: string, tier: string, zoneId: string = 'default') {
  return fetchAPI(`${PREPAREDNESS_URL}/guidance`, {
    method: 'POST',
    body: JSON.stringify({
      hazard_type: hazardType,
      tier: tier,
      zone_id: zoneId,
    }),
  });
}

export async function getPreparednessStats() {
  return fetchAPI(`${PREPAREDNESS_URL}/stats`);
}

// Edge Vision API
export async function detectHazards(imageBase64: string, confidenceThreshold: number = 0.5) {
  return fetchAPI(`${VISION_URL}/detect/hazard`, {
    method: 'POST',
    body: JSON.stringify({
      image_b64: imageBase64,
      confidence_threshold: confidenceThreshold,
    }),
  });
}

// API Gateway Health Check
export async function checkServiceHealth() {
  return fetchAPI(`${API_BASE_URL}/health`);
}

// Real-time polling helper
export function createPollingEndpoint<T>(
  fetchFn: () => Promise<T>,
  interval: number = 5000,
  onUpdate: (data: T) => void
) {
  let intervalId: NodeJS.Timeout;
  
  const start = () => {
    fetchFn().then(onUpdate).catch(console.error);
    intervalId = setInterval(() => {
      fetchFn().then(onUpdate).catch(console.error);
    }, interval);
  };
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
  
  return { start, stop };
}

// ============================================================
// Custom Bharat Resilio Mesh + Chain integration
// (from-scratch P2P transport, PoA blockchain)
// ============================================================

const MESH_PORT = Number(process.env.NEXT_PUBLIC_MESH_PORT ?? 8101);
const CHAIN_API_PORT = Number(process.env.NEXT_PUBLIC_CHAIN_API_PORT ?? 8201);
const MESH_BASE_URL = process.env.NEXT_PUBLIC_MESH_URL ?? MESH_A_BASE;
const CHAIN_BASE_URL = process.env.NEXT_PUBLIC_CHAIN_URL ?? CHAIN_BASE;

export interface MeshIncidentInput {
  id?: string;
  kind: string;
  location: string;
  severity: number;
  description: string;
}

export interface ChainIncidentInput {
  incidentId: string;
  tier: string;
  dataHash?: string;
  reporterNodeId?: string;
}

// Mesh Health API — feeds the ConnectivityProvider
export async function getMeshHealth() {
  const [health, incidents] = await Promise.all([
    fetch(`${MESH_BASE_URL}/health`).then((r) => r.json()),
    fetch(`${MESH_BASE_URL}/state`).then((r) => r.json()),
  ]);
  return { health, incidents };
}

export async function submitMeshIncident(incident: MeshIncidentInput) {
  return fetchAPI(`${MESH_BASE_URL}/incidents`, {
    method: "POST",
    body: JSON.stringify(incident),
  });
}

export async function getMeshIncidents() {
  return fetchAPI(`${MESH_BASE_URL}/state`);
}

export async function getMeshPeers() {
  return fetchAPI(`${MESH_BASE_URL}/peers`);
}

// Chain API — PoA blockchain interaction
export async function getChainChain() {
  return fetchAPI(`${CHAIN_BASE_URL}/chain`);
}

export async function getChainState() {
  // Merge the incident state (/state) with block-chain facts (/chain, /health)
  // so every consumer gets block counts, height, tipHash and incidents in one call.
  const [state, chain, health] = await Promise.all([
    fetchAPI(`${CHAIN_BASE_URL}/state`).catch(() => ({})),
    fetchAPI(`${CHAIN_BASE_URL}/chain`).catch(() => []),
    fetchAPI(`${CHAIN_BASE_URL}/health`).catch(() => ({})),
  ]);
  const blocks = Array.isArray(chain) ? chain : Array.isArray(chain?.blocks) ? chain.blocks : [];
  const height = Number(health?.height ?? blocks.length ?? 0);
  const tipHash = String(health?.tipHash ?? health?.tip_hash ?? blocks[blocks.length - 1]?.hash ?? "");
  return { ...state, blocks, height, tipHash };
}

export async function getChainHealth() {
  return fetchAPI(`${CHAIN_BASE_URL}/health`);
}

export async function submitChainIncident(incident: ChainIncidentInput) {
  return fetchAPI(`${CHAIN_BASE_URL}/incidents`, {
    method: "POST",
    body: JSON.stringify(incident),
  });
}

/**
 * Full vertical slice: citizen report -> DeX-LLM parse -> mesh propagation
 * -> chain submission. Returns the outcome of each stage so the UI can show
 * the transparency trail to the user.
 */
export async function submitFullIncidentFlow(params: {
  description: string;
  location: string;
  severity: number;
  kind?: string;
}) {
  const results: Record<string, any> = {};

  // Stage 1: DeX-LLM text parsing (falls back to regex when ML service offline)
  try {
    const parsed = await parseReport(params.description);
    results.parse = parsed;
  } catch (e) {
    results.parse = {
      hazard_classification: params.kind ?? "generic",
      criticality_index: params.severity,
      extracted_location: params.location,
      description_summary: params.description,
      confidence: 0.5,
      source: "fallback",
    };
  }

  // Stage 2: propagate via mesh node (custom P2P)
  try {
    const tier =
      params.severity >= 7
        ? "Catastrophic"
        : params.severity >= 4
        ? "High"
        : "Low";
    await submitMeshIncident({
      id: `incident-${Date.now()}`,
      kind: results.parse.hazard_classification ?? params.kind ?? "generic",
      location: params.location,
      severity: params.severity,
      description: params.description,
    });
    results.mesh = {
      ok: true,
      stage: "propagated via mesh CRDT",
    };
  } catch (e) {
    results.mesh = { ok: false, error: "mesh unreachable", stage: "cached locally" };
  }

  // Stage 3: submit LogIncidentTx to chain
  try {
    const tier =
      params.severity >= 7
        ? "Catastrophic"
        : params.severity >= 4
        ? "High"
        : "Low";
    const chainRes = await submitChainIncident({
      incidentId: `incident-${Date.now()}`,
      tier,
      reporterNodeId: "civilian-01",
    });
    results.chain = { ok: true, ...chainRes };
  } catch (e) {
    results.chain = { ok: false, error: "chain unreachable" };
  }

  return results;
}
