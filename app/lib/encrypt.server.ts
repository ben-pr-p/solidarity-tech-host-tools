const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // Recommended IV size for GCM

/**
 * New compact binary payload version.
 * We assume each number fits into 32 bits.
 */
type FullPayload = {
  eventId: number;
  sessionId: number;
};

export function getEncryptor(symmetricKey: string) {
  const KEY = Uint8Array.from(atob(symmetricKey), (c) => c.charCodeAt(0));

  // Helper function: Encode the FullPayload into an 8-byte Uint8Array.
  function encodePayload(payload: FullPayload): Uint8Array {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, payload.eventId);
    view.setUint32(4, payload.sessionId);
    return new Uint8Array(buffer);
  }

  // Helper function: Decode the 8-byte Uint8Array back to FullPayload.
  function decodePayload(buffer: Uint8Array): FullPayload {
    const view = new DataView(buffer.buffer);
    return {
      eventId: view.getUint32(0),
      sessionId: view.getUint32(4),
    };
  }

  async function encrypt(payload: FullPayload): Promise<string> {
    const payloadBuffer = encodePayload(payload);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cipher = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      await crypto.subtle.importKey("raw", KEY, ALGORITHM, false, ["encrypt"]),
      payloadBuffer
    );
    const encryptedBuffer = new Uint8Array([...iv, ...new Uint8Array(cipher)]);
    return btoa(String.fromCharCode(...encryptedBuffer));
  }

  async function decrypt(encryptedBase64: string): Promise<FullPayload> {
    const encryptedBuffer = Uint8Array.from(atob(encryptedBase64), (c) =>
      c.charCodeAt(0)
    );
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const ciphertext = encryptedBuffer.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      await crypto.subtle.importKey("raw", KEY, ALGORITHM, false, ["decrypt"]),
      ciphertext
    );
    return decodePayload(new Uint8Array(decrypted));
  }

  return { encrypt, decrypt };
}
