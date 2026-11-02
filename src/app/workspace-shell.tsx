"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity, ArrowUpRight, Boxes, CircleDollarSign, Command, Fingerprint,
  LayoutDashboard, Menu, Network, ScanSearch, ShieldCheck, X,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/app", icon: LayoutDashboard, path: "/app" },
  { label: "Agent network", href: "/agents#agent-network", icon: Network, path: "/agents" },
  { label: "Procurement", href: "/agents#procurement", icon: ScanSearch, path: "/agents" },
  { label: "Payment workflow", href: "/agents#payment-workflow", icon: CircleDollarSign, path: "/agents" },
  { label: "Private receiving", href: "/app#private-receiving", icon: Fingerprint, path: "/app" },
  { label: "Activity & audit", href: "/audit", icon: ShieldCheck, path: "/audit" },
];

export function WorkspaceShell({
  children,
  page,
  title,
  description,
  eyebrow = "PRIVATEHSP WORKSPACE",
  action,
}: {
  children: ReactNode;
  page: string;
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHash = () => setCurrentSection(window.location.hash.slice(1));
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    sidebarRef.current?.querySelector<HTMLAnchorElement>(".workspace-nav-link")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="workspace-shell">
      {menuOpen && <button className="workspace-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside ref={sidebarRef} className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="workspace-brand-row"><Link className="workspace-brand" href="/" aria-label="PrivateHSP home">
          <span className="brand-symbol" aria-hidden="true"><Command size={19} strokeWidth={2.2} /></span>
          <span><strong>PrivateHSP</strong><small>PRIVATE COMMERCE</small></span>
        </Link><button className="icon-button sidebar-dismiss" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>

        <div className="workspace-context">
          <span className="context-mark"><Boxes size={16} /></span>
          <span><strong>Operations</strong><small>TESTNET WORKSPACE</small></span>
          <span className="context-caret" aria-hidden="true">···</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {navigation.map(({ label, href, icon: Icon, path }) => {
            const section = label === "Agent network" ? "agent-network"
              : label === "Procurement" ? "procurement"
                : label === "Payment workflow" ? "payment-workflow"
                  : label === "Private receiving" ? "private-receiving" : "";
            const active = pathname === path && (page === label || (!!section && currentSection === section));
            return <Link key={label} href={href} onClick={() => setMenuOpen(false)} className={`workspace-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{active && <span className="nav-active-mark" aria-hidden="true" />}
            </Link>;
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-promise"><span className="privacy-symbol"><ShieldCheck size={16} /></span><div><strong>Authorization stays human</strong><p>AI can recommend. Policy and approval control payment.</p></div></div>
          <div className="sidebar-footer"><span className="workspace-avatar">P</span><span><strong>PrivateHSP</strong><small>Local workspace</small></span><span className="footer-status"><i /> Ready</span></div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <button ref={menuButtonRef} className="icon-button menu-trigger" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{page}</strong></div>
          <div className="topbar-meta"><span className="environment-pill"><i /> TESTNET ONLY</span><span className="topbar-divider" /><span className="topbar-avatar">P</span></div>
        </header>

        <main className="workspace-content">
          <header className="page-heading">
            <div><p className="page-eyebrow"><span />{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
            {action && <div className="page-heading-action">{action}</div>}
          </header>
          {children}
          <footer className="workspace-footnote"><span>PRIVATEHSP</span><span>Testnet workspace · Payment evidence is shown with its verified provenance.</span></footer>
        </main>
      </div>
    </div>
  );
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="inline-link" href={href}>{children}<ArrowUpRight size={14} aria-hidden="true" /></Link>;
}

export function StatusMark({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "positive" | "warning" }) {
  return <span className={`status-mark tone-${tone}`}><i aria-hidden="true" />{children}</span>;
}

export function SectionHeading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return <div className="section-heading"><div><p className="section-kicker">{kicker}</p><h2>{title}</h2></div>{children}</div>;
}

export function FeatureIcon({ children }: { children: ReactNode }) {
  return <span className="feature-icon" aria-hidden="true">{children}</span>;
}

export function ActivityIcon() {
  return <Activity size={16} strokeWidth={1.8} aria-hidden="true" />;
}
