import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const orderStatus = z.enum(["requested", "approved", "payment-prepared", "awaiting-signature", "mandate-finalized", "payment-submitted", "payment-processing", "payment-safe", "payment-finalized", "payment-failed"]);
export const orderInput = z.object({ requestId: z.string().uuid(), supplierAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), quoteId: z.string().regex(/^0x[0-9a-fA-F]{64}$/), amountBaseUnits: z.string().regex(/^[1-9][0-9]*$/), chainId: z.literal(133), status: orderStatus.default("requested") }).strict();
const orderSchema = orderInput.extend({ createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const recordsSchema = z.array(orderSchema);
export type OrderRecord = z.infer<typeof orderSchema>;
const directory = join(process.cwd(), ".privatehsp-data");
const file = join(directory, "orders.json");
let queue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<OrderRecord[]> {
  try { return recordsSchema.parse(JSON.parse(await readFile(file, "utf8"))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Order state is unreadable; refusing to overwrite persisted data");
  }
}

/** Local durable store for non-secret order state. Not suitable for multi-instance/serverless production. */
export async function listOrders(): Promise<OrderRecord[]> { return readRecords(); }
export async function getOrdersForPolicy(): Promise<OrderRecord[]> { return readRecords(); }

export async function createOrder(value: unknown): Promise<{ order: OrderRecord; created: boolean }> {
  const input = orderInput.parse(value);
  let result!: { order: OrderRecord; created: boolean };
  const operation = queue.then(async () => {
    const records = await readRecords();
    const existing = records.find((record) => record.requestId === input.requestId);
    if (existing) {
      if (existing.quoteId !== input.quoteId
          || existing.supplierAddress.toLowerCase() !== input.supplierAddress.toLowerCase()
          || existing.amountBaseUnits !== input.amountBaseUnits
          || existing.chainId !== input.chainId) {
        throw new Error("Idempotency key conflicts with existing order details");
      }
      result = { order: existing, created: false };
      return;
    }
    const now = new Date().toISOString();
    const order = orderSchema.parse({ ...input, createdAt: now, updatedAt: now });
    await mkdir(directory, { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify([...records, order]), { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
    result = { order, created: true };
  });
  queue = operation.then(() => undefined, () => undefined);
  await operation;
  return result;
}

const allowedTransitions: Record<OrderRecord["status"], readonly OrderRecord["status"][]> = {
  requested: ["approved", "payment-failed"], approved: ["payment-prepared", "payment-failed"], "payment-prepared": ["awaiting-signature", "payment-failed"],
  "awaiting-signature": ["mandate-finalized", "payment-failed"], "mandate-finalized": ["payment-submitted", "payment-failed"],
  "payment-submitted": ["payment-processing", "payment-safe", "payment-finalized", "payment-failed"],
  "payment-processing": ["payment-safe", "payment-finalized", "payment-failed"], "payment-safe": ["payment-finalized", "payment-failed"],
  "payment-finalized": [], "payment-failed": [],
};

export async function transitionOrder(requestId: string, status: OrderRecord["status"]): Promise<OrderRecord> {
  let result!: OrderRecord;
  const operation = queue.then(async () => {
    const records = await readRecords();
    const index = records.findIndex((record) => record.requestId === requestId);
    if (index < 0) throw new Error("Order not found");
    const current = records[index];
    if (!allowedTransitions[current.status].includes(status)) throw new Error(`Invalid order transition: ${current.status} -> ${status}`);
    result = orderSchema.parse({ ...current, status, updatedAt: new Date().toISOString() });
    records[index] = result;
    await mkdir(directory, { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(records), { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
  });
  queue = operation.then(() => undefined, () => undefined);
  await operation;
  return result;
}
