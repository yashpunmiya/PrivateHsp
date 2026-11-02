"use client";

import { useState } from "react";
import { ArrowRight, BadgeCheck, CircleDollarSign, ExternalLink, LockKeyhole, Network, ShieldCheck, Sparkles } from "lucide-react";
import { StatusMark } from "../workspace-shell";
import { createStealthAnnouncement } from "@/lib/stealth";
import type { SignedSupplierQuote } from "@/lib/quotes";
import { hspWorkflowSteps, type HspWorkflowStep } from "@/lib/hsp-workflow-types";

type Offer = { agentId: string; quote: SignedSupplierQuote; recipient: `0x${string}` };
const historicalRecipient = "0xAb52aDA4153fCDd49dC0521Ce7B9f0EfE8B2aA33";
const announcementTx = "0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b";
const transferTx = "0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d";
const workflowLabels: Record<HspWorkflowStep, string> = {
  create_order: "Create order",
  get_order: "Review order",
  prepare_payment: "Prepare payment",
  finalize_payment: "Finalize mandate",
  submit_payment: "Submit payment",
  query_payment: "Check payment status",
};

function id() { return crypto.randomUUID(); }
function formatTokenAmount(amount: string, decimals: number) {
  if (decimals === 0) return amount;
  const base = amount.padStart(decimals + 1, "0");
  const whole = base.slice(0, -decimals) || "0";
  const fraction = decimals ? base.slice(-decimals).replace(/0+$/, "") : "";
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortAddress(address: string) { return `${address.slice(0, 8)}…${address.slice(-6)}`; }

export default function AgentWorkbench() {
  const [series, setSeries] = useState("101, 103, 99, 108");
  const [analysis, setAnalysis] = useState("");
  const [question, setQuestion] = useState("What does the market growth data indicate?");
  const [doc, setDoc] = useState("The market growth increased in the latest period. Operating costs remained stable.");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState("Find the best supplier for a research task");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requestId, setRequestId] = useState("");
  const [approvedSuppliers, setApprovedSuppliers] = useState("");
  const [cap, setCap] = useState("1000000");
  const [selected, setSelected] = useState<Offer | null>(null);
  const [recommendation, setRecommendation] = useState("");
  const [policyReason, setPolicyReason] = useState("");
  const [approved, setApproved] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [completedSteps, setCompletedSteps] = useState<HspWorkflowStep[]>([]);
  const [workflowBusy, setWorkflowBusy] = useState(false);

  async function agentCall(path: string, body: unknown, done: (value: string) => void) {
    setBusy(true); setError("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Supplier service could not complete the request.");
      done(JSON.stringify(data, null, 2));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Supplier service request failed."); }
    finally { setBusy(false); }
  }

  async function loadOffers() {
    setBusy(true); setError(""); setSelected(null); setApproved(false); setWorkflowMessage(""); setCompletedSteps([]); setRecommendation("");
    try {
      const response = await fetch("/api/agents/offers", { cache: "no-store" });
      const payload = await response.json() as { offers?: Array<{ agentId: string; quote: SignedSupplierQuote }>; detail?: string };
      if (!response.ok || !payload.offers) throw new Error(payload.detail ?? "Supplier offers are unavailable.");
      setOffers(payload.offers.map(({ agentId, quote }) => ({ agentId, quote, recipient: createStealthAnnouncement(quote.stealthMetaAddress).stealthAddress })));
      setRequestId(id());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load supplier offers."); }
    finally { setBusy(false); }
  }

  async function selectSupplier(payerApproved: boolean) {
    if (!requestId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/buyer/procurement", { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(50_000), body: JSON.stringify({
        task, requestId, payerApproved, approvedQuoteId: payerApproved ? selected?.quote.quoteId : undefined, offers,
        policy: { approvedSuppliers: approvedSuppliers.split(",").map((s) => s.trim()).filter(Boolean), allowedToken: offers[0]?.quote.tokenAddress, maxAmountBaseUnits: cap },
      }) });
      const result = await response.json() as { error?: string; message?: string; status?: string; recommendation?: { selectedAgentId: string; rationale: string }; selectedOffer?: Offer; policy?: { allowed?: boolean; reason?: string } };
      if (!response.ok && response.status !== 202) throw new Error(result.message ?? result.error ?? "Buyer policy request failed.");
      if (result.selectedOffer) setSelected(result.selectedOffer);
      setRecommendation(result.recommendation?.rationale ?? "");
      setPolicyReason(result.policy?.reason ?? "");
      setApproved(result.status === "approved-for-preparation");
      if (payerApproved && result.status === "approved-for-preparation") { setCompletedSteps([]); setWorkflowMessage(""); }
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === "TimeoutError"
        ? "Supplier evaluation timed out. No payment was started; retry the evaluation."
        : cause instanceof Error ? cause.message : "Buyer policy request failed.");
    }
    finally { setBusy(false); }
  }

  async function continuePaymentWorkflow() {
    const step = hspWorkflowSteps[completedSteps.length];
    if (!step || !requestId) return;
    setWorkflowBusy(true); setWorkflowMessage("");
    try {
      const response = await fetch("/api/hsp/workflow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId, step }) });
      const result = await response.json() as { progress?: { completedSteps: HspWorkflowStep[] }; message?: string; error?: string };
      if (!response.ok || !result.progress) throw new Error(result.error ?? "Workflow step could not be recorded.");
      setCompletedSteps(result.progress.completedSteps);
      setWorkflowMessage(result.message ?? "Workflow checkpoint saved locally.");
    } catch (cause) {
      setWorkflowMessage(cause instanceof Error ? cause.message : "Workflow is currently unavailable.");
    } finally { setWorkflowBusy(false); }
  }

  return <div className="procurement-workflow" id="payment-workflow">
    <section className="surface-card procurement-card">
      <div className="procurement-heading"><div><p className="section-kicker">NEW REQUEST</p><h2>What should the agents source?</h2><p>Describe the work. The buyer agent will rank only the signed offers loaded below.</p></div><span className="workflow-progress"><i className="is-current"/><i className={offers.length?"is-current":""}/><i className={recommendation?"is-current":""}/><i className={approved?"is-current":""}/></span></div>
      <label className="form-field" htmlFor="procurement-task">Procurement request<textarea id="procurement-task" rows={3} value={task} onChange={(e)=>setTask(e.target.value)} maxLength={1000} placeholder="Describe the service and what a good result should include." /></label>
      <div className="procurement-action-row"><button disabled={busy||!task.trim()} aria-busy={busy} onClick={()=>void loadOffers()} className="button-secondary">{busy&&!offers.length?"Loading offers…":"Load signed supplier offers"}<ArrowRight size={15}/></button><span className="helper-inline"><LockKeyhole size={13}/>Private keys remain server-side</span></div>
      {error&&<div role="alert" className="form-alert">{error}<button className="text-link" onClick={()=>void(offers.length?selectSupplier(false):loadOffers())}>{offers.length?"Retry evaluation":"Try again"} <ArrowRight size={14}/></button></div>}

      {offers.length>0&&<div className="offer-section" id="offers">
        <div className="offer-section-heading"><div><p className="section-kicker">SIGNED OFFERS</p><h3>Compare verified supplier terms</h3></div><StatusMark tone="positive">2 signatures verified</StatusMark></div>
        <div className="offer-grid">{offers.map((offer,index)=><article key={offer.agentId} className={`offer-card ${selected?.agentId===offer.agentId?"offer-selected":""}`}>
          <div className="offer-card-top"><span className={`offer-mark ${index?"offer-mark-blue":""}`}>{index?<Network size={18}/>:<BadgeCheck size={18}/>}</span><span className="offer-index">OFFER 0{index+1}</span><StatusMark tone="positive">SIGNED</StatusMark></div>
          <h3>{offer.quote.serviceName}</h3><p className="offer-description">{offer.quote.description}</p>
          <div className="offer-price"><strong>{formatTokenAmount(offer.quote.amountBaseUnits,offer.quote.tokenDecimals)}</strong><span>token units</span></div>
          <dl className="offer-facts"><div><dt>Supplier</dt><dd title={offer.quote.supplierAddress}>{shortAddress(offer.quote.supplierAddress)}</dd></div><div><dt>Signature</dt><dd><ShieldCheck size={13}/> Verified against supplier</dd></div><div><dt>Valid until</dt><dd>{new Date(offer.quote.expiresAt*1000).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</dd></div></dl>
          <details className="offer-technical"><summary>Quote and payment terms</summary><div><span>Quote ID</span><code>{shortAddress(offer.quote.quoteId)}</code><span>Token contract</span><code>{offer.quote.tokenAddress}</code><span>Fresh proposed recipient</span><code>{offer.recipient}</code><span>Payment network</span><b>HashKey Testnet · 133</b><span>Terms</span><b>{offer.quote.providerTerms}</b></div></details>
          {selected?.agentId===offer.agentId&&<div className="selected-label"><ShieldCheck size={14}/> AI recommendation</div>}
        </article>)}</div>

        <div className="policy-panel">
          <div className="policy-panel-title"><span className="policy-icon"><ShieldCheck size={18}/></span><span><b>Deterministic payment policy</b><small>Configure who may be paid and the maximum amount.</small></span></div>
          <div className="policy-fields"><label className="form-field" htmlFor="approved-suppliers">Approved supplier addresses<textarea id="approved-suppliers" rows={2} value={approvedSuppliers} onChange={(e)=>setApprovedSuppliers(e.target.value)} placeholder="Add one or more supplier addresses, separated by commas" spellCheck={false}/><span className="field-help">Only listed suppliers can pass policy checks.</span></label><label className="form-field" htmlFor="spend-cap">Maximum amount in token base units<input id="spend-cap" inputMode="numeric" pattern="[0-9]*" value={cap} onChange={(e)=>setCap(e.target.value)} /><span className="field-help">Current quote: {offers[0]?.quote.tokenDecimals} decimals. Token support is not confirmed by live HSP configuration.</span></label></div>
          <div className="policy-actions"><button className="text-link" onClick={()=>setApprovedSuppliers(offers.map(offer=>offer.quote.supplierAddress).join(", "))}>Add both verified suppliers to the allowlist</button><button disabled={busy||!approvedSuppliers.trim()||!cap.trim()} aria-busy={busy} onClick={()=>void selectSupplier(false)} className="button-primary">{busy?"Evaluating offers…":"Evaluate offers with Vertex"}<Sparkles size={15}/></button></div>
        </div>
      </div>}

      {recommendation&&selected&&<section className="recommendation-panel" aria-live="polite">
        <div className="recommendation-header"><span className="recommendation-icon"><Sparkles size={18}/></span><div><p className="section-kicker">VERTEX AI RECOMMENDATION</p><h3>{selected.quote.serviceName}</h3></div><StatusMark tone={policyReason==="authorized"?"positive":"warning"}>{policyReason==="authorized"?"POLICY PASSED":"POLICY REVIEW"}</StatusMark></div>
        <p className="recommendation-copy">{recommendation}</p>
        <div className="policy-checks"><span><ShieldCheck size={14}/>Signature valid</span><span><BadgeCheck size={14}/>Quote within validity</span><span><CircleDollarSign size={14}/>Spend cap {policyReason==="authorized"?"passed":"requires approval"}</span><span><Network size={14}/>Supplier {approvedSuppliers.toLowerCase().includes(selected.quote.supplierAddress.toLowerCase())?"allowlisted":"not allowlisted"}</span></div>
        <div className="review-quote"><div><small>EXACT QUOTE FOR REVIEW</small><b>{selected.quote.serviceName}</b></div><div><small>AMOUNT</small><b>{formatTokenAmount(selected.quote.amountBaseUnits,selected.quote.tokenDecimals)} token units</b></div><div><small>RECIPIENT · FRESH, NOT PUBLISHED</small><code>{selected.recipient}</code></div><div><small>QUOTE ID</small><code>{selected.quote.quoteId}</code></div></div>
        <p className="authorization-note"><LockKeyhole size={15}/>Vertex cannot authorize payment. Your approval below is recorded against this exact signed quote and policy.</p>
        <button disabled={busy||approved||policyReason!=="human-approval-required"} aria-busy={busy} onClick={()=>void selectSupplier(true)} className="button-primary approval-button">{approved?"Exact quote approved":"Approve this exact quote"}<ArrowRight size={15}/></button>
      </section>}
    </section>

    {approved&&<section className="surface-card payment-workflow-card">
      <div className="gateway-heading"><span className="gateway-icon"><CircleDollarSign size={19}/></span><div><p className="section-kicker">PAYMENT WORKFLOW</p><h2>Authorization recorded</h2><p>The exact signed quote is approved. Continue through the workflow checkpoints.</p></div><StatusMark tone="warning">GATEWAY UNAVAILABLE</StatusMark></div>
      <div className="truthful-callout"><LockKeyhole size={16}/><span><b>Gateway connection is unavailable</b><small>These checkpoints are saved locally only. No HSP order, wallet signature, payment submission, or settlement verification has occurred.</small></span></div>
      <div className="gateway-flow">{hspWorkflowSteps.map((step,index)=><article className={`gateway-step ${completedSteps.includes(step)?"step-done":""}`} key={step}><span className="gateway-step-index">{String(index+1).padStart(2,"0")}</span><span><b>{workflowLabels[step]}</b><small>{completedSteps.includes(step)?"Checkpoint saved locally":index===completedSteps.length?"Ready to continue":"Waiting for prior step"}</small></span><span className="step-status">{completedSteps.includes(step)?"SAVED":index===completedSteps.length?"NEXT":"WAITING"}</span></article>)}</div>
      {completedSteps.length===hspWorkflowSteps.length&&<div className="workflow-complete" role="status"><ShieldCheck size={17}/><span><b>Workflow checkpoints complete</b><small>All six checkpoints are stored locally. No HSP payment exists for this request.</small></span></div>}
      <div className="gateway-footer"><button disabled={workflowBusy||completedSteps.length===hspWorkflowSteps.length} aria-busy={workflowBusy} onClick={()=>void continuePaymentWorkflow()} className="button-primary">{workflowBusy?"Saving checkpoint…":completedSteps.length===hspWorkflowSteps.length?"Workflow steps saved":"Continue workflow"}<ArrowRight size={15}/></button><span className="workflow-feedback" role="status">{workflowMessage || "The approved order remains unchanged until a live Gateway is available."}</span></div>
    </section>}

    <section className="historical-evidence-card">
      <div className="historical-evidence-symbol"><ShieldCheck size={18}/></div><div className="historical-evidence-copy"><p className="section-kicker">SEPARATE VERIFIED EVIDENCE</p><h3>Earlier Sepolia testnet transactions</h3><p>These real transactions used historical recipient <code>{historicalRecipient}</code>. They are not payments to the fresh address above and are not HSP settlement.</p></div><div className="historical-actions"><a href={`https://sepolia.etherscan.io/tx/${announcementTx}`} target="_blank" rel="noreferrer">Announcement <ExternalLink size={14}/></a><a href={`https://sepolia.etherscan.io/tx/${transferTx}`} target="_blank" rel="noreferrer">1 USDC transfer <ExternalLink size={14}/></a><a href="/audit">Verify evidence <ArrowRight size={14}/></a></div>
    </section>

    <details className="technical-details supplier-testing-details"><summary><span><Network size={15}/>Supplier service test tools</span><span className="details-indicator">Optional technical checks</span></summary><p className="section-helper">Send sample inputs to the two local supplier HTTP services. These checks do not authorize or initiate a payment.</p><div className="service-test-grid"><section><h3>Market analysis</h3><label className="form-field">Observations<input value={series} onChange={(e)=>setSeries(e.target.value)} /></label><button disabled={busy} className="button-secondary" onClick={()=>{const values=series.split(",").map((s)=>Number(s.trim()));void agentCall("/api/agents/market-analysis",{requestId:id(),series:values},setAnalysis);}}>Request market analysis</button>{analysis&&<pre>{analysis}</pre>}</section><section><h3>Research brief</h3><label className="form-field">Question<input value={question} onChange={(e)=>setQuestion(e.target.value)} /></label><label className="form-field">Source text<textarea value={doc} onChange={(e)=>setDoc(e.target.value)}/></label><button disabled={busy} className="button-secondary" onClick={()=>void agentCall("/api/agents/research-brief",{requestId:id(),question,documents:[{title:"Requester source",text:doc}]},setBrief)}>Request research brief</button>{brief&&<pre>{brief}</pre>}</section></div>
    </details>
  </div>;
}
