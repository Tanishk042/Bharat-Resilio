"""
Bharat Resilio — Consolidated ML Service (FastAPI).

Serves every from-scratch model on one port (default 8000) with path-based
routes that match the frontend API contract:

    POST /predict         MultiTaskHazard severity + tier
    POST /route           EdgeWeightPredictor evacuation routing
    GET  /graph/info      road graph metadata
    POST /detect/hazard   EdgeVisionDetector grid detection
    POST /parse           DeX-LLM text -> structured incident JSON
    POST /redact          deterministic PII redaction
    POST /guidance        Preparedness retrieval + generator
    GET  /stats           preparedness stats
    POST /acoustic/predict Bedwum waveform classification
    GET  /health

Every endpoint degrades to a deterministic fallback when its checkpoint is
missing, so the frontend never breaks during cold start.
"""

import base64
import os
import re
import threading
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS_DIR = os.path.join(SERVICE_DIR, "weights")
MODELS_DIR = os.path.join(SERVICE_DIR, "models")
PORT = int(os.environ.get("ML_PORT", "8000"))


class ModelManager:
    """Lazy checkpoint loader with thread-safe cache."""

    def __init__(self):
        self._lock = threading.Lock()
        self._cache: Dict[str, Any] = {}

    def available(self, name: str) -> bool:
        return os.path.exists(os.path.join(WEIGHTS_DIR, f"{name}.pt"))

    def get(self, name: str) -> Optional[Dict[str, Any]]:
        cache_key = name
        with self._lock:
            if cache_key in self._cache:
                return self._cache[cache_key]
            if not self.available(name):
                return None
            import sys
            sys.path.insert(0, SERVICE_DIR)
            import importlib
            try:
                ckpt = torch.load(os.path.join(WEIGHTS_DIR, f"{name}.pt"), map_location="cpu")
                model = self._build(name, ckpt)
                if model is not None:
                    model.load_state_dict(ckpt["state_dict"])
                    model.eval()
                info = {"model": model, **ckpt}
                self._cache[cache_key] = info
                return info
            except Exception as exc:  # non-fatal: fallback paths remain
                print(f"[ml] failed to load {name}: {exc}")
                self._cache[cache_key] = None
                return None

    @staticmethod
    def _build(name: str, ckpt: Dict[str, Any]):
        import sys
        sys.path.insert(0, MODELS_DIR)
        if name == "bedwum":
            from bedwum import BedwumCNN
            return BedwumCNN()
        if name == "hazard":
            from hazard import MultiTaskHazard, SENSOR_INPUT
            return MultiTaskHazard(input_dim=SENSOR_INPUT)
        if name == "edge_vision":
            from edge_vision import EdgeVisionDetector, GRID, NUM_CLASSES, NUM_ANCHORS
            return EdgeVisionDetector(grid=GRID, num_classes=NUM_CLASSES, num_anchors=NUM_ANCHORS)
        if name == "gnn_router":
            from gnn_router import EdgeWeightPredictor
            return EdgeWeightPredictor(node_features=3, edge_features=3)
        if name == "dex_llm":
            from dex_llm import DeXTransformer, CharVocab
            vocab = CharVocab([""])
            vocab.char2idx = ckpt.get("char2idx", {})
            return DeXTransformer(vocab_size=vocab.vocab_size, max_len=ckpt.get("max_len", 80))
        if name == "preparedness":
            from preparedness import PreparednessGenerator
            from dex_llm import CharVocab
            vocab = CharVocab([""])
            vocab.char2idx = ckpt.get("char2idx", {})
            return PreparednessGenerator(vocab_size=vocab.vocab_size, max_len=ckpt.get("max_len", 96))
        return None


manager = ModelManager()

app = FastAPI(
    title="Bharat Resilio ML Service",
    description="From-scratch custom models: CNN, multi-task hazard, grid vision, GNN routing, DeX-LLM, preparedness.",
    version="1.0.0",
)


# ============================================================
# CORS (needed when frontend hits the ML service directly)
# ============================================================

from fastapi.middleware.cors import CORSMiddleware

_CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "*").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


# ============================================================
# Request / response models
# ============================================================

