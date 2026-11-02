import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createStealthIdentity } from "./stealth";
import { signSupplierQuote, verifySupplierQuote, type SupplierQuoteDraft } from "./quotes";

const supplier = privateKeyToAccount(`0x${"11".repeat(32)}`);

async function createQuote() {
  const draft: SupplierQuoteDraft = {
    supplierAddress: supplier.address,
    serviceId: "research-brief",
    serviceName: "Research brief",
    description: "Evidence-based market report",
    stealthMetaAddress: createStealthIdentity().metaAddress,
    tokenAddress: "0x0000000000000000000000000000000000000001",
    amountBaseUnits: "500000",
    tokenDecimals: 6,
    chainId: 133,
    expiresAt: 2_000_000_000,
    providerTerms: "Delivery within one hour",
  };
  return signSupplierQuote(draft, supplier);
}

describe("signed supplier quotes", () => {
  it("signs and verifies an unexpired quote for its registered supplier", async () => {
    const quote = await createQuote();
    expect(await verifySupplierQuote(quote, supplier.address, 1_900_000_000)).toBe(true);
  });

  it("rejects changed price, terms, wrong supplier, and expiration", async () => {
    const quote = await createQuote();
    expect(await verifySupplierQuote({ ...quote, amountBaseUnits: "1" }, supplier.address, 1_900_000_000)).toBe(false);
    expect(await verifySupplierQuote({ ...quote, providerTerms: "redirect funds" }, supplier.address, 1_900_000_000)).toBe(false);
    expect(await verifySupplierQuote(quote, "0x0000000000000000000000000000000000000002", 1_900_000_000)).toBe(false);
    expect(await verifySupplierQuote(quote, supplier.address, 2_000_000_000)).toBe(false);
  });
});
