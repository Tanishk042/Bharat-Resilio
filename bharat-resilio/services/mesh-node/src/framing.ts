import { MeshPayload, MessageType, WireMessage } from "../../../packages/shared-types/src";
import { signPayload, verifyPayload } from "./crypto";
import { canonicalStringify } from "./utils";

export interface UnsignedWireMessage<TPayload = MeshPayload> {
  header: {
    type: MessageType;
    senderNodeId: string;
    senderPublicKey: string;
    sequence: number;
  };
  payload: TPayload;
}

export function signMessage<TPayload>(
  message: UnsignedWireMessage<TPayload>,
  privateKeyPem: string
): WireMessage<TPayload> {
  const payloadToSign = canonicalStringify(message);
  return {
    header: {
      ...message.header,
      signature: signPayload(privateKeyPem, payloadToSign)
    },
    payload: message.payload
  };
}

export function verifyMessage(message: WireMessage): boolean {
  const { signature, ...unsignedHeader } = message.header;
  const unsignedMessage = {
    header: unsignedHeader,
    payload: message.payload
  };
  return verifyPayload(
    message.header.senderPublicKey,
    canonicalStringify(unsignedMessage),
    signature
  );
}

export function encodeFrame<TPayload>(message: WireMessage<TPayload>): Buffer {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const frame = Buffer.allocUnsafe(4 + body.length);
  frame.writeUInt32BE(body.length, 0);
  body.copy(frame, 4);
  return frame;
}

export function decodeFrames(buffer: Buffer): { messages: WireMessage[]; remainder: Buffer } {
  const messages: WireMessage[] = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const frameLength = buffer.readUInt32BE(offset);
    if (offset + 4 + frameLength > buffer.length) {
      break;
    }
    const raw = buffer.subarray(offset + 4, offset + 4 + frameLength).toString("utf8");
    messages.push(JSON.parse(raw) as WireMessage);
    offset += 4 + frameLength;
  }

  return {
    messages,
    remainder: buffer.subarray(offset)
  };
}
