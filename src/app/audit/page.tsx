import { ActivityIcon, WorkspaceShell } from "../workspace-shell";
import AuditWorkbench from "./workbench";

export default function AuditPage() {
  return <WorkspaceShell page="Activity & audit" eyebrow="TRANSACTION EVIDENCE" title="Verify what happened on-chain." description="Inspect the transaction, receipt, block, and token event against the recorded Sepolia evidence.">
    <div className="audit-page-stack">
      <div className="audit-provenance-note"><ActivityIcon/><span><b>Evidence provenance</b><small>The records below are direct Ethereum Sepolia test transfers. They are not HSP Gateway settlements.</small></span></div>
      <AuditWorkbench />
    </div>
  </WorkspaceShell>;
}
