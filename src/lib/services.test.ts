import { describe, expect, it } from "vitest";
import { analyzeSeries, createResearchBrief } from "./services";
import { requestSupplierAgent } from "./agent-client";

describe("supplier agent services and A2A client", () => {
  const requestId = "f78d81dd-95f6-4ae8-a219-78ecb18be201";
  it("analyzes requester supplied observations and rejects malformed requests", () => {
    expect(analyzeSeries({ requestId, series: [2, 4, 6] })).toMatchObject({ count: 3, mean: 4, minimum: 2, maximum: 6, change: 4, source: "requester-supplied-series" });
    expect(() => analyzeSeries({ requestId, series: [1] })).toThrow();
  });
  it("extracts question relevant evidence from supplied documents", () => {
    expect(createResearchBrief({ requestId, question: "market growth trend?", documents: [{ title: "A", text: "Market growth increased. Other unrelated words." }] })).toMatchObject({ findings: [{ excerpts: ["Market growth increased."], matchedTerms: ["market", "growth"] }] });
  });
  it("sends a typed request to an agent and rejects non-success responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ agentId: "supplier.one", requestId, source: "submitted" }), { status: 200 });
    try { await expect(requestSupplierAgent("http://supplier.test", { requestId })).resolves.toMatchObject({ agentId: "supplier.one" }); }
    finally { globalThis.fetch = originalFetch; }
  });
});
