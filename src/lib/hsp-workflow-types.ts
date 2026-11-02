import { z } from "zod";

export const hspWorkflowSteps = [
  "create_order",
  "get_order",
  "prepare_payment",
  "finalize_payment",
  "submit_payment",
  "query_payment",
] as const;

export const hspWorkflowStepSchema = z.enum(hspWorkflowSteps);
export type HspWorkflowStep = typeof hspWorkflowSteps[number];
