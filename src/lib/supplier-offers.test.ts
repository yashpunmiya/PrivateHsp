import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createStealthIdentity } from "./stealth";
import { issueSupplierOffer } from "./supplier-offers";
import { verifySupplierQuote } from "./quotes";

function config(key: string, name: string) {
  const account = privateKeyToAccount(key as `0x${string}`);
  return { agentId: name, supplierAddress: account.address, signingPrivateKey: key, stealthMetaAddress: createStealthIdentity().metaAddress, tokenAddress: "0x0000000000000000000000000000000000000001", amountBaseUnits: "100", tokenDecimals: 6, serviceId: "brief", serviceName: name, description: "Evidence-led data brief", providerTerms: "Delivery terms." };
}

describe("independent supplier identities", () => {
  it("issues independently signed, verifiable offers and rejects key/address mismatch", async () => {
    const a = await issueSupplierOffer(config(`0x${"51".repeat(32)}`, "supplier-a"), 1_900_000_000);
    const b = await issueSupplierOffer(config(`0x${"52".repeat(32)}`, "supplier-b"), 1_900_000_000);
    expect(a.quote.supplierAddress).not.toBe(b.quote.supplierAddress);
    expect(await verifySupplierQuote(a.quote, a.quote.supplierAddress as `0x${string}`, 1_900_000_001)).toBe(true);
    expect(await verifySupplierQuote(b.quote, b.quote.supplierAddress as `0x${string}`, 1_900_000_001)).toBe(true);
    await expect(issueSupplierOffer({ ...config(`0x${"53".repeat(32)}`, "bad"), supplierAddress: a.quote.supplierAddress })).rejects.toThrow("does not match");
  });
});
