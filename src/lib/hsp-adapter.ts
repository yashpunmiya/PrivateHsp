import { advanceHspWorkflow } from "./hsp-workflow";
import type { HspWorkflowStep } from "./hsp-workflow-types";

export type WorkflowAdapterResult = {
  progress: Awaited<ReturnType<typeof advanceHspWorkflow>>;
  currentStep: HspWorkflowStep;
  applicationOrderReference: string;
  gatewayOrder: null;
  gatewayPayment: null;
  transactionHash: null;
  gatewayRequestSent: false;
  walletSignatureProduced: false;
  paymentSubmitted: false;
  settlementVerified: false;
};

export interface PaymentWorkflowAdapter {
  readonly execution: "local" | "gateway";
  advance(requestId: string, step: HspWorkflowStep): Promise<WorkflowAdapterResult>;
}

export function createPaymentWorkflowAdapter(
  advanceLocalStep: typeof advanceHspWorkflow = advanceHspWorkflow,
): PaymentWorkflowAdapter {
  return {
    execution: "local",
    async advance(requestId, step) {
      const progress = await advanceLocalStep(requestId, step);
      return {
        progress,
        currentStep: step,
        applicationOrderReference: requestId,
        gatewayOrder: null,
        gatewayPayment: null,
        transactionHash: null,
        gatewayRequestSent: false,
        walletSignatureProduced: false,
        paymentSubmitted: false,
        settlementVerified: false,
      };
    },
  };
}

/** Local adapter preserves the lifecycle shape without inventing Gateway receipts or settlement. */
export const localPaymentWorkflowAdapter = createPaymentWorkflowAdapter();
