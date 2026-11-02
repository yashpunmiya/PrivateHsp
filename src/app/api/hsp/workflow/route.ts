import { NextResponse } from "next/server";
import { z } from "zod";
import { listOrders } from "../../../../lib/order-store";
import { localPaymentWorkflowAdapter } from "../../../../lib/hsp-adapter";
import { hspWorkflowStepSchema, hspWorkflowSteps } from "../../../../lib/hsp-workflow-types";

const requestSchema = z.object({ requestId: z.string().uuid(), step: hspWorkflowStepSchema }).strict();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_workflow_request" }, { status: 400 });
  try {
    const order = (await listOrders()).find((candidate) => candidate.requestId === parsed.data.requestId);
    if (!order || order.status !== "approved") {
      return NextResponse.json({ error: "approved_order_required" }, { status: 409 });
    }
    const adapterResult = await localPaymentWorkflowAdapter.advance(parsed.data.requestId, parsed.data.step);
    const { progress } = adapterResult;
    return NextResponse.json({
      ...adapterResult,
      nextStep: hspWorkflowSteps[progress.completedSteps.length] ?? null,
      flowComplete: progress.completedSteps.length === hspWorkflowSteps.length,
      message: "Workflow checkpoint saved locally. HSP Gateway access is unavailable; no order or payment request was sent.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "workflow_unavailable" }, { status: 409 });
  }
}
