import { recoverMessageAddress, type Address, type PublicClient } from "viem";
import { verifySupplierQuote, type SignedSupplierQuote } from "./quotes";
import { verifyDirectTestnetTransfer, type DirectTransferEvidence } from "./payment";
import { z } from "zod";

export type AuditBundle = {
  supplierAddress: Address;
  quote: SignedSupplierQuote;
  transfer: DirectTransferEvidence;
  supplierAttestation: `0x${string}`;
  recipientControlSignature: `0x${string}`;
};

const auditInput = z.object({
  supplierAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  quote: z.unknown(),
  transfer: z.object({ mode: z.literal("direct-testnet-transfer"), chainId: z.literal(133), from: z.string().regex(/^0x[0-9a-fA-F]{40}$/), to: z.string().regex(/^0x[0-9a-fA-F]{40}$/), value: z.string().regex(/^[1-9][0-9]*$/), transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), blockNumber: z.string().regex(/^[1-9][0-9]*$/), status: z.literal("success"), explorerUrl: z.string().url() }).strict(),
  supplierAttestation: z.string().regex(/^0x[0-9a-fA-F]{130}$/), recipientControlSignature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
}).strict();

export function auditChallenge(quoteId: string, recipient: Address, transactionHash: string): string {
  return ["PrivateHSP audit disclosure v1", `quote:${quoteId.toLowerCase()}`, `recipient:${recipient.toLowerCase()}`, `transaction:${transactionHash.toLowerCase()}`].join("\n");
}

/** Verifies signatures and chain data; it does not prove service quality or stealth derivation. */
export async function verifyAuditBundle(
  value: unknown,
  client: Pick<PublicClient, "getChainId" | "getTransaction" | "getTransactionReceipt">,
  nowSeconds?: number,
): Promise<{ valid: boolean; checks: { supplierQuote: boolean; supplierAttestation: boolean; recipientControl: boolean; onchainTransfer: boolean } }> {
  const parsed = auditInput.safeParse(value);
  const checks = { supplierQuote: false, supplierAttestation: false, recipientControl: false, onchainTransfer: false };
  if (!parsed.success) return { valid: false, checks };
  const bundle = { ...parsed.data, supplierAddress: parsed.data.supplierAddress as Address, supplierAttestation: parsed.data.supplierAttestation as `0x${string}`, recipientControlSignature: parsed.data.recipientControlSignature as `0x${string}`, transfer: { ...parsed.data.transfer, from: parsed.data.transfer.from as Address, to: parsed.data.transfer.to as Address, value: BigInt(parsed.data.transfer.value), transactionHash: parsed.data.transfer.transactionHash as `0x${string}`, blockNumber: BigInt(parsed.data.transfer.blockNumber), explorerUrl: parsed.data.transfer.explorerUrl } };
  const quoteId = z.string().regex(/^0x[0-9a-fA-F]{64}$/).safeParse((bundle.quote as { quoteId?: unknown } | null)?.quoteId);
  if (!quoteId.success) return { valid: false, checks };
  const challenge = auditChallenge(quoteId.data, bundle.transfer.to, bundle.transfer.transactionHash);
  checks.supplierQuote = await verifySupplierQuote(bundle.quote, bundle.supplierAddress, nowSeconds);
  try {
    checks.supplierAttestation = (await recoverMessageAddress({ message: challenge, signature: bundle.supplierAttestation })).toLowerCase() === bundle.supplierAddress.toLowerCase();
    checks.recipientControl = (await recoverMessageAddress({ message: challenge, signature: bundle.recipientControlSignature })).toLowerCase() === bundle.transfer.to.toLowerCase();
    checks.onchainTransfer = await verifyDirectTestnetTransfer(client, bundle.transfer);
  } catch { return { valid: false, checks }; }
  return { valid: Object.values(checks).every(Boolean), checks };
}
