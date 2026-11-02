"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleAlert, Copy, ExternalLink, FileSearch, ShieldCheck } from "lucide-react";

type VerificationResult = {
  valid?: boolean;
  evidenceType?: string;
  hspSettlementVerified?: boolean;
  checks?: Record<string, boolean>;
  error?: string;
};

const evidence = {
  chainId: 11155111,
  token: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  from: "0xae0D850f81a4224e0fA8CeD2f0026206D16Bc1F3",
  to: "0xAb52aDA4153fCDd49dC0521Ce7B9f0EfE8B2aA33",
  amountBaseUnits: "1000000",
  transactionHash: "0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d",
  blockNumber: "12048172",
};

export default function AuditWorkbench() {
  const [bundle, setBundle] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function verifyEvidence(value: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/audit/verify", { method: "POST", headers: { "content-type": "application/json" }, body: value });
      const data = await response.json() as VerificationResult;
      if (!response.ok && response.status !== 422) throw new Error("The verification service is unavailable. Check your connection and try again.");
      setResult(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The evidence could not be checked."); }
    finally { setBusy(false); }
  }

  async function copyHash() {
    try { await navigator.clipboard.writeText(evidence.transactionHash); setCopied(true); window.setTimeout(()=>setCopied(false),1500); }
    catch { setError("Clipboard access is unavailable. Select the transaction hash to copy it."); }
  }

  return <div className="audit-workbench">
    <section className="surface-card transaction-detail-card">
      <div className="transaction-detail-heading"><span className="transaction-icon"><CircleAlert size={18}/></span><div><p className="section-kicker">DIRECT TESTNET TRANSFER</p><h2>1.000000 test USDC</h2><p>Ethereum Sepolia · Block 12,048,172</p></div><span className="verified-label"><i/>RECEIPT VERIFIED</span></div>
      <div className="transaction-route"><div><small>SENDER</small><code>{evidence.from}</code><span>Sepolia development wallet</span></div><span className="route-arrow">→</span><div><small>HISTORICAL RECIPIENT</small><code>{evidence.to}</code><span>Supplier-recognized stealth address</span></div></div>
      <div className="transaction-facts"><div><small>ASSET CONTRACT</small><code>{evidence.token}</code></div><div><small>NETWORK</small><b>Ethereum Sepolia · 11155111</b></div><div><small>ANNOUNCEMENT</small><a href="https://sepolia.etherscan.io/tx/0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b" target="_blank" rel="noreferrer">Open ERC-5564 event <ExternalLink size={13}/></a></div></div>
      <div className="transaction-hash-row"><span><small>TRANSFER TRANSACTION</small><code>{evidence.transactionHash}</code></span><button className="button-secondary button-compact" onClick={()=>void copyHash()}><Copy size={13}/>{copied?"Copied":"Copy hash"}</button><a className="button-secondary button-compact" href={`https://sepolia.etherscan.io/tx/${evidence.transactionHash}`} target="_blank" rel="noreferrer">Explorer <ExternalLink size={13}/></a></div>
      <p className="audit-disclaimer"><ShieldCheck size={15}/>This is independently verified direct testnet transfer evidence. It is not an HSP Gateway payment. This stored evidence verifies the token transfer and receipt; it does not include a signed quote or recipient-control signature bundle.</p>
    </section>

    <section className="surface-card verify-evidence-card">
      <div className="verify-heading"><span className="verify-icon"><FileSearch size={18}/></span><div><p className="section-kicker">INDEPENDENT VERIFICATION</p><h2>Check the transaction evidence</h2><p>The verifier reads the transaction, successful receipt, block, calldata, and emitted USDC transfer event.</p></div></div>
      <div className="verification-checklist"><span><Check size={14}/>Sepolia chain ID</span><span><Check size={14}/>USDC transfer calldata</span><span><Check size={14}/>Successful receipt and block</span><span><Check size={14}/>Matching Transfer event</span></div>
      <div className="verify-actions"><button disabled={busy} aria-busy={busy} className="button-primary" onClick={()=>{const value=JSON.stringify(evidence);setBundle(value);void verifyEvidence(value);}}>{busy?"Verifying on-chain…":"Verify this payment"}<ArrowRight size={15}/></button><a className="text-link" href={`https://sepolia.etherscan.io/tx/${evidence.transactionHash}`} target="_blank" rel="noreferrer">View on Sepolia Etherscan <ExternalLink size={14}/></a></div>
      <details className="technical-details embedded-details"><summary><span>Advanced evidence input</span><span className="details-indicator">Paste JSON</span></summary><label className="sr-only" htmlFor="audit-evidence">Evidence JSON</label><textarea id="audit-evidence" className="evidence-json-input" value={bundle} onChange={(event)=>setBundle(event.target.value)} spellCheck={false} placeholder="Paste a supported transfer evidence bundle"/><button disabled={busy||!bundle.trim()} className="button-secondary" onClick={()=>void verifyEvidence(bundle)} aria-busy={busy}>{busy?"Verifying…":"Verify custom evidence"}<ArrowRight size={14}/></button></details>
      {error&&<div role="alert" className="form-alert"><CircleAlert size={16}/><span>{error}</span><button className="text-link" onClick={()=>void verifyEvidence(bundle)}>Retry <ArrowRight size={14}/></button></div>}
      {result&&<section className={`verification-result ${result.valid?"verification-valid":"verification-invalid"}`} aria-live="polite"><div className="result-status-icon">{result.valid?<ShieldCheck size={19}/>:<CircleAlert size={19}/>}</div><div className="result-summary"><b>{result.valid?"Transaction evidence verified":"Evidence could not be verified"}</b><small>{result.valid?"The on-chain transfer matches the submitted network, token, amount, and recipient.":"At least one required evidence check failed. Review the details and try again."}</small><span>HSP settlement: <strong>{result.hspSettlementVerified?"verified":"not verified by this evidence"}</strong></span></div>{result.checks&&<div className="result-check-grid">{Object.entries(result.checks).map(([name,valid])=><span key={name} className={valid?"check-pass":"check-fail"}><i/>{name.replace(/[A-Z]/g,letter=>` ${letter.toLowerCase()}`)} · {valid?"pass":"failed"}</span>)}</div>}<details className="technical-details result-raw"><summary><span>Verification response</span><span className="details-indicator">Technical detail</span></summary><pre>{JSON.stringify(result,null,2)}</pre></details></section>}
    </section>
  </div>;
}