class HazardRequest(BaseModel):
    seismic_magnitude: float = 0.0
    seismic_frequency: float = 0.0
    barometric_pressure: float = 1013.25
    barometric_trend: float = 0.0
    water_level: float = 0.0
    water_flow_rate: float = 0.0
    wind_speed: float = 0.0
    temperature: float = 20.0
    audio_anomaly_weight: float = 0.0
    precipitation: float = 0.0


class RouteRequest(BaseModel):
    start_node: int = Field(0)
    goal_node: int = Field(63)
    node_features: Optional[List[List[float]]] = None
    edge_features: Optional[List[List[float]]] = None
    hazard_zones: Optional[List[int]] = None


class DetectHazardRequest(BaseModel):
    image_b64: str = Field("")
    confidence_threshold: float = Field(0.35)


class ParseRequest(BaseModel):
    text: str = Field("", min_length=1, max_length=10000)
    use_llm: bool = True


class RedactRequest(BaseModel):
    text: str = Field("", min_length=1, max_length=10000)


class GuidanceRequest(BaseModel):
    hazard_type: str = "general"
    tier: str = "Moderate"
    zone_id: str = "default"


class AcousticRequest(BaseModel):
    samples: List[float] = Field([], max_length=16000)
    sample_rate: int = 16000


# ============================================================
# Health
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models": {
            m: manager.available(m) for m in
            ("bedwum", "hazard", "edge_vision", "gnn_router", "dex_llm", "preparedness")
        },
        "port": PORT,
    }


# ============================================================
# Hazard predict
# ============================================================

TIER_NAMES = ["MINIMAL", "WARNING", "CATASTROPHIC"]


def _sensor_vector(req: HazardRequest) -> np.ndarray:
    """Normalize the 10-field sensor payload into the model's 5 raw channels."""
    seismic = max(0.0, req.seismic_magnitude * 2.0 + req.seismic_frequency * 0.4)
    baro = max(0.0, (1013.25 - req.barometric_pressure) * 2.0 + abs(req.barometric_trend) * 4.0)
    hydro = req.water_level * 3.0 + req.water_flow_rate * 1.5 + req.precipitation * 0.5
    audio = req.audio_anomaly_weight * 3.0
    temp = max(0.0, (req.temperature - 15.0) / 10.0)
    return np.clip([seismic, baro, hydro, audio, temp], 0, 3).astype(np.float32)


@app.post("/predict")
def predict_hazard(req: HazardRequest):
    info = manager.get("hazard")
    vector = _sensor_vector(req)
    if info is None or info["model"] is None:
        # Deterministic fallback: severity from normalized channels
        severity = np.clip(np.mean(vector) / 3.0, 0.05, 0.95)
        tier = 0 if severity < 0.4 else (1 if severity < 0.7 else 2)
        return {
            "severity_score": round(float(severity) * 10, 2),
            "danger_tier": tier,
            "tier_name": TIER_NAMES[tier],
            "confidence": round(0.6 + severity * 0.3, 3),
            "model": "fallback",
        }
    model = info["model"]
    with torch.no_grad():
        severity, tier_logits = model(torch.from_numpy(vector).unsqueeze(0))
        prob = torch.softmax(tier_logits, dim=1)
        tier = int(prob.argmax(dim=1).item())
        severity_val = float(torch.clamp(severity, 0, 1).item())
    return {
        "severity_score": round(severity_val * 10, 2),
        "danger_tier": tier,
        "tier_name": TIER_NAMES[tier],
        "confidence": round(float(prob[0, tier].item()), 3),
        "model": "hazard_multi_task",
    }


# ============================================================
# Routing
# ============================================================

ROWS, COLS = 8, 8
NODES = ROWS * COLS


def _build_graph():
    import sys
    sys.path.insert(0, MODELS_DIR)
    from gnn_router import make_road_graph
    return make_road_graph(rows=ROWS, cols=COLS)


