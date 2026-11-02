import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createOrder, transitionOrder } from "./order-store";

describe("persistent order state", () => {
  it("prevents duplicate request creation and conflicting replay", async () => {
    const input = { requestId: crypto.randomUUID(), supplierAddress: "0x0000000000000000000000000000000000000001", quoteId: `0x${"01".repeat(32)}`, amountBaseUnits: "100", chainId: 133 } as const;
    const [first, replay] = await Promise.all([createOrder(input), createOrder(input)]);
    expect([first.created, replay.created].filter(Boolean)).toHaveLength(1);
    await expect(createOrder({ ...input, quoteId: `0x${"02".repeat(32)}` })).rejects.toThrow("Idempotency key conflicts");
    await expect(createOrder({ ...input, amountBaseUnits: "101" })).rejects.toThrow("Idempotency key conflicts");
  });

  it("persists allowed transitions and rejects terminal or skipped states", async () => {
    const requestId = crypto.randomUUID();
    await createOrder({ requestId, supplierAddress: "0x0000000000000000000000000000000000000001", quoteId: `0x${"03".repeat(32)}`, amountBaseUnits: "100", chainId: 133 });
    await expect(transitionOrder(requestId, "payment-finalized")).rejects.toThrow("Invalid order transition");
    expect((await transitionOrder(requestId, "approved")).status).toBe("approved");
  });

  it("persists payment failure as terminal and rejects a later success transition", async () => {
    const requestId = crypto.randomUUID();
    await createOrder({ requestId, supplierAddress: "0x0000000000000000000000000000000000000001", quoteId: `0x${"05".repeat(32)}`, amountBaseUnits: "100", chainId: 133 });
    expect((await transitionOrder(requestId, "payment-failed")).status).toBe("payment-failed");
    await expect(transitionOrder(requestId, "payment-submitted")).rejects.toThrow("Invalid order transition");
  });

  it("recovers an order from disk in a fresh Node process", async () => {
    const requestId = crypto.randomUUID();
    const created = await createOrder({ requestId, supplierAddress: "0x0000000000000000000000000000000000000001", quoteId: `0x${"04".repeat(32)}`, amountBaseUnits: "200", chainId: 133 });
    const script = "import { listOrders } from './src/lib/order-store.ts'; console.log(JSON.stringify((await listOrders()).map(order => order.requestId)))";
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { cwd: process.cwd(), encoding: "utf8" });
    expect(JSON.parse(output) as string[]).toContain(requestId);
    expect(created.order.status).toBe("requested");
  });
});
