import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { hspWorkflowSteps, hspWorkflowStepSchema, type HspWorkflowStep } from "./hsp-workflow-types";
export { hspWorkflowSteps, hspWorkflowStepSchema } from "./hsp-workflow-types";
const recordSchema = z.object({
  requestId: z.string().uuid(),
  completedSteps: z.array(hspWorkflowStepSchema).max(hspWorkflowSteps.length),
  updatedAt: z.string().datetime(),
}).strict().superRefine((record, context) => {
  if (new Set(record.completedSteps).size !== record.completedSteps.length
      || record.completedSteps.some((step, index) => step !== hspWorkflowSteps[index])) {
    context.addIssue({ code: "custom", message: "Stored workflow steps must be unique and ordered" });
  }
});
const recordsSchema = z.array(recordSchema);
export type HspWorkflowRecord = z.infer<typeof recordSchema>;

const directory = join(process.cwd(), ".privatehsp-data");
const file = join(directory, "hsp-workflows.json");
let queue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<HspWorkflowRecord[]> {
  try { return recordsSchema.parse(JSON.parse(await readFile(file, "utf8"))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Local workflow state is unreadable; refusing to overwrite it");
  }
}

export async function getHspWorkflow(requestId: string): Promise<HspWorkflowRecord | undefined> {
  return (await readRecords()).find((record) => record.requestId === requestId);
}

/** Advances a local workflow ledger only. It never calls HSP, signs, or submits a payment. */
export async function advanceHspWorkflow(requestId: string, step: HspWorkflowStep): Promise<HspWorkflowRecord> {
  let result!: HspWorkflowRecord;
  const operation = queue.then(async () => {
    const records = await readRecords();
    const index = records.findIndex((record) => record.requestId === requestId);
    const current = index < 0 ? { requestId, completedSteps: [], updatedAt: new Date().toISOString() } : records[index];
    const stepIndex = hspWorkflowSteps.indexOf(step);
    if (stepIndex < current.completedSteps.length) {
      if (current.completedSteps[stepIndex] !== step) throw new Error("Workflow step conflicts with saved progress");
      result = current;
      return;
    }
    if (stepIndex !== current.completedSteps.length) throw new Error("Complete the prior workflow step first");
    result = recordSchema.parse({ ...current, completedSteps: [...current.completedSteps, step], updatedAt: new Date().toISOString() });
    if (index < 0) records.push(result);
    else records[index] = result;
    await mkdir(directory, { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(records), { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
  });
  queue = operation.then(() => undefined, () => undefined);
  await operation;
  return result;
}