def _dijkstra_full(adj: np.ndarray, cost: np.ndarray, start: int, goal: int):
    n = adj.shape[0]
    dist = np.full(n, np.inf)
    prev = np.full(n, -1, dtype=int)
    visited = np.zeros(n, dtype=bool)
    dist[start] = 0.0
    for _ in range(n):
        u = -1
        best = np.inf
        for i in range(n):
            if not visited[i] and dist[i] < best:
                best = dist[i]
                u = i
        if u == -1 or u == goal:
            break
        visited[u] = True
        for v in range(n):
            if adj[u, v] > 0 and not visited[v]:
                nd = dist[u] + cost[u, v]
                if nd < dist[v]:
                    dist[v] = nd
                    prev[v] = u
    path = []
    cur = goal
    if dist[goal] == np.inf:
        return [], float("inf")
    while cur != -1:
        path.append(int(cur))
        cur = int(prev[cur])
    path.reverse()
    return path, float(dist[goal])


@app.post("/route")
def route(req: RouteRequest):
    adj, eff, pos = _build_graph()
    n = adj.shape[0]
    start = max(0, min(req.start_node, n - 1))
    goal = max(0, min(req.goal_node, n - 1))

    info = manager.get("gnn_router")
    gnn_available = info is not None and info["model"] is not None

    # base cost from graph edge features [congestion, hazard, base_weight]
    base = np.where(adj > 0, 1.0 + eff[:, :, 0], 0.0)

    # hazard zone penalty
    hazard_penalty = np.zeros((n, n))
    if req.hazard_zones:
        for z in req.hazard_zones:
            z = max(0, min(z, n - 1))
            if z == start or z == goal:
                continue
            for v in range(n):
                if adj[z, v] > 0:
                    hazard_penalty[z, v] += 3.0
                    hazard_penalty[v, z] += 3.0

    if gnn_available:
        model = info["model"]
        try:
            with torch.no_grad():
                adj_t = torch.from_numpy(adj).float()
                eff_t = torch.from_numpy(eff).float()
                hpos = torch.from_numpy(np.array([3.5, 3.5], dtype=np.float32))
                pred = model(adj_t, eff_t, hpos)  # (E, 2)
                src_idx, dst_idx = np.nonzero(adj)
                gnn_cost = base.copy()
                for k, (i, j) in enumerate(zip(src_idx, dst_idx)):
                    cong = float(pred[k, 0])
                    haz = float(pred[k, 1])
                    gnn_cost[i, j] = base[i, j] + 2.0 * cong + 4.0 * haz
                gnn_cost += hazard_penalty
                path, cost = _dijkstra_full(adj, gnn_cost, start, goal)
                if path:
                    return {
                        "path": path,
                        "cost": round(float(cost), 3),
                        "routing_mode": "gnn",
                        "density": 0.85,
                        "gnn_available": True,
                    }
        except Exception as exc:
            print(f"[ml] gnn route failed, falling back: {exc}")
            gnn_available = False

    cost = base + hazard_penalty
    path, total = _dijkstra_full(adj, cost, start, goal)
    return {
        "path": [] if not path else path,
        "cost": round(total, 3),
        "routing_mode": "fallback",
        "density": 0.2,
        "gnn_available": gnn_available,
    }


