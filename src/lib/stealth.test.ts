import { describe, expect, it } from "vitest";
import {
  generateStealthAddress,
  generateStealthMetaAddressFromKeys,
  VALID_SCHEME_ID,
} from "@scopelift/stealth-address-sdk";
import { hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createStealthAnnouncement,
  createStealthIdentity,
  isStealthMetaAddress,
  recognizesAnnouncement,
  recoverStealthPrivateKey,
  type StealthAnnouncement,
  type StealthIdentity,
} from "./stealth";

const key = (value: number) => `0x${value.toString(16).padStart(64, "0")}` as const;

function compressedPublicKey(privateKey: `0x${string}`): `0x${string}` {
  const uncompressed = privateKeyToAccount(privateKey).publicKey.slice(4);
  const x = uncompressed.slice(0, 64);
  const lastYNibble = Number.parseInt(uncompressed.slice(-1), 16);
  return `0x${lastYNibble % 2 === 0 ? "02" : "03"}${x}`;
}

function deterministicIdentity(spending: number, viewing: number): StealthIdentity {
  const spendingPrivateKey = key(spending);
  const viewingPrivateKey = key(viewing);
  const spendingPublicKey = compressedPublicKey(spendingPrivateKey);
  const viewingPublicKey = compressedPublicKey(viewingPrivateKey);
  const rawMeta = generateStealthMetaAddressFromKeys({ spendingPublicKey, viewingPublicKey });
  return {
    spendingPrivateKey,
    spendingPublicKey,
    viewingPrivateKey,
    viewingPublicKey,
    metaAddress: `st:hashkey-testnet:${rawMeta}`,
  };
}

function deterministicAnnouncement(identity: StealthIdentity): StealthAnnouncement {
  const generated = generateStealthAddress({
    stealthMetaAddressURI: identity.metaAddress,
    schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
    ephemeralPrivateKey: hexToBytes(key(3)),
  });
  return {
    schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
    stealthAddress: generated.stealthAddress,
    ephemeralPublicKey: generated.ephemeralPublicKey,
    viewTag: generated.viewTag,
    metadata: generated.viewTag,
  };
}

describe("ERC-5564 scheme-1 stealth addresses", () => {
  it("creates a valid identity and chain-scoped meta-address", () => {
    const identity = deterministicIdentity(1, 2);
    expect(identity.spendingPublicKey).toMatch(/^0x0[23][0-9a-f]{64}$/i);
    expect(identity.viewingPublicKey).toMatch(/^0x0[23][0-9a-f]{64}$/i);
    expect(identity.metaAddress).toMatch(/^st:hashkey-testnet:0x/);
    expect(isStealthMetaAddress(identity.metaAddress)).toBe(true);
    expect(isStealthMetaAddress(`st:hashkey-mainnet:${identity.metaAddress.split(":").at(-1)}`)).toBe(false);
  });

  it("recognizes and recovers a deterministic address controlled by its one-time key", () => {
    const identity = deterministicIdentity(1, 2);
    const announcement = deterministicAnnouncement(identity);

    expect(recognizesAnnouncement(identity, announcement)).toBe(true);
    const recovered = recoverStealthPrivateKey(identity, announcement);
    expect(privateKeyToAccount(recovered).address.toLowerCase()).toBe(
      announcement.stealthAddress.toLowerCase(),
    );
  });

  it("rejects incorrect viewing and spending keys", () => {
    const identity = deterministicIdentity(1, 2);
    const announcement = deterministicAnnouncement(identity);
    const wrongView = deterministicIdentity(1, 4);
    const wrongSpend = deterministicIdentity(5, 2);

    expect(recognizesAnnouncement(wrongView, announcement)).toBe(false);
    expect(recognizesAnnouncement(wrongSpend, announcement)).toBe(false);
    expect(() => recoverStealthPrivateKey(wrongView, announcement)).toThrow(
      "Announcement does not belong to this identity",
    );
    expect(() => recoverStealthPrivateKey(wrongSpend, announcement)).toThrow(
      "Announcement does not belong to this identity",
    );
  });

  it("rejects malformed announcements and corrupted ephemeral keys", () => {
    const identity = deterministicIdentity(1, 2);
    const announcement = deterministicAnnouncement(identity);

    expect(recognizesAnnouncement(identity, { ...announcement, ephemeralPublicKey: "0x1234" })).toBe(false);
    expect(recognizesAnnouncement(identity, { ...announcement, viewTag: "0x1234" })).toBe(false);
    expect(recognizesAnnouncement(identity, { ...announcement, schemeId: 2 })).toBe(false);
    expect(recognizesAnnouncement(identity, null)).toBe(false);
    expect(() => recoverStealthPrivateKey(identity, { ...announcement, ephemeralPublicKey: "0x1234" })).toThrow();
  });

  it("rejects a changed recipient or view tag", () => {
    const identity = deterministicIdentity(1, 2);
    const announcement = deterministicAnnouncement(identity);

    expect(recognizesAnnouncement(identity, { ...announcement, stealthAddress: privateKeyToAccount(key(9)).address })).toBe(false);
    expect(recognizesAnnouncement(identity, { ...announcement, viewTag: announcement.viewTag === "0x00" ? "0x01" : "0x00", metadata: announcement.viewTag === "0x00" ? "0x01" : "0x00" })).toBe(false);
  });

  it("generates distinct recipient addresses that the intended supplier can recover", () => {
    const identity = createStealthIdentity();
    const first = createStealthAnnouncement(identity.metaAddress);
    const second = createStealthAnnouncement(identity.metaAddress);

    expect(first.stealthAddress.toLowerCase()).not.toBe(second.stealthAddress.toLowerCase());
    expect(recognizesAnnouncement(identity, first)).toBe(true);
    expect(recognizesAnnouncement(identity, second)).toBe(true);
    expect(privateKeyToAccount(recoverStealthPrivateKey(identity, first)).address.toLowerCase()).toBe(
      first.stealthAddress.toLowerCase(),
    );
    expect(privateKeyToAccount(recoverStealthPrivateKey(identity, second)).address.toLowerCase()).toBe(
      second.stealthAddress.toLowerCase(),
    );
  });
});
