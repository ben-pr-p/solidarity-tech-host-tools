import crypto from "node:crypto";
import { config } from "@/config.server";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(config.SYMMETRIC_ENCRYPTION_KEY, "base64");
const IV_LENGTH = 12; // Recommended IV size for GCM
const AUTH_TAG_LENGTH = 16; // Default auth tag length for GCM

/**
 * New compact binary payload version.
 * We assume each number fits into 32 bits.
 */
type FullPayload = {
  eventId: number;
  sessionId: number;
};

export function encrypt(payload: FullPayload) {
  // Convert the payload into a compact binary representation.
  const payloadBuffer = encodePayload(payload);

  // Generate a random IV.
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  // Encrypt the payloadBuffer (no intermediate base64 or JSON conversion).
  const ciphertext = Buffer.concat([
    cipher.update(payloadBuffer),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack results into a single buffer: [iv | authTag | ciphertext]
  const encryptedBuffer = Buffer.concat([iv, authTag, ciphertext]);

  // Return a single Base64 encoded string.
  return encryptedBuffer.toString("base64");
}

export function decrypt(encryptedBase64: string): FullPayload {
  // Decode the Base64 message to get the full Buffer.
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");

  // Extract the IV, auth tag, and ciphertext based on fixed lengths.
  const iv = encryptedBuffer.slice(0, IV_LENGTH);
  const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const payloadBuffer = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decodePayload(payloadBuffer);
}

// Helper function: Encode the FullPayload into an 8-byte buffer.
function encodePayload(payload: FullPayload): Buffer {
  const buffer = Buffer.alloc(8); // 4 bytes for eventId, 4 bytes for sessionId
  buffer.writeUInt32BE(payload.eventId, 0); // Big endian 32-bit
  buffer.writeUInt32BE(payload.sessionId, 4);
  return buffer;
}

// Helper function: Decode the 8-byte Buffer back to FullPayload.
function decodePayload(buffer: Buffer): FullPayload {
  return {
    eventId: buffer.readUInt32BE(0),
    sessionId: buffer.readUInt32BE(4),
  };
}