@app.get("/graph/info")
def graph_info():
    adj, _, _ = _build_graph()
    return {
        "num_nodes": NODES,
        "num_edges": int((adj > 0).sum() // 2),
        "rows": ROWS,
        "cols": COLS,
        "density_threshold": 0.4,
    }


# ============================================================
# Edge vision detection
# ============================================================

CLASS_NAMES = {0: "rubble", 1: "person", 2: "vehicle"}


def _decode_b64_image(image_b64: str) -> Optional[np.ndarray]:
    if not image_b64:
        return None
    try:
        if image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]
        raw = base64.b64decode(image_b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        if arr.size >= 3 * 64 * 64:
            img = arr[: 3 * 64 * 64].reshape(3, 64, 64).astype(np.float32) / 255.0
            return img
    except Exception:
        return None
    return None


@app.post("/detect/hazard")
def detect_hazard(req: DetectHazardRequest):
    info = manager.get("edge_vision")
    threshold = max(0.05, min(req.confidence_threshold, 0.95))
    if info is None or info["model"] is None:
        return {"detections": [], "model": "fallback", "note": "weights unavailable"}
    img = _decode_b64_image(req.image_b64)
    if img is None:
        raise HTTPException(status_code=400, detail="Valid 64x64 RGB base64 image required (b64 of raw 64*64*3 bytes)")

    model = info["model"]
    with torch.no_grad():
        pred = model(torch.from_numpy(img).unsqueeze(0))  # (B,G,G,A,D)
        out = pred[0]  # (G,G,A,D)
    detections = []
    g = out.shape[0]
    for gy in range(g):
        for gx in range(g):
            for a in range(out.shape[2]):
                obj = float(torch.sigmoid(out[gy, gx, a, 4]))
                if obj < threshold:
                    continue
                cls_logits = out[gy, gx, a, 5:]
                cls = int(cls_logits.argmax().item())
                cx = float(torch.sigmoid(out[gy, gx, a, 0])) * (gx + 0.5) / g
                cy = float(torch.sigmoid(out[gy, gx, a, 1])) * (gy + 0.5) / g
                w = min(float(torch.relu(out[gy, gx, a, 2])), 1.0)
                h = min(float(torch.relu(out[gy, gx, a, 3])), 1.0)
                detections.append({
                    "class": CLASS_NAMES.get(cls, "unknown"),
                    "class_id": cls,
                    "confidence": round(obj, 3),
                    "bbox": {"x": round(cx, 4), "y": round(cy, 4), "w": round(w, 4), "h": round(h, 4)},
                })
    detections.sort(key=lambda d: -d["confidence"])
    return {"detections": detections[:10], "count": len(detections), "threshold": threshold, "model": "edge_vision"}


# ============================================================
# DeX-LLM parse + redaction
# ============================================================

_COORD_RE = re.compile(r"\b\d{1,3}\.\d+,\s*\d{1,3}\.\d+\b")
_PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b")
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_OPCODE_RE = re.compile(r"\b(?:OP-[A-Z]\w*|CODENAME-\w+)\b")


def redact_text(text: str) -> Tuple[str, Dict[str, List[str]], bool]:
    log: Dict[str, List[str]] = {}
    red = text
    patches = [
        ("gps_coordinates", _COORD_RE),
        ("phone_numbers", _PHONE_RE),
        ("email_addresses", _EMAIL_RE),
        ("operational_codes", _OPCODE_RE),
    ]
    for category, pattern in patches:
        matches = pattern.findall(red)
        if matches:
            log[category] = matches
        red = pattern.sub(f"[REDACTED_{category.upper()}]", red)
    return red, log, len(log) > 0


def _vocab_from_ckpt(ckpt: Dict[str, Any]):
    import sys
    sys.path.insert(0, MODELS_DIR)
    from dex_llm import CharVocab
    vocab = CharVocab([""])
    char2idx = dict(ckpt.get("char2idx") or {})
    saved = ckpt.get("idx2char")
    idx2char: Dict[int, str] = {}
    if isinstance(saved, dict):
        for k, v in saved.items():
            if isinstance(k, int) and isinstance(v, str):
                idx2char[k] = v
            elif isinstance(k, str):
                try:
                    idx2char[int(v)] = k
                except (ValueError, TypeError):
                    pass
            elif isinstance(v, str):
                try:
                    idx2char[int(k)] = v
                except (ValueError, TypeError):
                    pass
            else:
                idx2char[k] = str(v)
    for k, v in char2idx.items():
        if isinstance(v, str):
            try:
                idx2char.setdefault(int(k), v)
            except (ValueError, TypeError):
                pass
    vocab.char2idx = char2idx
    vocab.idx2char = idx2char
    return vocab


def _rule_parse(text: str) -> Dict[str, Any]:
    lowered = text.lower()
    hazard = "unknown"
    if any(k in lowered for k in ("fire", "burn", "flame", "wildfire")):
        hazard = "fire"
    elif any(k in lowered for k in ("flood", "water", "drown", "inundat")):
        hazard = "flood"
    elif any(k in lowered for k in ("earthquake", "quake", "tremor", "seismic")):
        hazard = "earthquake"
    elif any(k in lowered for k in ("landslide", "slide", "mudslide", "avalanche")):
        hazard = "landslide"
    else:
        storm = next((k for k in ("tornado", "cyclone", "hurricane", "typhoon", "storm") if k in lowered), None)
        if storm:
            hazard = {"tornado": "tornado", "cyclone": "cyclone", "hurricane": "cyclone", "typhoon": "cyclone", "storm": "storm"}[storm]
        elif any(k in lowered for k in ("leak", "gas", "chemical", "spill", "hazmat")):
            hazard = "chemical_spill"
        elif any(k in lowered for k in ("bridge", "collapse", "building")):
            hazard = "bridge_collapse"
        elif any(k in lowered for k in ("medical", "casualt", "injur", "rescue")):
            hazard = "medical"
        elif any(k in lowered for k in ("power", "outage", "electric")):
            hazard = "power_outage"

    location = _rule_location(text)
    criticality = 3 if hazard == "unknown" else 6
    if any(k in lowered for k in ("emergency", "critical", "severe", "catastrophic", "urgent")):
        criticality = 9
    return {
        "hazard_classification": hazard,
        "extracted_location": {"description": location, "formatted": location},
        "criticality_index": criticality,
        "description_summary": text[:200] + ("..." if len(text) > 200 else ""),
        "confidence": 0.55,
        "source": "rule-based",
    }


_FILLER_WORDS = {"the", "a", "an", "of", "on", "at", "in", "near", "around", "along", "off"}
_PREP_SEARCH = re.compile(r"(?<![A-Za-z])(?:\bnear\b|\bat\b|\bin\b|\baround\b)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*)?)", re.IGNORECASE)


def _rule_location(text: str) -> str:
    m = _PREP_SEARCH.search(text)
    if not m:
        return "Unknown"
    tokens = m.group(1).split()
    parts = []
    for tok in tokens:
        if tok.lower() in _FILLER_WORDS and parts:
            break
        parts.append(tok.capitalize())
        if len(parts) >= 2:
            break
    return " ".join(parts) if parts else m.group(1).capitalize()


@app.post("/parse")
def parse_report(req: ParseRequest):
    text = req.text.strip()
    red, log, has_sensitive = redact_text(text)
    info = manager.get("dex_llm")
    parsed: Optional[Dict[str, Any]] = None

    if info is not None and info["model"] is not None and req.use_llm:
        import sys
        sys.path.insert(0, MODELS_DIR)
        from dex_llm import SOS, EOS
        model = info["model"]
        vocab = _vocab_from_ckpt(info)
        max_len = int(info.get("max_len", 80))
        with torch.no_grad():
            src = torch.tensor([vocab.encode(red[:max_len - 2], max_len)])
            out = model.generate(src, max_len=max_len, sos_token=SOS, eos_token=EOS)
        decoded = vocab.decode(out[0])
        import sys as _s
        import importlib
        mod = importlib.import_module("dex_llm")
        parsed_json = mod.parse_output(decoded)
        if parsed_json:
            type_to_hazard = {
                "fire": "fire", "earthquake": "earthquake", "flood": "flood",
                "bridge_collapse": "bridge_collapse", "medical": "medical",
                "gas_leak": "gas_leak", "landslide": "landslide",
                "power_outage": "power_outage", "tornado": "tornado",
                "chemical_spill": "chemical_spill",
            }
            sev_to_idx = {"Low": 3, "Moderate": 5, "High": 7, "Catastrophic": 9}
            loc = parsed_json.get("location", "Unknown")
            parsed = {
                "hazard_classification": type_to_hazard.get(parsed_json.get("type", ""), "unknown"),
                "extracted_location": {"description": loc, "formatted": loc},
                "criticality_index": sev_to_idx.get(parsed_json.get("severity", ""), 5),
                "description_summary": text[:200] + ("..." if len(text) > 200 else ""),
                "confidence": 0.9,
                "source": "dex-llm",
            }

    if parsed is None:
        parsed = _rule_parse(text)

    return {
        **parsed,
        "redacted_text": red,
        "redaction_log": log,
        "has_sensitive_info": has_sensitive,
        "original_text_length": len(text),
        "redacted_text_length": len(red),
    }


@app.post("/redact")
def redact(req: RedactRequest):
    red, log, has_sensitive = redact_text(req.text.strip())
    return {
        "redacted_text": red,
        "redaction_log": log,
        "has_sensitive_info": has_sensitive,
        "original_text_length": len(req.text),
        "redacted_text_length": len(red),
    }


# ============================================================
# Preparedness guidance + stats
# ============================================================

@app.post("/guidance")
def guidance(req: GuidanceRequest):
    import sys
    sys.path.insert(0, MODELS_DIR)
    from preparedness import PreparednessEngine
    engine = PreparednessEngine()
    query = _guidance_query(req.hazard_type)
    result = engine.generate_instruction(query)
    steps = result.get("steps", [])
    safety = result.get("safetyNotes", [])
    lines = []
    for i, s in enumerate(steps[:5], 1):
        lines.append(f"{i}. {s}")
    for s in safety[:3]:
        lines.append(f"⚠ {s}")
    guidance_text = "\n".join(lines) if lines else _static_guidance(req.hazard_type)
    return {
        "guidance": guidance_text,
        "sources": result.get("sources", []),
        "steps": steps,
        "safetyNotes": safety,
        "confidence": result.get("confidence", 0.8),
        "topic": result.get("topic", query),
        "model": "preparedness_hybrid",
    }


def _guidance_query(hazard_type: str) -> str:
    mapping = {
        "earthquake": "What should I do during an earthquake?",
        "flood": "How do I prepare for a flood?",
        "fire": "What to do in case of fire?",
        "tornado": "Tornado safety instructions?",
        "chemical_spill": "How to handle chemical spills?",
        "gas_leak": "Gas leak safety measures?",
        "power_outage": "Power outage preparedness?",
        "landslide": "Landslide danger response?",
        "medical": "Medical emergency first aid?",
        "bridge_collapse": "Building collapse survival?",
        "general": "What are the steps for emergency preparedness?",
    }
    return mapping.get(hazard_type, mapping["general"])


def _static_guidance(hazard_type: str) -> str:
    text = {
        "earthquake": "1. Drop, cover and hold on.\n2. Move away from windows and heavy furniture.\n3. Do not use elevators.",
        "flood": "1. Move to higher ground immediately.\n2. Do not walk or drive through flood waters.\n3. Keep emergency supplies ready.",
        "fire": "1. Crawl low under smoke.\n2. Feel doors before opening.\n3. Use stairs, not elevators.",
        "general": "1. Prepare an emergency kit.\n2. Know two evacuation routes.\n3. Have a communication plan.",
    }
    return text.get(hazard_type, text["general"])


@app.get("/stats")
def stats():
    import sys
    sys.path.insert(0, MODELS_DIR)
    from preparedness import EMERGENCY_MANUAL_SNIPPETS
    return {
        "snippets": len(EMERGENCY_MANUAL_SNIPPETS),
        "guidance_entries": len(EMERGENCY_MANUAL_SNIPPETS),
        "engine": "tfidf+generator",
        "total_snippets": len(EMERGENCY_MANUAL_SNIPPETS),
    }


# ============================================================
# Acoustic (Bedwum)
# ============================================================

@app.post("/acoustic/predict")
def acoustic_predict(req: AcousticRequest):
    samples = np.asarray(req.samples, dtype=np.float32)
    if samples.size != 16000:
        raise HTTPException(status_code=400, detail="Expected 16000 samples (1 second @ 16kHz)")
    info = manager.get("bedwum")
    if info is None or info["model"] is None:
        # heuristic fallback: energy + zero-crossing burstiness
        energy = float(np.mean(samples ** 2))
        peaks = float(np.mean(np.abs(np.diff(samples)) > 0.3))
        prob = min(1.0, 0.15 + energy * 30.0 + peaks * 0.5)
        return {"confidence": round(prob, 4), "is_hazard": prob >= 0.6, "threshold": 0.6, "model": "fallback"}
    model = info["model"]
    with torch.no_grad():
        x = torch.from_numpy(samples).unsqueeze(0)
        logit = model(x)
        prob = float(torch.sigmoid(logit).item())
    return {"confidence": round(prob, 4), "is_hazard": prob >= 0.6, "threshold": 0.6, "model": "bedwum"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)