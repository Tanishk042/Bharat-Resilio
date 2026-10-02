import { createHash } from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";

export interface HealthFeedClient {
  socket: Duplex;
}

export function acceptWebSocket(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  clients: Set<HealthFeedClient>
): void {
  const key = request.headers["sec-websocket-key"];
  if (!key || Array.isArray(key)) {
    socket.destroy();
    return;
  }

  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  const responseHeaders = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n"
  ];

  socket.write(responseHeaders.join("\r\n"));
  if (head.length > 0) {
    socket.unshift(head);
  }

  const client: HealthFeedClient = { socket };
  clients.add(client);
  socket.on("close", () => clients.delete(client));
  socket.on("error", () => clients.delete(client));
}

export function sendJsonFrame(client: HealthFeedClient, payload: unknown): void {
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

  client.socket.write(Buffer.concat([header, body]));
}

export function sendJsonResponse(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}
