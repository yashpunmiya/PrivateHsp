import {
  checkStealthAddress,
  computeStealthKey,
  generatePrivateKey,
  generateStealthAddress,
  generateStealthMetaAddressFromKeys,
  VALID_SCHEME_ID,
} from "@scopelift/stealth-address-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { bytesToHex, isAddress } from "viem";
import { z } from "zod";

const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
const privateKeySchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const compressedPublicKeySchema = z.string().regex(/^0x0[23][0-9a-fA-F]{64}$/);
const metaAddressSchema = z.string().regex(/^0x(?:0[23][0-9a-fA-F]{64}){2}$/);

export type StealthIdentity = {
  spendingPrivateKey: `0x${string}`;
  spendingPublicKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  viewingPublicKey: `0x${string}`;
  metaAddress: `st:hashkey-testnet:${string}`;
};

export type StealthAnnouncement = {
  schemeId: typeof schemeId;
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
  metadata: `0x${string}`;
};

const announcementSchema = z.object({
  schemeId: z.literal(1),
  stealthAddress: z.string().refine(isAddress),
  ephemeralPublicKey: z.string().regex(/^0x(?:02|03)[0-9a-fA-F]{64}$/),
  viewTag: z.string().regex(/^0x[0-9a-fA-F]{2}$/),
  metadata: z.string().regex(/^0x[0-9a-fA-F]{2,}$/),
});

function compressedPublicKey(privateKey: `0x${string}`): `0x${string}` {
  const publicKey = privateKeyToAccount(privateKey).publicKey;
  const uncompressed = publicKey.slice(4);
  const x = uncompressed.slice(0, 64);
  const yLastNibble = Number.parseInt(uncompressed.slice(-1), 16);
  return `0x${yLastNibble % 2 === 0 ? "02" : "03"}${x}`;
}

function randomPrivateKey(): `0x${string}` {
  return bytesToHex(generatePrivateKey({ schemeId })) as `0x${string}`;
}

/** Generate this identity in a trusted client context; never send its private keys to a server. */
export function createStealthIdentity(): StealthIdentity {
  const spendingPrivateKey = randomPrivateKey();
  const viewingPrivateKey = randomPrivateKey();
  const spendingPublicKey = compressedPublicKey(spendingPrivateKey);
  const viewingPublicKey = compressedPublicKey(viewingPrivateKey);
  const rawMetaAddress = generateStealthMetaAddressFromKeys({
    spendingPublicKey,
    viewingPublicKey,
  });

  return {
    spendingPrivateKey,
    spendingPublicKey,
    viewingPrivateKey,
    viewingPublicKey,
    metaAddress: `st:hashkey-testnet:${rawMetaAddress}`,
  };
}

/** Generate an ERC-5564 scheme-1 recipient and the fields required by its Announcement event. */
export function createStealthAnnouncement(metaAddress: string): StealthAnnouncement {
  const match = /^st:hashkey-testnet:(0x[0-9a-fA-F]+)$/.exec(metaAddress);
  const rawMetaAddress = match?.[1];
  metaAddressSchema.parse(rawMetaAddress);

  const generated = generateStealthAddress({
    stealthMetaAddressURI: metaAddress,
    schemeId,
  });
  const announcement: StealthAnnouncement = {
    schemeId,
    stealthAddress: generated.stealthAddress,
    ephemeralPublicKey: generated.ephemeralPublicKey,
    viewTag: generated.viewTag,
    metadata: generated.viewTag,
  };
  announcementSchema.parse(announcement);
  return announcement;
}

/** Check whether a well-formed announcement belongs to this identity. */
export function recognizesAnnouncement(
  identity: Pick<StealthIdentity, "spendingPublicKey" | "viewingPrivateKey">,
  candidate: unknown,
): candidate is StealthAnnouncement {
  const parsed = announcementSchema.safeParse(candidate);
  if (!parsed.success) return false;

  try {
    return checkStealthAddress({
      ephemeralPublicKey: parsed.data.ephemeralPublicKey as `0x${string}`,
      schemeId,
      spendingPublicKey: identity.spendingPublicKey,
      userStealthAddress: parsed.data.stealthAddress as `0x${string}`,
      viewingPrivateKey: identity.viewingPrivateKey,
      viewTag: parsed.data.viewTag as `0x${string}`,
    });
  } catch {
    return false;
  }
}

/** Recover locally and verify that the derived key controls the announced address. */
export function recoverStealthPrivateKey(
  identity: Pick<StealthIdentity, "spendingPrivateKey" | "viewingPrivateKey" | "spendingPublicKey">,
  candidate: unknown,
): `0x${string}` {
  const announcement = announcementSchema.parse(candidate);
  privateKeySchema.parse(identity.spendingPrivateKey);
  privateKeySchema.parse(identity.viewingPrivateKey);
  compressedPublicKeySchema.parse(identity.spendingPublicKey);

  if (!recognizesAnnouncement(identity, announcement)) {
    throw new Error("Announcement does not belong to this identity");
  }

  const stealthPrivateKey = computeStealthKey({
    ephemeralPublicKey: announcement.ephemeralPublicKey,
    schemeId,
    spendingPrivateKey: identity.spendingPrivateKey,
    viewingPrivateKey: identity.viewingPrivateKey,
  });
  const recoveredAddress = privateKeyToAccount(stealthPrivateKey).address;
  if (recoveredAddress.toLowerCase() !== announcement.stealthAddress.toLowerCase()) {
    throw new Error("Recovered key does not control the announced address");
  }
  return stealthPrivateKey;
}

export function isStealthMetaAddress(value: string): boolean {
  const match = /^st:hashkey-testnet:(0x[0-9a-fA-F]+)$/.exec(value);
  return metaAddressSchema.safeParse(match?.[1]).success;
}

export function validateStealthIdentity(value: unknown): value is StealthIdentity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StealthIdentity>;
  try {
    privateKeySchema.parse(candidate.spendingPrivateKey);
    privateKeySchema.parse(candidate.viewingPrivateKey);
    compressedPublicKeySchema.parse(candidate.spendingPublicKey);
    compressedPublicKeySchema.parse(candidate.viewingPublicKey);
    if (compressedPublicKey(candidate.spendingPrivateKey as `0x${string}`) !== candidate.spendingPublicKey) return false;
    if (compressedPublicKey(candidate.viewingPrivateKey as `0x${string}`) !== candidate.viewingPublicKey) return false;
    if (!isStealthMetaAddress(candidate.metaAddress ?? "")) return false;
    const rawMeta = generateStealthMetaAddressFromKeys({
      spendingPublicKey: candidate.spendingPublicKey as `0x${string}`,
      viewingPublicKey: candidate.viewingPublicKey as `0x${string}`,
    });
    return candidate.metaAddress === `st:hashkey-testnet:${rawMeta}`;
  } catch {
    return false;
  }
}

export function isValidAnnouncement(value: unknown): value is StealthAnnouncement {
  return announcementSchema.safeParse(value).success;
}
