import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createStealthIdentity } from "./stealth";
import { signSupplierQuote, type SupplierQuoteDraft } from "./quotes";
import { auditChallenge, verifyAuditBundle, type AuditBundle } from "./audit";

const supplier = privateKeyToAccount(`0x${"31".repeat(32)}`);
const recipient = privateKeyToAccount(`0x${"32".repeat(32)}`);
const txHash = `0x${"ab".repeat(32)}` as const;
async function bundle(): Promise<AuditBundle> {
  const draft: SupplierQuoteDraft = { supplierAddress: supplier.address, serviceId: "svc", serviceName: "Service", description: "Research", stealthMetaAddress: createStealthIdentity().metaAddress, tokenAddress: "0x0000000000000000000000000000000000000001", amountBaseUnits: "10", tokenDecimals: 6, chainId: 133, expiresAt: 2_000_000_000, providerTerms: "Terms" };
  const quote = await signSupplierQuote(draft, supplier);
  const transfer = { mode: "direct-testnet-transfer" as const, chainId: 133 as const, from: "0x0000000000000000000000000000000000000004" as const, to: recipient.address, value: BigInt(10), transactionHash: txHash, blockNumber: BigInt(5), status: "success" as const, explorerUrl: `https://testnet-explorer.hsk.xyz/tx/${txHash}` };
  const challenge = auditChallenge(quote.quoteId, transfer.to, txHash);
  return { supplierAddress: supplier.address, quote, transfer, supplierAttestation: await supplier.signMessage({ message: challenge }), recipientControlSignature: await recipient.signMessage({ message: challenge }) };
}

function chainClient(evidence: AuditBundle["transfer"]) {
  return {
    getChainId: async () => 133,
    getTransaction: async () => ({ from: evidence.from, to: evidence.to, value: evidence.value }),
    getTransactionReceipt: async () => ({ status: "success", transactionHash: evidence.transactionHash, blockNumber: evidence.blockNumber }),
  } as never;
}

describe("selective audit bundle", () => {
  it("verifies quote, supplier attestation, one-time recipient control and chain transfer evidence", async () => {
    const value = await bundle();
    const serialized = JSON.parse(JSON.stringify(value, (_key, item: unknown) => typeof item === "bigint" ? item.toString() : item)) as unknown;
    expect(await verifyAuditBundle(serialized, chainClient(value.transfer), 1_900_000_000)).toMatchObject({ valid: true, checks: { supplierQuote: true, supplierAttestation: true, recipientControl: true, onchainTransfer: true } });
  });
  it("rejects forged identity/control signatures and tampered transfer facts", async () => {
    const value = await bundle();
    const serialized = JSON.parse(JSON.stringify(value, (_key, item: unknown) => typeof item === "bigint" ? item.toString() : item)) as Record<string, unknown>;
    expect((await verifyAuditBundle({ ...serialized, supplierAttestation: `0x${"00".repeat(65)}` }, chainClient(value.transfer), 1_900_000_000)).valid).toBe(false);
    expect((await verifyAuditBundle({ ...serialized, recipientControlSignature: value.supplierAttestation }, chainClient(value.transfer), 1_900_000_000)).valid).toBe(false);
    const tampered = { ...(serialized.transfer as Record<string, unknown>), value: "11" };
    expect((await verifyAuditBundle({ ...serialized, transfer: tampered }, chainClient(value.transfer), 1_900_000_000)).valid).toBe(false);
  });

  it("rejects structurally invalid evidence without making an RPC request and fails closed on RPC interruption", async () => {
    const noRpc = { getChainId: async () => { throw new Error("should not be called"); }, getTransaction: async () => { throw new Error("should not be called"); }, getTransactionReceipt: async () => { throw new Error("should not be called"); } } as never;
    expect(await verifyAuditBundle({ forged: true }, noRpc)).toMatchObject({ valid: false, checks: { supplierQuote: false, onchainTransfer: false } });

    const value = await bundle();
    const serialized = JSON.parse(JSON.stringify(value, (_key, item: unknown) => typeof item === "bigint" ? item.toString() : item)) as unknown;
    const interrupted = { getChainId: async () => { throw new Error("RPC timeout"); }, getTransaction: async () => { throw new Error("should not be called"); }, getTransactionReceipt: async () => { throw new Error("should not be called"); } } as never;
    expect(await verifyAuditBundle(serialized, interrupted, 1_900_000_000)).toMatchObject({ valid: false, checks: { onchainTransfer: false } });
  });
});
