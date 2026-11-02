import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import { createStealthAnnouncement, createStealthIdentity } from "./stealth";
import { getReferenceAnnouncerRuntimeHash, scanAnnouncements } from "./announcer";

function mockLog(announcement: ReturnType<typeof createStealthAnnouncement>, logIndex: number) {
  const n = BigInt(logIndex).toString(16).padStart(64, "0");
  return {
    args: {
      schemeId: BigInt(1),
      stealthAddress: announcement.stealthAddress,
      caller: "0x1111111111111111111111111111111111111111",
      ephemeralPubKey: announcement.ephemeralPublicKey,
      metadata: announcement.metadata,
    },
    blockHash: `0x${"a".repeat(63)}${logIndex % 16}`,
    blockNumber: BigInt(10),
    transactionHash: `0x${n}`,
    logIndex,
    removed: false,
  };
}

describe("ERC-5564 announcer adapter", () => {
  it("extracts a complete pinned reference runtime hash from ScopeLift initcode", () => {
    expect(getReferenceAnnouncerRuntimeHash()).toMatch(/^0x[0-9a-f]{64}$/i);
  });

  it("scans bounded logs, recognizes two recipients, and deduplicates repeated announcements", async () => {
    const supplier = createStealthIdentity();
    const unrelatedSupplier = createStealthIdentity();
    const first = createStealthAnnouncement(supplier.metaAddress);
    const second = createStealthAnnouncement(supplier.metaAddress);
    const unrelated = createStealthAnnouncement(unrelatedSupplier.metaAddress);
    const logs = [mockLog(first, 0), mockLog(first, 1), mockLog(second, 2), mockLog(unrelated, 3)];
    const client = {
      getChainId: vi.fn(async () => 133),
      getLogs: vi.fn(async () => logs),
    } as unknown as Pick<PublicClient, "getChainId" | "getLogs">;

    const result = await scanAnnouncements(
      client,
      "0x2222222222222222222222222222222222222222",
      supplier,
      BigInt(0),
      BigInt(10),
    );

    expect(client.getLogs).toHaveBeenCalledOnce();
    expect(result.scanned).toBe(4);
    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((record) => record.stealthAddress.toLowerCase()).sort()).toEqual(
      [first.stealthAddress, second.stealthAddress].map((address) => address.toLowerCase()).sort(),
    );
  });

  it("rejects wrong networks, reversed ranges, and oversized scans before querying logs", async () => {
    const identity = createStealthIdentity();
    const client = {
      getChainId: vi.fn(async () => 177),
      getLogs: vi.fn(async () => []),
    } as unknown as Pick<PublicClient, "getChainId" | "getLogs">;
    const address = "0x2222222222222222222222222222222222222222";

    await expect(scanAnnouncements(client, address, identity, BigInt(0), BigInt(1))).rejects.toThrow("HashKey Testnet (133)");
    expect(client.getLogs).not.toHaveBeenCalled();

    client.getChainId = vi.fn(async () => 133);
    await expect(scanAnnouncements(client, address, identity, BigInt(2), BigInt(1))).rejects.toThrow("ordered");
    await expect(scanAnnouncements(client, address, identity, BigInt(0), BigInt(5001))).rejects.toThrow("at most 5001 blocks");
    expect(client.getLogs).not.toHaveBeenCalled();
  });

  it("does not turn RPC errors into an empty successful scan", async () => {
    const identity = createStealthIdentity();
    const client = {
      getChainId: vi.fn(async () => 133),
      getLogs: vi.fn(async () => { throw new Error("RPC unavailable"); }),
    } as unknown as Pick<PublicClient, "getChainId" | "getLogs">;
    await expect(scanAnnouncements(client, "0x2222222222222222222222222222222222222222", identity, BigInt(1), BigInt(2)))
      .rejects.toThrow("RPC unavailable");
  });
});
