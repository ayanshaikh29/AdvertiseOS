import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "v1";

/** True when CONNECTOR_TOKEN_KEY holds a 32-byte hex key. */
export function secretsConfigured(): boolean {
  const raw = process.env.CONNECTOR_TOKEN_KEY;
  if (!raw) return false;
  return /^[0-9a-fA-F]{64}$/.test(raw.trim());
}

function key(): Buffer {
  const raw = process.env.CONNECTOR_TOKEN_KEY?.trim();
  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("CONNECTOR_TOKEN_KEY missing or not 64 hex chars (32 bytes) — connector tokens cannot be stored");
  }
  return Buffer.from(raw, "hex");
}

/** AES-256-GCM encrypt for connector tokens. Output: v1:<iv>:<tag>:<ciphertext> (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(blob: string): string {
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error("Encrypted secret has unknown format");
  const ivB64 = parts[1] ?? "";
  const tagB64 = parts[2] ?? "";
  const dataB64 = parts[3] ?? "";
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
