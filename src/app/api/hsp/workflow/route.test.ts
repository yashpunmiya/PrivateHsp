import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { createOrder, transitionOrder } from "../../../../lib/order-store";
import { hspWorkflowSteps } from "../../../../lib/hsp-workflow-types";

function request(requestId: string, step: (typeof hspWorkflowSteps)[number]) {
  return new Request("http://localhost/api/hsp/workflow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId, step }),
  });
}

describe("local workflow route", () => {
  it("requires an approved order before advancing", async () => {
    const requestId = crypto.randomUUID();
    await createOrder({ requestId, supplierAddress: "0x0000000000000000000000000000000000000001", quoteId: `0x${"11".repeat(32)}`, amountBaseUnits: "100", chainId: 133 });
    const response = await POST(request(requestId, "create_order"));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "approved_order_required" });
  });

  it("keeps external Gateway, signature, submission, and settlement results false", async () => {
    const requestId = crypto.randomUUID();
    await createOrder({ requestId, supplierAddress: "0x0000000000000000000000000000000000000001", quoteId: `0x${"12".repeat(32)}`, amountBaseUnits: "100", chainId: 133 });
    await transitionOrder(requestId, "approved");
    let result: Record<string, unknown> = {};
    for (const step of hspWorkflowSteps) {
      const response = await POST(request(requestId, step));
      expect(response.status).toBe(200);
      result = await response.json() as Record<string, unknown>;
    }
    expect(result).toMatchObject({
      flowComplete: true,
      gatewayRequestSent: false,
      walletSignatureProduced: false,
      paymentSubmitted: false,
      settlementVerified: false,
    });
  });
});
