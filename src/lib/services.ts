import { z } from "zod";

export const marketAnalysisRequest = z.object({
  requestId: z.string().uuid(),
  series: z.array(z.number().finite()).min(2).max(10_000),
}).strict();

export const researchBriefRequest = z.object({
  requestId: z.string().uuid(),
  question: z.string().trim().min(5).max(500),
  documents: z.array(z.object({ title: z.string().min(1).max(200), text: z.string().min(1).max(20_000) }).strict()).min(1).max(20),
}).strict();

export function analyzeSeries(value: unknown) {
  const { requestId, series } = marketAnalysisRequest.parse(value);
  const total = series.reduce((sum, n) => sum + n, 0);
  return { agentId: "privatehsp.market-analysis.v1", requestId, source: "requester-supplied-series", count: series.length, mean: total / series.length, minimum: Math.min(...series), maximum: Math.max(...series), change: series.at(-1)! - series[0]! };
}

export function createResearchBrief(value: unknown) {
  const { requestId, question, documents } = researchBriefRequest.parse(value);
  const terms = [...new Set(question.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])];
  const findings = documents.map(({ title, text }) => {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const ranked = sentences.map((sentence, index) => ({ sentence, index, score: terms.reduce((sum, term) => sum + (sentence.toLowerCase().includes(term) ? 1 : 0), 0) }))
      .filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3);
    return { title, excerpts: ranked.map(({ sentence }) => sentence), matchedTerms: terms.filter((term) => text.toLowerCase().includes(term)) };
  });
  return { agentId: "privatehsp.research-brief.v1", requestId, source: "requester-supplied-documents", question, findings };
}
