import { BadgeCheck, Network, ScanSearch, ShieldCheck } from "lucide-react";
import AgentWorkbench from "./workbench";
import { SectionHeading, StatusMark, WorkspaceShell } from "../workspace-shell";

const suppliers = [
  { name: "Research brief", kind: "RESEARCH SERVICE", detail: "Evidence-led summaries from requester-provided documents.", icon: ScanSearch, endpoint: "/api/agents/research-brief" },
  { name: "Market analysis", kind: "ANALYTICS SERVICE", detail: "Descriptive statistics computed from supplied observations.", icon: Network, endpoint: "/api/agents/market-analysis" },
];

export default function AgentsPage() {
  return <WorkspaceShell page="Agent network" eyebrow="AGENT OPERATIONS" title="A network built for accountable decisions." description="Two supplier services exchange requests with the buyer agent. Signed terms and explicit policy checks keep procurement inspectable.">
    <div className="agents-page-stack">
      <section className="supplier-network-section" id="agent-network">
        <SectionHeading kicker="CONNECTED SERVICES" title="Agent network"><StatusMark tone="positive">2 supplier services</StatusMark></SectionHeading>
        <div className="agent-network-visual" aria-label="Buyer agent connected to two supplier services">
          <div className="network-agent buyer-agent-card"><span className="network-agent-icon buyer-avatar"><ShieldCheck size={19}/></span><div><small>BUYER AGENT</small><b>PrivateHSP Procurement</b><span>Ranks signed offers · no payment authority</span></div><StatusMark tone="positive">ACTIVE</StatusMark></div>
          <div className="supplier-network-cards">{suppliers.map(({name,kind,detail,icon:Icon,endpoint})=><article className="network-agent supplier-agent-card" key={name}><span className="network-agent-icon"><Icon size={18}/></span><div><small>{kind}</small><b>{name}</b><span>{detail}</span></div><span className="service-endpoint">{endpoint}</span><StatusMark tone="positive">LOCAL A2A</StatusMark></article>)}</div>
        </div>
        <p className="network-note"><BadgeCheck size={15}/>Offers use separate supplier signing identities. Each quote is verified against its configured supplier before review.</p>
      </section>

      <section id="procurement" className="procurement-section">
        <SectionHeading kicker="PROCUREMENT" title="Find the right supplier"><span className="section-step-label">REQUEST → REVIEW → APPROVE</span></SectionHeading>
        <AgentWorkbench />
      </section>
    </div>
  </WorkspaceShell>;
}
