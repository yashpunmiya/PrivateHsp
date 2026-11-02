"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BadgeCheck, Blocks, CircleDollarSign, Copy, ExternalLink, Fingerprint, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { decryptIdentityBackup, encryptIdentityBackup } from "@/lib/key-backup";
import {
  createStealthAnnouncement, createStealthIdentity, recognizesAnnouncement,
  type StealthAnnouncement, type StealthIdentity,
} from "@/lib/stealth";
import { FeatureIcon, StatusMark, WorkspaceShell } from "../workspace-shell";

type Health = {
  status: "online" | "offline" | "wrong-network";
  network: string;
  chainId: number | null;
  expectedChainId: number;
  blockNumber?: string;
  announcerAddress: string;
  announcerDeployed: boolean;
  mode: string;
};

function shorten(value: string, head = 9, tail = 7) {
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [identity, setIdentity] = useState<StealthIdentity | null>(null);
  const [announcement, setAnnouncement] = useState<StealthAnnouncement | null>(null);
  const [recognized, setRecognized] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [backupMode, setBackupMode] = useState<"export" | "import" | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupConfirmation, setBackupConfirmation] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState("");

  async function refreshHealth() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      setHealth((await response.json()) as Health);
    } catch {
      setHealth(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const data = (await response.json()) as Health;
        if (mounted) setHealth(data);
      } catch {
        if (mounted) setHealth(null);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 30_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!backupMode) return;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = dialog?.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href]");
    controls?.[1]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setBackupMode(null); return; }
      if (event.key !== "Tab" || !controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus(); };
  }, [backupMode]);

  function generateIdentity() {
    setBusy(true);
    setNotice("");
    try {
      setIdentity(createStealthIdentity());
      setAnnouncement(null);
      setRecognized(false);
      setLocalCount(0);
      setNotice("Supplier identity created in this tab. Keep a secure backup before closing it.");
    } catch {
      setNotice("Identity generation failed. Refresh the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  function generateRecipient() {
    if (!identity) return;
    setBusy(true);
    setNotice("");
    try {
      const next = createStealthAnnouncement(identity.metaAddress);
      const match = recognizesAnnouncement(identity, next);
      setAnnouncement(next);
      setRecognized(match);
      setLocalCount((count) => count + 1);
      setNotice(match
        ? "Recipient recognized by this supplier identity. No transaction was sent."
        : "The generated recipient could not be recognized by this identity.");
    } catch {
      setNotice("Recipient generation failed. Check the meta-address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMetaAddress() {
    if (!identity) return;
    try {
      await navigator.clipboard.writeText(identity.metaAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access was blocked by the browser.");
    }
  }

  function openBackup(mode: "export" | "import") {
    setBackupMode(mode);
    setBackupPassphrase("");
    setBackupConfirmation("");
    setBackupFile(null);
    setBackupError("");
  }

  async function saveEncryptedBackup() {
    if (!identity) return;
    if (backupPassphrase !== backupConfirmation) {
      setBackupError("The passphrases do not match.");
      return;
    }
    setBackupBusy(true);
    setBackupError("");
    try {
      const serialized = await encryptIdentityBackup(identity, backupPassphrase);
      const blobUrl = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "privatehsp-encrypted-key-backup.json";
      link.click();
      URL.revokeObjectURL(blobUrl);
      setBackupMode(null);
      setBackupPassphrase("");
      setBackupConfirmation("");
      setNotice("Encrypted backup downloaded. Store its passphrase separately; it cannot be recovered.");
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Could not encrypt this identity.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function restoreEncryptedBackup() {
    if (!backupFile) {
      setBackupError("Choose a PrivateHSP backup file first.");
      return;
    }
    if (backupFile.size > 24_000) {
      setBackupError("Backup file is too large.");
      return;
    }
    setBackupBusy(true);
    setBackupError("");
    try {
      const restored = await decryptIdentityBackup(await backupFile.text(), backupPassphrase);
      setIdentity(restored);
      setAnnouncement(null);
      setRecognized(false);
      setLocalCount(0);
      setBackupMode(null);
      setBackupPassphrase("");
      setNotice("Encrypted identity restored locally. No key material was sent to a server.");
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Could not restore this backup.");
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <WorkspaceShell page="Overview" eyebrow="OPERATIONS OVERVIEW" title="Private commerce, with proof." description="A concise view of supplier activity, receiving identities, and transaction evidence." action={<Link className="button-primary" href="/agents#procurement"><CircleDollarSign size={16} />New procurement</Link>}>
      <div className="overview-stack">
        <section className="metric-grid" aria-label="Workspace summary">
          <article className="metric-card"><div className="metric-label">SUPPLIER SERVICES <FeatureIcon><Network size={17}/></FeatureIcon></div><strong>02</strong><small>Research and market analysis</small></article>
          <article className="metric-card"><div className="metric-label">RECEIVING IDENTITY <FeatureIcon><Fingerprint size={17}/></FeatureIcon></div><strong>{identity ? "01" : "—"}</strong><small>{identity ? "Active in this browser tab" : "Create or restore locally"}</small></article>
          <article className="metric-card"><div className="metric-label">RECIPIENTS THIS SESSION <FeatureIcon><Blocks size={17}/></FeatureIcon></div><strong>{String(localCount).padStart(2,"0")}</strong><small>Generated locally · no transfer sent</small></article>
          <article className="metric-card"><div className="metric-label">HISTORICAL EVIDENCE <FeatureIcon><ShieldCheck size={17}/></FeatureIcon></div><strong>02</strong><small>Sepolia announcement and transfer</small></article>
        </section>

        <section className="overview-grid">
          <article className="surface-card workflow-overview">
            <div className="card-topline"><span className="section-kicker">PROCUREMENT CONTROL</span><StatusMark tone="warning">Approval required</StatusMark></div>
            <h2>Decision-making stays in the right hands.</h2>
            <p>Vertex AI ranks signed offers. Deterministic policy checks the exact quote. A person approves before any payment authorization.</p>
            <div className="authority-flow"><span><i className="flow-node-ai"/>AI recommendation</span><b>→</b><span><i className="flow-node-policy"/>Policy validation</span><b>→</b><span><i className="flow-node-human"/>Your approval</span></div>
            <Link className="text-link" href="/agents#procurement">Start a procurement <ArrowRight size={15}/></Link>
          </article>
          <article className="surface-card network-overview">
            <div className="card-topline"><span className="section-kicker">AGENT NETWORK</span><StatusMark tone="positive">2 services</StatusMark></div>
            <div className="agent-overview-row"><span className="agent-avatar buyer-avatar"><CircleDollarSign size={17}/></span><span><b>Buyer agent</b><small>Ranks verified supplier offers</small></span><span className="agent-role">BUYER</span></div>
            <div className="agent-overview-row"><span className="agent-avatar research-avatar"><BadgeCheck size={17}/></span><span><b>Research brief</b><small>Evidence-led supplier service</small></span><span className="agent-role">SUPPLIER</span></div>
            <div className="agent-overview-row"><span className="agent-avatar market-avatar"><Network size={17}/></span><span><b>Market analysis</b><small>Descriptive statistics service</small></span><span className="agent-role">SUPPLIER</span></div>
            <Link className="text-link" href="/agents#agent-network">View agent network <ArrowRight size={15}/></Link>
          </article>
        </section>

        <section className="surface-card evidence-overview" aria-labelledby="recent-evidence-heading">
          <div className="card-topline"><div><p className="section-kicker">ON-CHAIN ACTIVITY</p><h2 id="recent-evidence-heading">Verified Sepolia evidence</h2></div><Link className="text-link" href="/audit">Open transaction audit <ArrowRight size={15}/></Link></div>
          <p className="section-helper">These are earlier direct testnet transactions. They are not HSP Gateway settlement and do not involve the fresh recipient generated in this workspace.</p>
          <div className="evidence-table">
            <div className="evidence-row evidence-table-head"><span>ACTIVITY</span><span>RECIPIENT</span><span>NETWORK</span><span>STATUS</span><span/></div>
            <div className="evidence-row"><span className="evidence-activity"><i className="evidence-dot dot-cyan"/><span><b>ERC-5564 announcement</b><small>Scheme 1 · block 12,048,171</small></span></span><code>0xAb52…aA33</code><span>Ethereum Sepolia</span><StatusMark tone="positive">Event confirmed</StatusMark><a className="row-action" aria-label="Open announcement transaction" href="https://sepolia.etherscan.io/tx/0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b" target="_blank" rel="noreferrer"><ExternalLink size={15}/></a></div>
            <div className="evidence-row"><span className="evidence-activity"><i className="evidence-dot dot-green"/><span><b>1.000000 test USDC transfer</b><small>Direct transfer · block 12,048,172</small></span></span><code>0xAb52…aA33</code><span>Ethereum Sepolia</span><StatusMark tone="positive">Receipt verified</StatusMark><a className="row-action" aria-label="Open USDC transfer" href="https://sepolia.etherscan.io/tx/0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d" target="_blank" rel="noreferrer"><ExternalLink size={15}/></a></div>
          </div>
          <div className="evidence-provenance"><ShieldCheck size={15}/><span>Historical recipient <code>0xAb52aDA4153fCDd49dC0521Ce7B9f0EfE8B2aA33</code> · independently verified on Ethereum Sepolia</span><Link href="/audit">Inspect evidence</Link></div>
        </section>

        <section className="receiving-layout" id="private-receiving">
          <article className="surface-card receiving-card">
            <div className="card-topline"><div><p className="section-kicker">PRIVATE RECEIVING</p><h2>One identity. Fresh destination addresses.</h2></div><span className="protocol-badge"><Fingerprint size={13}/> ERC-5564 · SCHEME 1</span></div>
            <p className="section-helper">Generate or restore a supplier identity in this browser, then derive a new one-time recipient. Key material never leaves the client.</p>
            {!identity ? <div className="identity-start">
              <div className="identity-visual"><span className="identity-orbit orbit-a"/><span className="identity-orbit orbit-b"/><span className="identity-core"><Fingerprint size={23}/></span><i className="orbit-spark spark-a"/><i className="orbit-spark spark-b"/></div>
              <div><h3>Create a supplier receiving identity</h3><p>Viewing and spending keys are generated independently and held in browser memory. Create an encrypted backup before leaving this page.</p>
                <div className="button-row"><button className="button-primary" onClick={generateIdentity} disabled={busy} aria-busy={busy}>{busy?"Creating identity…":"Generate identity"}<ArrowRight size={15}/></button><button className="button-secondary" onClick={()=>openBackup("import")}>Restore encrypted backup</button></div>
              </div>
            </div> : <div className="identity-active">
              <div className="identity-active-head"><span className="verified-avatar"><ShieldCheck size={18}/></span><span><b>Supplier identity ready</b><small>Two independent secp256k1 key pairs · local session</small></span><StatusMark tone="positive">KEYS LOCAL</StatusMark></div>
              <div className="public-address"><div><small>STEALTH META-ADDRESS</small><code>{shorten(identity.metaAddress, 25, 14)}</code></div><button className="button-secondary button-compact" onClick={copyMetaAddress} aria-label="Copy public stealth meta-address"><Copy size={14}/>{copied?"Copied":"Copy"}</button></div>
              <div className="button-row receiving-actions"><button className="button-primary" onClick={generateRecipient} disabled={busy} aria-busy={busy}>{busy?"Deriving recipient…":"Generate one-time address"}<ArrowRight size={15}/></button><button className="button-secondary" onClick={()=>openBackup("export")}>Download encrypted backup</button></div>
              <p className="privacy-note"><LockKeyhole size={14}/>Private keys remain in memory. A page refresh clears them; restore from the encrypted backup.</p>
            </div>}
            {notice&&<p className="inline-status" role="status">{notice}</p>}
            {announcement&&<div className="recipient-panel"><div className="recipient-panel-head"><span><small>FRESH ONE-TIME RECIPIENT</small><b>{recognized?"Recognized by supplier identity":"Could not recognize recipient"}</b></span><StatusMark tone={recognized?"positive":"warning"}>{recognized?"MATCHED":"CHECK"}</StatusMark></div><code className="recipient-full-address">{announcement.stealthAddress}</code><div className="recipient-meta"><span>View tag <b>{announcement.viewTag}</b></span><span>Ephemeral key <b>{shorten(announcement.ephemeralPublicKey,12,8)}</b></span></div><p className="recipient-disclaimer"><LockKeyhole size={13}/>Local derivation only. No announcement or transfer was sent.</p></div>}
          </article>
          <aside className="surface-card privacy-explainer"><span className="product-icon product-icon-blue"><Fingerprint size={19}/></span><p className="section-kicker">WHAT PRIVACY MEANS HERE</p><h3>Reduce reuse.<br/>Keep claims precise.</h3><p>One-time stealth recipients make it harder to link payments by recipient address alone. Sender, amount, timing, and transaction activity remain visible on a public chain.</p><Link className="text-link" href="/audit">Review verified evidence <ArrowRight size={15}/></Link><div className="privacy-diagram" aria-hidden="true"><i/><i/><i/><span/><span/><span/></div></aside>
        </section>

        <details className="technical-details" id="network-status">
          <summary><span><Activity size={15}/>Network and integration details</span><span className="details-indicator">Show details</span></summary>
          <div className="technical-grid"><div><span>HashKey Testnet RPC</span><StatusMark tone={health?.status==="online"?"positive":"warning"}>{health?.status==="online"?"Connected":health?.status==="wrong-network"?"Wrong network":health?.status==="offline"?"Unavailable":"Checking"}</StatusMark></div><div><span>Observed chain</span><b>{health?.chainId??"—"} / expected 133</b></div><div><span>ERC-5564 announcer</span><b>{health?.announcerDeployed?"Code detected":"Not detected by this check"}</b></div><div><span>HSP payment mode</span><StatusMark tone="warning">Gateway unavailable</StatusMark></div></div>
          <button className="button-secondary button-compact" onClick={()=>void refreshHealth()}><Activity size={14}/>Refresh network check</button>
        </details>
      </div>
      {backupMode && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBackupMode(null); }}>
          <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="backup-title">
            <button className="icon-button dialog-close" aria-label="Close dialog" onClick={() => setBackupMode(null)}>×</button>
            <div className="dialog-symbol"><LockKeyhole size={19} /></div>
            <div className="section-kicker">LOCAL KEY PROTECTION</div>
            <h2 id="backup-title">{backupMode === "export" ? "Encrypt identity backup" : "Recover supplier identity"}</h2>
            <p className="dialog-description">{backupMode === "export"
              ? "The backup is encrypted in this browser with AES-256-GCM. Choose a strong passphrase and keep it separately from the downloaded file."
              : "Choose your encrypted PrivateHSP backup file. Decryption and key validation happen only in this browser."}</p>
            {backupMode === "import" && <label className="form-field">Backup file<input type="file" accept="application/json,.json" onChange={(event) => setBackupFile(event.target.files?.[0] ?? null)} /></label>}
            <label className="form-field">Passphrase<input type="password" autoComplete="new-password" value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} placeholder="At least 12 characters" /></label>
            {backupMode === "export" && <label className="form-field">Confirm passphrase<input type="password" autoComplete="new-password" value={backupConfirmation} onChange={(event) => setBackupConfirmation(event.target.value)} placeholder="Enter it again" /></label>}
            {backupError && <div className="form-alert" role="alert">{backupError}</div>}
            <button className="button-primary dialog-submit" onClick={() => void (backupMode === "export" ? saveEncryptedBackup() : restoreEncryptedBackup())} disabled={backupBusy} aria-busy={backupBusy}>{backupBusy ? "Working locally…" : backupMode === "export" ? "Encrypt and download" : "Decrypt and restore"}<ArrowRight size={15} /></button>
            <div className="dialog-foot"><LockKeyhole size={13} />Private keys are never uploaded.</div>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
