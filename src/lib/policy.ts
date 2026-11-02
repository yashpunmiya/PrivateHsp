import { z } from "zod";
import type { Address } from "viem";
import { HASHKEY_TESTNET_ID } from "./chain";
import { verifySupplierQuote, type SignedSupplierQuote } from "./quotes";

const requestIdSchema = z.string().uuid();

export type PurchasePolicy = {
  approvedSuppliers: readonly Address[];
  allowedToken: Address;
  maxAmountBaseUnits: bigint;
};

export type PurchaseAuthorization = {
  requestId: string;
  quote: unknown;
  supplier: Address;
  recipient: Address;
  token: Address;
  amountBaseUnits: string;
  chainId: number;
  userApproved: boolean;
  priorRequestIds: readonly string[];
  policy: PurchasePolicy;
  nowSeconds?: number;
};

export type PolicyDecision =
  | { allowed: true; quote: SignedSupplierQuote; reason: "authorized" }
  | { allowed: false; reason: string };

/** Deterministic gate. Agent/model output is never an authorization input. */
export async function evaluatePurchasePolicy(input: PurchaseAuthorization): Promise<PolicyDecision> {
  if (!requestIdSchema.safeParse(input.requestId).success) return { allowed: false, reason: "invalid-request-id" };
  if (input.priorRequestIds.includes(input.requestId)) return { allowed: false, reason: "duplicate-request" };
  if (!input.userApproved) return { allowed: false, reason: "human-approval-required" };
  if (input.chainId !== HASHKEY_TESTNET_ID) return { allowed: false, reason: "wrong-chain" };
  if (input.token.toLowerCase() !== input.policy.allowedToken.toLowerCase()) return { allowed: false, reason: "unsupported-token" };
  if (!input.policy.approvedSuppliers.some((address) => address.toLowerCase() === input.supplier.toLowerCase())) {
    return { allowed: false, reason: "supplier-not-approved" };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.recipient)) return { allowed: false, reason: "invalid-recipient" };
  if (!await verifySupplierQuote(input.quote, input.supplier, input.nowSeconds)) return { allowed: false, reason: "quote-invalid" };

  const quote = input.quote as SignedSupplierQuote;
  if (quote.chainId !== input.chainId) return { allowed: false, reason: "quote-chain-mismatch" };
  if (quote.tokenAddress.toLowerCase() !== input.token.toLowerCase()) return { allowed: false, reason: "quote-token-mismatch" };
  if (BigInt(quote.amountBaseUnits) > input.policy.maxAmountBaseUnits) return { allowed: false, reason: "spending-limit-exceeded" };
  return { allowed: true, quote, reason: "authorized" };
}
