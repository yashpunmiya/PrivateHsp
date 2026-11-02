import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createStealthIdentity } from "./stealth";
import { signSupplierQuote, type SignedSupplierQuote, type SupplierQuoteDraft } from "./quotes";
import { runBuyerProcurement, type ProcurementOffer } from "./procurement";

const keyA = privateKeyToAccount(`0x${"41".repeat(32)}`);
const keyB = privateKeyToAccount(`0x${"42".repeat(32)}`);
async function offer(agentId: string, account: typeof keyA): Promise<ProcurementOffer & { quote: SignedSupplierQuote }> {
  const draft: SupplierQuoteDraft = { supplierAddress: account.address, serviceId: "brief", serviceName: "Research brief", description: "Market research", stealthMetaAddress: createStealthIdentity().metaAddress, tokenAddress: "0x0000000000000000000000000000000000000001", amountBaseUnits: "10", tokenDecimals: 6, chainId: 133, expiresAt: 2_000_000_000, providerTerms: "Terms" };
  return { agentId, quote: await signSupplierQuote(draft, account), recipient: "0x0000000000000000000000000000000000000003" };
}
function llm(id: string) { return { project: "unit-test", location: "global", model: "test", useVertex: "true", generateContent: async () => ({ text: JSON.stringify({ selectedAgentId: id, rationale: "Task match" }) }) }; }

describe("buyer procurement orchestration", () => {
  it("passes the LLM recommendation through deterministic authorization", async () => {
    const first = await offer("a", keyA); const second = await offer("b", keyB);
    const input = { task: "buy a research report", offers: [first, second], requestId: crypto.randomUUID(), priorRequestIds: [], policy: { approvedSuppliers: [keyA.address], allowedToken: "0x0000000000000000000000000000000000000001" as `0x${string}`, maxAmountBaseUnits: BigInt(100) }, llm: llm("b"), nowSeconds: 1_900_000_000 };
    const rejected = await runBuyerProcurement({ ...input, payerApproved: true, approvedQuoteId: second.quote.quoteId });
    expect(rejected.recommendation.selectedAgentId).toBe("b");
    expect(rejected.authorization).toMatchObject({ allowed: false, reason: "supplier-not-approved" });
    const approved = await runBuyerProcurement({ ...input, payerApproved: false, llm: llm("a") });
    expect(approved.authorization).toMatchObject({ allowed: false, reason: "human-approval-required" });
    const pinnedApproval = await runBuyerProcurement({ ...input, payerApproved: true, approvedQuoteId: first.quote.quoteId, llm: {} });
    expect(pinnedApproval.authorization).toMatchObject({ allowed: true, reason: "authorized" });
    expect(pinnedApproval.selectedOffer.quote.quoteId).toBe(first.quote.quoteId);
    await expect(runBuyerProcurement({ ...input, payerApproved: true, llm: {} })).rejects.toThrow("Approval must reference the signed quote");
  });
});
