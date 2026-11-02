import { describe, expect, it } from "vitest";
import { createPaymentWorkflowAdapter } from "./hsp-adapter";
import { hspWorkflowSteps } from "./hsp-workflow-types";
import type { HspWorkflowRecord } from "./hsp-workflow";

describe("payment workflow adapter boundary", () => {
  it("advances local lifecycle checkpoints without emitting Gateway or chain receipts", async () => {
    const requestId = crypto.randomUUID();
    let completedSteps: HspWorkflowRecord["completedSteps"] = [];
    const adapter = createPaymentWorkflowAdapter(async (id, step) => {
      completedSteps = [...completedSteps, step];
      return { requestId: id, completedSteps, updatedAt: new Date().toISOString() };
    });
    let result;
    for (const step of hspWorkflowSteps) {
      result = await adapter.advance(requestId, step);
      expect(result.currentStep).toBe(step);
      expect(result.gatewayOrder).toBeNull();
      expect(result.gatewayPayment).toBeNull();
      expect(result.transactionHash).toBeNull();
      expect(result.gatewayRequestSent).toBe(false);
      expect(result.walletSignatureProduced).toBe(false);
      expect(result.paymentSubmitted).toBe(false);
      expect(result.settlementVerified).toBe(false);
    }
    expect(result?.progress.completedSteps).toEqual(hspWorkflowSteps);
  });
});
