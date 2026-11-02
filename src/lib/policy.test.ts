import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createStealthIdentity } from "./stealth";
import { signSupplierQuote, type SupplierQuoteDraft } from "./quotes";
import { evaluatePurchasePolicy } from "./policy";

const supplier = privateKeyToAccount(`0x${"22".repeat(32)}`);
const token = "0x0000000000000000000000000000000000000001" as const;
const recipient = "0x0000000000000000000000000000000000000003" as const;

async function fixture() {
  const draft: SupplierQuoteDraft = {
    supplierAddress: supplier.address, serviceId: "report", serviceName: "Report",
    description: "Market research", stealthMetaAddress: createStealthIdentity().metaAddress,
    tokenAddress: token, amountBaseUnits: "500000", tokenDecimals: 6, chainId: 133,
    expiresAt: 2_000_000_000, providerTerms: "One report",
  };
  const quote = await signSupplierQuote(draft, supplier);
  const base = {
    requestId: "f78d81dd-95f6-4ae8-a219-78ecb18be201", quote, supplier: supplier.address,
    recipient, token, amountBaseUnits: "500000", chainId: 133, userApproved: true,
    priorRequestIds: [], policy: { approvedSuppliers: [supplier.address], allowedToken: token, maxAmountBaseUnits: BigInt(1_000_000) },
    nowSeconds: 1_900_000_000,
  };
  return base;
}

describe("deterministic purchase policy", () => {
  it("allows only a valid approved quote within limits after human approval", async () => {
    expect((await evaluatePurchasePolicy(await fixture())).allowed).toBe(true);
    expect(await evaluatePurchasePolicy({ ...(await fixture()), userApproved: false })).toMatchObject({ allowed: false, reason: "human-approval-required" });
    expect(await evaluatePurchasePolicy({ ...(await fixture()), chainId: 1 })).toMatchObject({ allowed: false, reason: "wrong-chain" });
    expect(await evaluatePurchasePolicy({ ...(await fixture()), priorRequestIds: ["f78d81dd-95f6-4ae8-a219-78ecb18be201"] })).toMatchObject({ allowed: false, reason: "duplicate-request" });
  });

  it("rejects amount, token, supplier, recipient, and quote tampering", async () => {
    const base = await fixture();
    expect(await evaluatePurchasePolicy({ ...base, policy: { ...base.policy, maxAmountBaseUnits: BigInt(1) } })).toMatchObject({ allowed: false, reason: "spending-limit-exceeded" });
    expect(await evaluatePurchasePolicy({ ...base, token: "0x0000000000000000000000000000000000000002" })).toMatchObject({ allowed: false, reason: "unsupported-token" });
    expect(await evaluatePurchasePolicy({ ...base, supplier: "0x0000000000000000000000000000000000000004" })).toMatchObject({ allowed: false, reason: "supplier-not-approved" });
    expect(await evaluatePurchasePolicy({ ...base, recipient: "bad" as Address })).toMatchObject({ allowed: false, reason: "invalid-recipient" });
    expect(await evaluatePurchasePolicy({ ...base, quote: { ...base.quote, amountBaseUnits: "1" } })).toMatchObject({ allowed: false, reason: "quote-invalid" });
  });
});
