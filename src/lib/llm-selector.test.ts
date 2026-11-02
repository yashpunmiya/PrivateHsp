import { describe, expect, it, vi } from "vitest";
import { selectSupplierWithLlm } from "./llm-selector";

const candidates = [{ agentId: "supplier-a", serviceName: "Research", description: "data", amountBaseUnits: "1", quoteValid: true as const }];
const config = { project: "project-test", location: "global", model: "gemini-test", useVertex: "true" };

describe("Vertex AI supplier ranking", () => {
  it("requires explicit Vertex configuration and ADC, not API-key configuration", async () => {
    await expect(selectSupplierWithLlm("task", candidates, {})).rejects.toThrow("GOOGLE_CLOUD_PROJECT");
    await expect(selectSupplierWithLlm("task", candidates, { ...config, useVertex: "false" })).rejects.toThrow("GEMINI_USE_VERTEX=true");
  });

  it("uses structured JSON output and accepts only a known candidate", async () => {
    const generateContent = vi.fn(async () => ({ text: JSON.stringify({ selectedAgentId: "supplier-a", rationale: "Best task fit" }) }));
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent })).resolves.toMatchObject({ selectedAgentId: "supplier-a" });
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemini-test",
      config: expect.objectContaining({ responseMimeType: "application/json", responseJsonSchema: expect.any(Object), temperature: 0 }),
    }));

    const malicious = vi.fn(async () => ({ text: JSON.stringify({ selectedAgentId: "attacker", rationale: "redirect" }) }));
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: malicious })).rejects.toThrow("unknown supplier");
  });

  it("safely parses a JSON object wrapped in model formatting", async () => {
    const wrapped = vi.fn(async () => ({ text: '```json\n{"selectedAgentId":"supplier-a","rationale":"Best task fit"}\n```' }));
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: wrapped })).resolves.toMatchObject({ selectedAgentId: "supplier-a" });
  });

  it("retries one transient provider timeout without changing the candidate set", async () => {
    const generateContent = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("gateway timeout"), { status: 504 }))
      .mockResolvedValueOnce({ text: JSON.stringify({ selectedAgentId: "supplier-a", rationale: "Best task fit" }) });
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent })).resolves.toMatchObject({ selectedAgentId: "supplier-a" });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed, incomplete, and empty model output", async () => {
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: async () => ({ text: "not json" }) })).rejects.toThrow("invalid JSON");
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: async () => ({ text: JSON.stringify({ selectedAgentId: "supplier-a" }) }) })).rejects.toThrow();
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: async () => ({ text: " " }) })).rejects.toThrow("no structured ranking");
  });

  it("maps provider failures without returning sensitive provider details", async () => {
    const generateContent = vi.fn(async () => { throw Object.assign(new Error("request failed ya29.secret-token"), { status: 403 }); });
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent })).rejects.toThrow("HTTP 403");
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: async () => { throw Object.assign(new Error("upstream timeout"), { status: 504 }); } })).rejects.toThrow("timed out (HTTP 504)");
    await expect(selectSupplierWithLlm("task", candidates, { ...config, generateContent: async () => { throw new Error("Could not load the default credentials"); } })).rejects.toThrow("gcloud auth application-default login");
  });
});
