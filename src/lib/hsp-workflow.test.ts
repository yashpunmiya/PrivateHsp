import { describe, expect, it } from "vitest";
import { advanceHspWorkflow, getHspWorkflow, hspWorkflowSteps } from "./hsp-workflow";

describe("local payment workflow checkpoints", () => {
  it("requires each checkpoint in order and replays a completed checkpoint idempotently", async () => {
    const requestId = crypto.randomUUID();
    await expect(advanceHspWorkflow(requestId, "prepare_payment")).rejects.toThrow("prior workflow step");
    const first = await advanceHspWorkflow(requestId, "create_order");
    const replay = await advanceHspWorkflow(requestId, "create_order");
    expect(replay.completedSteps).toEqual(first.completedSteps);
    for (const step of hspWorkflowSteps.slice(1)) await advanceHspWorkflow(requestId, step);
    expect((await getHspWorkflow(requestId))?.completedSteps).toEqual(hspWorkflowSteps);
  });
});
