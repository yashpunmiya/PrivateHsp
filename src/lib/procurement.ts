import type { Address } from "viem";
import { selectSupplierWithLlm, type SupplierCandidate, type VertexConfig } from "./llm-selector";
import { evaluatePurchasePolicy, type PurchasePolicy } from "./policy";
import { verifySupplierQuote, type SignedSupplierQuote } from "./quotes";

export type ProcurementOffer = {
  agentId: string;
  quote: unknown;
  recipient: Address;
};

export async function runBuyerProcurement(input: {
  task: string;
  offers: ProcurementOffer[];
  payerApproved: boolean;
  approvedQuoteId?: string;
  requestId: string;
  priorRequestIds: readonly string[];
  policy: PurchasePolicy;
  llm: VertexConfig;
  nowSeconds?: number;
}) {
  const verified: ProcurementOffer[] = [];
  for (const offer of input.offers) {
    const supplier = (offer.quote as SignedSupplierQuote | null)?.supplierAddress;
    if (typeof supplier === "string" && await verifySupplierQuote(offer.quote, supplier as Address, input.nowSeconds)) verified.push(offer);
  }
  if (verified.length === 0) throw new Error("No valid signed supplier quotes were provided");
  const candidates: SupplierCandidate[] = verified.map(({ agentId, quote: value }) => { const quote = value as SignedSupplierQuote; return { agentId, serviceName: quote.serviceName, description: quote.description, amountBaseUnits: quote.amountBaseUnits, quoteValid: true }; });
  if (input.payerApproved && !input.approvedQuoteId) throw new Error("Approval must reference the signed quote shown to the buyer");
  const recommendation = input.payerApproved
    ? { selectedAgentId: verified.find((offer) => (offer.quote as SignedSupplierQuote).quoteId.toLowerCase() === input.approvedQuoteId?.toLowerCase())?.agentId ?? "", rationale: "The buyer approved this exact signed quote after review." }
    : await selectSupplierWithLlm(input.task, candidates, input.llm);
  const selected = verified.find((offer) => offer.agentId === recommendation.selectedAgentId);
  const chosen = selected ? { ...selected, quote: selected.quote as SignedSupplierQuote } : undefined;
  if (!chosen) throw new Error("LLM selection did not map to a verified offer");
  const decision = await evaluatePurchasePolicy({
    requestId: input.requestId, quote: chosen.quote, supplier: chosen.quote.supplierAddress as Address,
    recipient: chosen.recipient, token: chosen.quote.tokenAddress as Address,
    amountBaseUnits: chosen.quote.amountBaseUnits, chainId: chosen.quote.chainId,
    userApproved: input.payerApproved, priorRequestIds: input.priorRequestIds,
    policy: input.policy, nowSeconds: input.nowSeconds,
  });
  return { recommendation, selectedOffer: chosen, authorization: decision };
}
