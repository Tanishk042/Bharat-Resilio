/**
 * Backend API — orchestration + gateway.
 *
 * Dependency-free (node:http, node:crypto, node:fs, node:url).
 * Serves on port 8080 (the frontend API_BASE_URL + oracle URL).
 *
 *   GET  /health                     service status
 *   GET  /openapi.json               OpenAPI 3.0 spec
 *   POST /auth/register              register {role, name, email, password}
 *   POST /auth/login                 login -> {token, user}
 *   GET  /auth/otp                   request OTP for {email}
 *   POST /auth/verify-otp            verify {email, otp} -> verified flag
 *   POST /acoustic/predict           proxy -> ML wave classifier
 *   GET  /incidents                  oracle: list  (?status=verified)
 *   GET  /incident/:id               oracle: single incident
 *   POST /incident/submit            oracle: submit + corroborate
 *   GET  /statistics                 oracle: aggregate stats
 *   GET  /mesh                       mesh snapshot (proxied)
 *   GET  /chain                      chain snapshot (proxied)
 *   WS   /events                     WSEventMap channels (incidents/alerts/oracle)
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.API_PORT ?? 8080);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const ML_URL = process.env.ML_URL ?? "http://127.0.0.1:8000";
const MESH_URL = process.env.MESH_URL ?? "http://127.0.0.1:8101";
const CHAIN_URL = process.env.CHAIN_URL ?? "http://127.0.0.1:8201";

const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "..", "..", "..", "..", "data");
const INCIDENTS_FILE = join(DATA_DIR, "oracle-incidents.json");
const USERS_FILE = join(DATA_DIR, "users.json");

// ============================================================
// Persisted stores
// ============================================================

export interface OracleIncident {
  incident_id: string;
  hazard_type: string;
  location: string;
  severity: number;
  status: "pending" | "verified" | "rejected";
  corroborations: number;
  telemetry: Record<string, number>;
  submitted_at: number;
  submitted_by?: string;
}

export interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  otp?: string;
  otp_expires_at?: number;
  otp_verified?: boolean;
}

function loadJson<T>(file: string, fallback: T): T {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function saveJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
}

function dirname(path: string): string {
  return path.slice(0, path.lastIndexOf("/") === 0 ? 1 : path.lastIndexOf("/"));
}

export class Store {
  incidents: Map<string, OracleIncident> = new Map();
  users: Map<string, User> = new Map();
  private incidentsFile: string;
  private usersFile: string;

  constructor(incidentsFile?: string, usersFile?: string) {
    this.incidentsFile = incidentsFile ?? INCIDENTS_FILE;
    this.usersFile = usersFile ?? USERS_FILE;
    const inc = loadJson<OracleIncident[]>(this.incidentsFile, []);
    for (const i of inc) this.incidents.set(i.incident_id, i);
    const users = loadJson<User[]>(this.usersFile, []);
    for (const u of users) this.users.set(u.email, u);
  }

  persist(): void {
    saveJson(this.incidentsFile, [...this.incidents.values()]);
    saveJson(this.usersFile, [...this.users.values()]);
  }

  // ---- incidents (oracle surface) ----
  submit(input: {
    incident_id: string;
    hazard_type: string;
    location: string;
    severity: number;
    telemetry?: Record<string, number>;
    submitted_by?: string;
  }): OracleIncident {
    const severity = Math.max(0, Math.min(10, input.severity));
    const existing = this.incidents.get(input.incident_id);
    const incident: OracleIncident =
      existing ??
      ({
        incident_id: input.incident_id,
        hazard_type: input.hazard_type,
        location: input.location,
        severity,
        status: "pending",
        corroborations: 0,
        telemetry: input.telemetry ?? {},
        submitted_at: Date.now(),
        submitted_by: input.submitted_by,
      } as OracleIncident);

    // Deterministic corroboration: shared hazard_type+location counts as a corroboration
    let corroborations = 0;
    for (const other of this.incidents.values()) {
      if (
        other.incident_id !== input.incident_id &&
        other.hazard_type === input.hazard_type &&
        other.location === input.location
      ) {
        corroborations += 1;
      }
    }
    // second submission of the same id is always a corroboration
    if (existing) corroborations += 1;
    incident.corroborations = corroborations;
    incident.status = corroborations >= 1 ? "verified" : "pending";
    incident.severity = severity;

    this.incidents.set(incident.incident_id, incident);
    this.persist();
    return incident;
  }

  list(status?: string): OracleIncident[] {
    const items = [...this.incidents.values()].sort((a, b) => b.submitted_at - a.submitted_at);
    if (status) return items.filter((i) => i.status === status);
    return items;
  }

  get(id: string): OracleIncident | undefined {
    return this.incidents.get(id);
  }

  // ---- auth ----
  register(input: { role: string; name: string; email: string; password: string }): User {
    const email = input.email.trim().toLowerCase();
    if (this.users.has(email)) throw new Error("already_registered");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(input.password, salt, 32).toString("hex");
    const user: User = {
      id: `user-${randomBytes(4).toString("hex")}`,
      role: input.role,
      name: input.name,
      email,
      salt,
      hash,
    };
    this.users.set(email, user);
    this.persist();
    return user;
  }

  verifyLogin(email: string, password: string): User | null {
    const user = this.users.get(email.trim().toLowerCase());
    if (!user) return null;
    const candidate = scryptSync(password, user.salt, 32);
    const expected = Buffer.from(user.hash, "hex");
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
    return user;
  }

  requestOtp(email: string): { otp: string; expiresIn: number } | null {
    const user = this.users.get(email.trim().toLowerCase());
    if (!user) return null;
    const otp = String(randomInt(100000, 999999));
    user.otp = otp;
    user.otp_expires_at = Date.now() + 10 * 60 * 1000;
    this.persist();
    return { otp, expiresIn: 600 };
  }

  verifyOtp(email: string, otp: string): boolean {
    const user = this.users.get(email.trim().toLowerCase());
    if (!user || !user.otp) return false;
    if (Date.now() > (user.otp_expires_at ?? 0)) return false;
    if (!timingSafeEqual(Buffer.from(user.otp), Buffer.from(otp))) return false;
    user.otp_verified = true;
    this.persist();
    return true;
  }
}

export const store = new Store();

// ============================================================
// WebSocket event map (WSEventMap)
// ============================================================

export type WsChannel = "incidents" | "alerts" | "oracle" | "mesh" | "chain";

export class WSEventMap {
  private clients = new Map<Duplex, WsChannel[]>();

  add(socket: Duplex, channels: WsChannel[]): void {
    this.clients.set(socket, channels);
    socket.on("close", () => this.clients.delete(socket));
    socket.on("error", () => this.clients.delete(socket));
  }

  emit(channel: WsChannel, payload: unknown): void {
    for (const [socket, channels] of this.clients) {
      if (!channels.includes(channel)) continue;
      sendJsonFrame(socket, { channel, data: payload, ts: Date.now() });
    }
  }
}

export const eventMap = new WSEventMap();

export function acceptWebSocket(request: IncomingMessage, socket: Duplex, head: Buffer): void {
  const key = request.headers["sec-websocket-key"];
  if (!key || Array.isArray(key)) {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n",
  ].join("\r\n"));
  if (head.length > 0) socket.unshift(head);

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const rawChannel = (url.searchParams.get("channel") ?? "incidents").toLowerCase();
  const channels = (rawChannel.split(",") as WsChannel[]).filter((c) =>
    ["incidents", "alerts", "oracle", "mesh", "chain"].includes(c)
  );
  eventMap.add(socket, channels.length ? channels : ["incidents"]);
}

export function sendJsonFrame(socket: Duplex, payload: unknown): void {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  let header: Buffer;
  if (body.length < 126) {
    header = Buffer.from([0x81, body.length]);
  } else {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
  }
  socket.write(Buffer.concat([header, body]));
}

// ============================================================
// HTTP helpers + upstream proxy
// ============================================================

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function upstream(path: string, base: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`${base}${path}`, { method: "GET", signal: AbortSignal.timeout(2500) });
    const body = await res.json();
    return { status: res.status, body };
  } catch (err) {
    return { status: 503, body: { error: "upstream_unreachable", detail: String(err) } };
  }
}

function backward(res: ServerResponse, status: number, body: unknown): void {
  if (status >= 400) {
    json(res, status, body);
    return;
  }
  json(res, 200, body);
}

const JWT_SECRET = process.env.JWT_SECRET ?? "bharat-resilio-api";

function issueToken(user: User): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, email: user.email, role: user.role, iat: Date.now() })
  ).toString("base64url");
  const sig = createHash("sha256")
    .update(`${header}.${payload}.${JWT_SECRET}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function verifyToken(token: string): { sub: string; email: string; role: string; iat: number } | null {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHash("sha256").update(`${header}.${payload}.${JWT_SECRET}`).digest("base64url");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub: string;
      email: string;
      role: string;
      iat: number;
    };
    if (!decoded.sub || !decoded.email) return null;
    return decoded;
  } catch {
    return null;
  }
}

function authUser(req: IncomingMessage): User | null {
  const auth = req.headers.authorization;
  const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = verifyToken(token);
  if (!claims) return null;
  const user = store.users.get(claims.email);
  return user && user.id === claims.sub ? user : null;
}

// ============================================================
// HTTP router
// ============================================================

export function startServer(): void {
  const corsOrigin = process.env.CORS_ORIGIN ?? "*";

  const server = createServer(async (req, res) => {
    // CORS: support browser-direct and preflight when calling this service directly
    res.setHeader("access-control-allow-origin", corsOrigin);
    res.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type,authorization,x-device-id,x-device-token");
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const method = req.method ?? "GET";
    const path = url.pathname;

    try {
      // ---- OpenAPI ----
      if (method === "GET" && path === "/openapi.json") {
        json(res, 200, openApiSpec());
        return;
      }

      // ---- health ----
      if (method === "GET" && path === "/health") {
        const ml = await upstream("/health", ML_URL);
        const mesh = await upstream("/health", MESH_URL);
        const chain = await upstream("/health", CHAIN_URL);
        json(res, 200, {
          status: "healthy",
          services: {
            ml: ml.status === 200 ? ml.body : null,
            mesh: mesh.status === 200 ? mesh.body : null,
            chain: chain.status === 200 ? chain.body : null,
          },
          incidents: store.list().length,
        });
        return;
      }

      // ---- auth ----
      if (method === "POST" && path === "/auth/register") {
        const body = await readBody(req);
        try {
          const user = store.register(body);
          const { salt, hash, otp, otp_expires_at, ...safe } = user;
          json(res, 201, { ok: true, token: issueToken(user), user: safe });
        } catch (err) {
          json(res, 409, { error: String(err) });
        }
        return;
      }

      if (method === "POST" && path === "/auth/login") {
        const body = await readBody(req);
        const user = store.verifyLogin(body.email ?? "", body.password ?? "");
        if (!user) {
          json(res, 401, { error: "invalid_credentials" });
          return;
        }
        const { salt, hash, otp, otp_expires_at, ...safe } = user;
        json(res, 200, { ok: true, token: issueToken(user), user: safe });
        return;
      }

      if (method === "GET" && path === "/auth/otp") {
        const email = String(url.searchParams.get("email") ?? "");
        const result = store.requestOtp(email);
        if (!result) {
          json(res, 404, { error: "not_found" });
          return;
        }
        json(res, 200, { ok: true, otp: result.otp, expires_in: result.expiresIn });
        return;
      }

      if (method === "POST" && path === "/auth/verify-otp") {
        const body = await readBody(req);
        const ok = store.verifyOtp(body.email ?? "", String(body.otp ?? ""));
        json(res, ok ? 200 : 400, ok ? { ok: true, verified: true } : { error: "invalid_otp" });
        return;
      }

      // ---- current session ----
      if (method === "GET" && path === "/auth/me") {
        const user = authUser(req);
        if (!user) {
          json(res, 401, { error: "unauthorized" });
          return;
        }
        const { salt, hash, otp, otp_expires_at, ...safe } = user;
        json(res, 200, { ok: true, user: safe });
        return;
      }

      // ---- acoustic proxy -> ML ----
      if (method === "POST" && path === "/acoustic/predict") {
        const body = await readBody(req);
        const res2 = await fetch(`${ML_URL}/acoustic/predict`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3000),
        });
        backward(res, res2.status, await res2.json());
        return;
      }

      // ---- oracle: incident endpoints ----
      if (method === "POST" && path === "/incident/submit") {
        const body = await readBody(req);
        const incident = store.submit({
          incident_id: String(body.incident_id ?? `inc-${Date.now()}`),
          hazard_type: String(body.hazard_type ?? "unknown"),
          location: String(body.location ?? "unknown"),
          severity: Number(body.severity ?? 5),
          telemetry: body.telemetry ?? {},
          submitted_by: body.submitted_by,
        });
        eventMap.emit("incidents", incident);
        eventMap.emit("oracle", { action: "submit", incident });
        json(res, 201, incident);
        return;
      }

      if (method === "GET" && path === "/incidents") {
        const status = url.searchParams.get("status") ?? undefined;
        const incidents = store.list(status);
        json(res, 200, { incidents, count: incidents.length });
        return;
      }

      if (method === "GET" && path.startsWith("/incident/")) {
        const id = decodeURIComponent(path.slice("/incident/".length));
        const incident = store.get(id);
        if (!incident) {
          json(res, 404, { error: "not_found" });
          return;
        }
        json(res, 200, incident);
        return;
      }

      if (method === "GET" && path === "/statistics") {
        const incidents = store.list();
        const verified = incidents.filter((i) => i.status === "verified");
        scenarioStats().then((scenario) => {
          json(res, 200, {
            total_incidents: incidents.length,
            verified: verified.length,
            pending: incidents.filter((i) => i.status === "pending").length,
            rejected: incidents.filter((i) => i.status === "rejected").length,
            corroboration_avg: incidents.length
              ? Math.round(incidents.reduce((a, b) => a + b.corroborations, 0) / incidents.length * 100) / 100
              : 0,
            scenario,
            incidents,
          });
        }).catch(() => {
          json(res, 200, { total_incidents: incidents.length });
        });
        return;
      }

      // ---- mesh / chain passthrough ----
      if (method === "GET" && (path === "/mesh" || path === "/chain" || path === "/mesh/health" || path === "/chain/state")) {
        const base = path.startsWith("/mesh") ? MESH_URL : CHAIN_URL;
        const upstreamPath = path.endsWith("/health") ? "/health" : path.startsWith("/chain") ? "/chain" : "/state";
        const result = await upstream(upstreamPath, base);
        backward(res, result.status, result.body);
        return;
      }

      json(res, 404, { error: "not_found", path });
    } catch (err) {
      json(res, 500, { error: "internal_error", detail: String(err) });
    }
  });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname === "/events") {
      acceptWebSocket(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`[api] backend-api listening on http://${HOST}:${PORT}`);
  });
}

// Statistics enrich with seeded scenario data so dashboards render immediately.
async function scenarioStats(): Promise<Record<string, number>> {
  const hazards = ["flood", "fire", "earthquake", "storm", "landslide"];
  const out: Record<string, number> = {};
  const incidents = store.list();
  for (const h of hazards) {
    out[h] = incidents.filter((i) => i.hazard_type === h).length;
  }
  return out;
}

function openApiSpec(): Record<string, unknown> {
  return {
    openapi: "3.0.0",
    info: { title: "Bharat Resilio Backend API", version: "1.0.0" },
    paths: {
      "/health": { get: { summary: "Service health", responses: { "200": { description: "ok" } } } },
      "/auth/register": { post: { summary: "Register a user" } },
      "/auth/login": { post: { summary: "Login" } },
      "/auth/otp": { get: { summary: "Request OTP" } },
      "/auth/verify-otp": { post: { summary: "Verify OTP" } },
      "/acoustic/predict": { post: { summary: "Classify a waveform" } },
      "/incidents": { get: { summary: "List incidents" } },
      "/incident/{id}": { get: { summary: "Get incident" } },
      "/incident/submit": { post: { summary: "Submit incident" } },
      "/statistics": { get: { summary: "Statistics" } },
      "/mesh": { get: { summary: "Mesh snapshot" } },
      "/chain": { get: { summary: "Chain snapshot" } },
    },
  };
}