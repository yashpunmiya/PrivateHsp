import { NextResponse } from "next/server";
import { getConfiguredSuppliers, issueSupplierOffer } from "@/lib/supplier-offers";
import { verifySupplierQuote } from "@/lib/quotes";

export async function GET() {
  try {
    const offers = await Promise.all(getConfiguredSuppliers().map((supplier) => issueSupplierOffer(supplier)));
    if (offers.length !== 2 || new Set(offers.map(({ quote }) => quote.supplierAddress.toLowerCase())).size !== 2
      || new Set(offers.map(({ agentId }) => agentId)).size !== 2
      || !(await Promise.all(offers.map(({ quote }) => verifySupplierQuote(quote, quote.supplierAddress as `0x${string}`)))).every(Boolean)) {
      throw new Error("Supplier offers must be distinct and signature-valid");
    }
    return NextResponse.json({ offers, network: "HashKey Testnet", chainId: 133, status: "signed-offers" });
  } catch {
    return NextResponse.json({ error: "supplier_offer_configuration_required", detail: "Configure two distinct supplier signing keys, addresses, stealth meta-addresses, and the verified test token configuration." }, { status: 503 });
  }
}
