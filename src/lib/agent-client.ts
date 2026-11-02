import { z } from "zod";

const responseSchema = z.object({ agentId: z.string(), requestId: z.string().uuid(), source: z.string() }).passthrough();

/** A2A over HTTP; each supplier agent validates and executes its own service request. */
export async function requestSupplierAgent<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body), signal });
  if (!response.ok) throw new Error(`Supplier agent returned HTTP ${response.status}`);
  const parsed = responseSchema.parse(await response.json());
  return parsed as T;
}
