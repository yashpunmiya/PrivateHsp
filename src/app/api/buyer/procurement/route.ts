import { NextResponse } from "next/server";
import type { Address } from "viem";
import { z } from "zod";
import { getOrdersForPolicy, createOrder, transitionOrder } from "@/lib/order-store";
import { runBuyerProcurement } from "@/lib/procurement";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((value) => value as Address);
const inputSchema = z.object({
  task: z.string().trim().min(3).max(1_000), requestId: z.string().uuid(), payerApproved: z.boolean(), approvedQuoteId: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  offers: z.array(z.object({ agentId: z.string().min(1).max(120), quote: z.unknown(), recipient: address }).strict()).min(2).max(10),
  policy: z.object({ approvedSuppliers: z.array(address).min(1).max(100), allowedToken: address, maxAmountBaseUnits: z.string().regex(/^[1-9][0-9]*$/).max(78) }).strict(),
}).strict();

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_procurement_request" }, { status: 400 });
  const input = parsed.data;
  try {
    const orders = await getOrdersForPolicy();
    const result = await runBuyerProcurement({
      ...input,
      policy: { ...input.policy, maxAmountBaseUnits: BigInt(input.policy.maxAmountBaseUnits) },
      priorRequestIds: orders.map((order) => order.requestId).filter((id) => id !== input.requestId),
      llm: {
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION,
        model: process.env.GEMINI_MODEL,
        useVertex: process.env.GEMINI_USE_VERTEX,
      },
    });
    if (!result.authorization.allowed) {
      await createOrder({ requestId: input.requestId, supplierAddress: result.selectedOffer.quote.supplierAddress, quoteId: result.selectedOffer.quote.quoteId, amountBaseUnits: result.selectedOffer.quote.amountBaseUnits, chainId: 133, status: "requested" });
      return NextResponse.json({ status: "awaiting-human-approval", recommendation: result.recommendation, selectedOffer: result.selectedOffer, policy: result.authorization, paymentSubmitted: false }, { status: 202 });
    }
    const order = await createOrder({ requestId: input.requestId, supplierAddress: result.selectedOffer.quote.supplierAddress, quoteId: result.selectedOffer.quote.quoteId, amountBaseUnits: result.selectedOffer.quote.amountBaseUnits, chainId: 133, status: "requested" });
    if (order.order.status === "requested") await transitionOrder(input.requestId, "approved");
    return NextResponse.json({ status: "approved-for-preparation", recommendation: result.recommendation, selectedOffer: result.selectedOffer, policy: result.authorization, paymentSubmitted: false }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "procurement_failed";
    const missingConfiguration = message.includes("Vertex AI is not configured");
    return NextResponse.json({ error: missingConfiguration ? "vertex_ai_not_configured" : "procurement_failed", message }, { status: missingConfiguration ? 503 : 422 });
  }
}
