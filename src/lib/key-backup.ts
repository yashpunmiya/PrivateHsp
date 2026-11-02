import { z } from "zod";
import { validateStealthIdentity, type StealthIdentity } from "./stealth";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const formatName = "PrivateHSP encrypted key backup";
const iterations = 310_000;

const backupSchema = z.object({
  format: z.literal(formatName),
  version: z.literal(1),
  kdf: z.literal("PBKDF2-SHA-256"),
  iterations: z.literal(iterations),
  cipher: z.literal("AES-256-GCM"),
  salt: z.string().regex(/^[A-Za-z0-9+/]{22}==$/),
  iv: z.string().regex(/^[A-Za-z0-9+/]{16}$/),
  ciphertext: z.string().min(80).max(16_384),
});

export class KeyBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeyBackupError";
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", ownedBuffer(encoder.encode(passphrase)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: ownedBuffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function validatePassphrase(passphrase: string): void {
  if (passphrase.length < 12 || passphrase.length > 1024) {
    throw new KeyBackupError("Use a passphrase between 12 and 1024 characters.");
  }
}

/** Encrypt the supplier identity entirely in the caller's local browser context. */
export async function encryptIdentityBackup(identity: StealthIdentity, passphrase: string): Promise<string> {
  validatePassphrase(passphrase);
  if (!validateStealthIdentity(identity)) throw new KeyBackupError("The identity is invalid and cannot be backed up.");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(passphrase, salt);
  const plaintext = encoder.encode(JSON.stringify(identity));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ownedBuffer(iv), additionalData: ownedBuffer(encoder.encode(`${formatName}:v1`)), tagLength: 128 },
    key,
    ownedBuffer(plaintext),
  );

  return JSON.stringify({
    format: formatName,
    version: 1,
    kdf: "PBKDF2-SHA-256",
    iterations,
    cipher: "AES-256-GCM",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }, null, 2);
}

/** Decrypt and validate the identity locally; authentication failures never return partial key data. */
export async function decryptIdentityBackup(serialized: string, passphrase: string): Promise<StealthIdentity> {
  validatePassphrase(passphrase);
  if (serialized.length > 24_000) throw new KeyBackupError("Backup file is too large.");

  let raw: unknown;
  try {
    raw = JSON.parse(serialized);
  } catch {
    throw new KeyBackupError("Backup file is not valid JSON.");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new KeyBackupError("Backup format is unsupported or malformed.");

  try {
    const salt = fromBase64(parsed.data.salt);
    const iv = fromBase64(parsed.data.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new KeyBackupError("Backup cryptographic parameters are invalid.");
    const key = await deriveEncryptionKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ownedBuffer(iv), additionalData: ownedBuffer(encoder.encode(`${formatName}:v1`)), tagLength: 128 },
      key,
      ownedBuffer(fromBase64(parsed.data.ciphertext)),
    );
    const identity: unknown = JSON.parse(decoder.decode(plaintext));
    if (!validateStealthIdentity(identity)) throw new KeyBackupError("The decrypted identity failed validation.");
    return identity;
  } catch (error) {
    if (error instanceof KeyBackupError) throw error;
    throw new KeyBackupError("Could not decrypt this backup. Check the passphrase and file integrity.");
  }
}
