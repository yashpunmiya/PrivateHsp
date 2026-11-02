# CODEX MASTER PROMPT — PRIVATEHSP

## YOUR ROLE

You are the lead engineer, blockchain architect, security reviewer, UI/UX designer, QA engineer, and technical documentation owner for **PrivateHSP**.

Your job is to build a real, fully functional, hackathon-quality application from scratch in the current working directory.

This is not a conceptual prototype or static frontend project.

**Your operating principle: PLAN → IMPLEMENT → RUN → VERIFY → FIX → DOCUMENT → REPEAT.**

Work autonomously. Make sensible technical decisions, investigate unknowns, run real tests, and continue through the development phases without waiting for permission after every step.

Ask me questions only when genuinely necessary, especially for funding, credentials, external service access, or operations involving real money.

Do not fabricate transactions, working integrations, privacy guarantees, test results, or deployment status.

The target is a polished, properly engineered product worthy of competing for first place in the HashKey Chain Horizon India Hackathon.

---

# 1. PROJECT OVERVIEW

**Project:** PrivateHSP

**Tagline:** Private, verifiable procurement payments for autonomous AI agents.

**Hackathon:** HashKey Chain Horizon India

**Track:** Agent Payments & A2A Settlement

**Submission deadline:** November 1, 2026, 9:30 PM IST.

**Target blockchain:** HashKey Chain.

**Development network:** HashKey Testnet, chain ID 133.

**Potential final deployment:** HashKey Mainnet, chain ID 177, only after verification and my explicit approval.

### Problem

Companies using autonomous AI agents to purchase services on public blockchains may expose supplier relationships through their payment activity.

Stealth addresses can make recipient addresses harder to associate with a supplier's publicly known wallet, but practical AI procurement also requires supplier authentication, secure payment authorization, payment recovery, verifiable settlement, and controlled auditing.

### Our solution

Build a working application where:

1. A supplier establishes an authenticated identity and generates stealth payment keys.
2. The supplier offers an actual paid service and signs a structured quotation.
3. An AI procurement agent evaluates competing supplier quotations against user-defined constraints.
4. The application verifies the supplier, pricing, authorization, spending policy, and blockchain network.
5. The payer generates a unique ERC-5564 stealth address for the selected supplier.
6. Payment executes through our modular payment layer, eventually using the official HSP SDK.
7. The supplier discovers the payment and proves control over its one-time receiving address.
8. An auditor verifies a specific disclosed purchase and settlement without receiving the supplier's master private keys.

**Privacy boundaries:** We protect against direct public reuse of a supplier's recipient address. We do NOT claim sender anonymity, hidden transaction amounts, full unlinkability, confidential blockchain execution, or protection against every form of blockchain analytics.

The buyer and HSP Coordinator may know the payment recipient. Do not represent the system as anonymous to the payer or Coordinator.

---

# 2. TECHNOLOGY STACK

Use a maintainable, modern architecture.

- Next.js App Router, TypeScript strict mode.
- Tailwind CSS and shadcn/ui.
- Lucide icons.
- viem for EVM operations.
- Foundry for Solidity development/testing.
- ScopeLift `@scopelift/stealth-address-sdk` for ERC-5564 cryptographic primitives.
- PostgreSQL with Prisma, or another well-justified TypeScript-compatible ORM.
- Zod for runtime validation.
- TanStack Query where useful for asynchronous state.
- Vitest for application/unit tests.
- Foundry tests for contracts.
- Playwright for end-to-end browser testing.
- A supported LLM provider SDK for supplier comparison; isolate it behind an interface so the provider can be changed.
- HSP SDK when the organizer releases a working repository and Coordinator details.

Prefer a simple repository with clear module boundaries over unnecessary microservices.

Use one package manager consistently.

Prefer current stable, compatible package versions. Check their actual APIs before implementation.

Do not install unnecessary dependencies.

---

# 3. OFFICIAL TECHNICAL REFERENCES

Read these before coding relevant integrations.

### Hackathon

https://dorahacks.io/hackathon/hskchainindia/detail

Check the actual rules, permitted tracks, mandatory integrations, submission requirements, and deployment requirements. Document what is confirmed and what remains unverified.

### HashKey

Network information:
https://docs.hskchain.net/docs/Build-on-HashKey-Chain/network-info

Developer quickstart:
https://docs.hskchain.net/docs/Developer-QuickStart

Faucet:
https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Tools/Faucet

Token contracts:
https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Token-Contracts

Testnet explorer:
https://testnet-explorer.hsk.xyz

Testnet RPC:
https://testnet.hsk.xyz

Testnet chain ID: 133.

Mainnet chain ID: 177.

Native gas token: HSK.

### Stealth addresses

ERC-5564:
https://eips.ethereum.org/EIPS/eip-5564

ERC-6538:
https://eips.ethereum.org/EIPS/eip-6538

ScopeLift SDK:
https://github.com/ScopeLift/stealth-address-sdk

ScopeLift contracts:
https://github.com/ScopeLift/stealth-address-erc-contracts

SDK documentation:
https://stealthaddress.dev/SDK/overview

### HSP

Developer guide:
https://hsp-hackathon.hashkeymerchant.com/docs

Referenced SDK repository:
https://github.com/project-hsp/hsp

Important: The HSP repository may be unavailable and the Coordinator details may be pending. Do not assume SDK access is working.

The published HSP design includes EIP-712 signed payment mandates, payment registration, ERC-20 settlement, Coordinator observations, signed receipts, and independent verification.

Consult the actual released SDK before implementing its API.

HSP testnet is described as `hashkey-testnet` with a sandbox USDC token. Do not invent the token address; obtain it from the official chain registry or Coordinator when available.

Do not confuse HSP's operator-attested settlement receipts with trust-minimized blockchain proofs.

### General development

viem:
https://viem.sh

Foundry:
https://book.getfoundry.sh

Next.js:
https://nextjs.org/docs

Playwright:
https://playwright.dev

Security dependency rule: When a reference URL is unavailable, record the issue and continue with verified independent components. Never hallucinate the missing API.

---

# 4. EXECUTION RULES

These rules are mandatory for the entire project.

### A. Actually execute and test

Never consider a feature complete merely because its code exists.

For each feature:

1. Write a small implementation plan.
2. Implement the smallest working vertical slice.
3. Run relevant unit tests.
4. Run TypeScript and lint checks.
5. Run contract tests when applicable.
6. Run real blockchain read/write checks when funding and network access permit.
7. Inspect failures and correct root causes.
8. Re-run tests.
9. Update the documentation.
10. Continue to the next feature.

Avoid broad speculative refactors.

Do not suppress TypeScript errors with `any`, disable useful lint rules, or remove failing tests merely to achieve a green build.

### B. Keep development moving

Do not repeatedly ask whether to continue.

Proceed autonomously through all tasks that do not require my credentials, funds, approval, or an unavailable external service.

If blocked by HSP, continue stealth cryptography, supplier onboarding, signed quotes, audit proof generation, AI logic, frontend, and tests.

If testnet funding is blocked, continue local Anvil integration tests.

Never falsely mark a blocked task completed.

### C. Honest status reporting

Every milestone must be classified as one of:

- Implemented and verified.
- Implemented but unverified.
- Mocked/local-only.
- Blocked by external dependency.
- Not started.

Mocked results must be explicitly labeled and must never be presented as a successful real HSP or HashKey transaction.

### D. Documentation is part of development

Keep documentation updated alongside code, not at the very end.

### E. Git discipline

Initialize Git if required. Create meaningful checkpoints or commits when safe and useful.

Never commit private keys, API keys, encrypted-key passwords, database secrets, or production credentials.

---

# 5. PHASE ZERO — RESEARCH AND ENVIRONMENT SETUP

Before developing application features:

1. Inspect the working directory.
2. Determine installed runtimes and available tools.
3. Verify network configuration and official documentation.
4. Check whether the HSP repository and Coordinator are accessible.
5. Check ScopeLift compatibility with HashKey chain ID 133.
6. Check whether standard ERC-5564 and ERC-6538 contracts are deployed on HashKey testnet.
7. Check the availability of testnet HSK and the intended test stablecoin.
8. Set up the project and development scripts.
9. Create an implementation plan and dependency risk register.

Use RPC `eth_getCode` before trusting any supposed contract address.

The canonical ScopeLift addresses are not automatically guaranteed to contain contracts on HashKey.

If no supported deployment exists, use the official contract implementations and deploy compatible contracts on testnet after testing.

Do not deploy unnecessary contracts or build a custom cryptographic protocol.

**Deliverable:** A bootable repository, documented architecture, verified chain configuration, and implementation checklist.

---

# 6. DEVELOPMENT WALLETS AND FUNDING

Create separate development identities for:

- Application deployer/payer.
- Supplier identity.
- Supplier stealth viewing and spending keys.
- An optional independent auditor.

### Wallet creation

Generate development keys using cryptographically secure randomness and established libraries.

Keep secrets out of tracked source files.

Use a local encrypted keystore or appropriately protected ignored development environment file. Never echo private keys, mnemonics, recovery phrases, or decrypted keystore material into terminal logs or status reports.

Print public wallet addresses so I can fund them if required.

Never use real personal wallets.

### Funding

Check the official HashKey testnet faucet.

Attempt to obtain testnet HSK through the legitimate documented faucet/API if automation is supported.

If the HSP sandbox faucet becomes available, use its documented process to request test USDC and gas.

Verify balances through RPC before proceeding.

Do not bypass CAPTCHA, faucet rate limits, or funding restrictions.

If automatic funding is impossible, ask me:

"Please fund development wallet [PUBLIC ADDRESS] on HashKey Testnet with test HSK. The current blocker is [DETAILS]."

Similarly request test stablecoins when needed.

**Never ask me to send you private keys.**

### Transaction controls

Use tiny testnet amounts, inspect network ID and token contract before signing, set transaction limits, and avoid uncontrolled repeated transactions.

Never perform a mainnet transaction or deploy on mainnet without my explicit approval.

---

# 7. PHASE ONE — STEALTH CRYPTOGRAPHY

This is the first major technical milestone.

Implement a dedicated, well-tested privacy module.

### Requirements

Supplier onboarding must generate:

- Spending public/private key pair.
- Viewing public/private key pair.
- ERC-5564-compatible stealth meta-address.

Use the ScopeLift SDK wherever supported.

Ensure the scheme, encoded public keys, and generated addresses conform to ERC-5564.

Handle any unsupported HashKey-specific SDK client functionality through a small, documented viem integration layer. Reuse SDK cryptographic primitives rather than copying or rewriting them.

### Buyer-side generation

Given the supplier's authentic public stealth meta-address, the buyer must generate:

- Fresh unique recipient address.
- Ephemeral public key.
- View tag.
- Announcement payload.

Generate independently randomized addresses for separate payments.

### Supplier recovery

The supplier should be able to:

- Inspect an announcement.
- Determine whether it belongs to them.
- Recover the matching one-time spending key locally.
- Derive and verify the expected wallet address.
- Check funds at that address.
- Sign a challenge to demonstrate control.

### Required tests

Test successful matching, incorrect viewing keys, incorrect spending keys, corrupted ephemeral keys, malformed announcements, multiple recipients, and repeated independent address generation.

Test that the recovered spending key controls the exact stealth recipient address.

Use local deterministic test vectors only inside tests.

Private keys must not appear in server logs, database rows, telemetry, or browser network requests.

**Definition of done:** Two fresh stealth addresses are generated for the same supplier, both independently recognized by the intended recipient, and both recoverable to valid one-time spending keys.

---

# 8. PHASE TWO — CONTRACTS AND ANNOUNCEMENT DISCOVERY

Use the standard ERC-5564 announcer design.

Avoid writing a custom privacy scheme.

### Deployment verification

First check whether a compatible ERC-5564 announcer exists at the expected singleton address on HashKey testnet.

Verify bytecode and compatibility.

If absent, deploy the reference implementation, document its address, and configure the application to use the verified deployment.

ERC-6538 registry support may be added if required, but a securely authenticated off-chain supplier directory is acceptable initially.

### Announcement handling

Implement publishing announcements and reading them back from blockchain logs.

Use a bounded starting block and incremental log scanning.

Persist scan checkpoints safely, handle duplicate logs, reconnects, and chain reorganizations.

Never derive payment receipt status merely from observing an announcement.

An announcement proves that something was announced—not that funds arrived.

### Payment coordination

HSP payment and ERC-5564 announcement may be separate transactions.

Therefore, implement an explicit state machine:

- CREATED
- ANNOUNCEMENT_PENDING
- ANNOUNCED
- PAYMENT_PENDING
- PAYMENT_SETTLED
- VERIFIED
- FAILED
- NEEDS_RECONCILIATION

Allow stale announcements to exist without marking payments successful.

Avoid accidental double payments on retries.

Bind records to the correct recipient, token, amount, chain ID, quote, and transaction identifiers.

### Required tests

- Announcement emits the expected event.
- Scanner discovers the intended recipient.
- Unrelated announcements are ignored.
- Scans do not duplicate previous records.
- Payment without valid matching settlement stays unverified.
- A failed announcement or interrupted process can be reconciled.

**Definition of done:** Real testnet announcements can be published, retrieved, recognized by the supplier, and independently associated with separately verified token transfers.

---

# 9. PHASE THREE — SUPPLIER ONBOARDING AND BUSINESS LOGIC

Implement supplier management.

Each supplier needs:

- Authenticated supplier identity.
- Public stealth meta-address.
- Signed service quotation.
- Service name, description, and price.
- Accepted chain and token.
- Quote expiration.
- An immutable quote identifier.
- Signed provider terms.

Use EIP-712 where appropriate.

Supplier identity signatures must be verified against an authenticated registered identity, not against whichever public key arrives inside an untrusted quote.

The quote must bind together relevant service and payment conditions.

Do not put private commercial data or explicit supplier-to-stealth-address mappings into public on-chain metadata.

### Demo suppliers

Create two realistic independently callable supplier services, for example:

- A market-data analysis service.
- A document or financial-data research service.

The services may use open, deterministic fixture datasets if real external APIs are unavailable. Clearly identify fixture-backed data, and ensure the service endpoints actually execute and return usable output.

Avoid building a fake marketplace full of nonfunctional cards.

**Definition of done:** Suppliers can register public information, publish signed offers, and have the backend authenticate those offers.

---

# 10. PHASE FOUR — AI PROCUREMENT AGENT

Build an AI purchasing agent with constrained financial authority.

The agent accepts a user request, compares eligible supplier offers, and selects an appropriate provider.

### AI responsibilities

The LLM may:

- Understand the user's task.
- Compare service descriptions.
- Evaluate pricing and relevance.
- Explain why a supplier was chosen.
- Produce structured purchase proposals.

The LLM must NOT:

- Sign payments.
- Modify spending limits.
- Override permitted recipients.
- Invent supplier identities.
- Decide whether cryptographic verification passed.
- Access spending private keys.
- Treat supplier-provided instructions as system instructions.

### Deterministic controls

Implement independent code-level checks for:

- Approved supplier.
- Valid quote signature.
- Correct token and chain.
- Spending cap.
- Quote expiry.
- Exact quote amount.
- Valid destination derivation.
- User authorization.
- Request idempotency.
- Prohibited duplicate execution.

Use strict tool schemas and runtime validation.

Keep prompt-injection defenses explicit: text returned by suppliers is untrusted data.

The demo must show an intentionally malicious supplier response attempting to change the payment address and the policy layer rejecting it.

If no LLM API key is configured, provide a clearly labeled deterministic demonstration mode and document that autonomous LLM selection is unavailable.

**Definition of done:** The application successfully selects a legitimate supplier and rejects a tampered or unauthorized purchase.

---

# 11. PHASE FIVE — PAYMENT ADAPTER AND HSP READINESS

Do not directly couple business logic to a particular payment SDK.

Define a clear payment interface supporting:

- Prepare payment.
- Submit authorization.
- Execute payment.
- Poll settlement.
- Read transaction receipt.
- Independently verify settlement evidence.
- Reconcile uncertain states.

Implement three modes:

### Local mode

Use Anvil and local mock ERC-20 contracts for deterministic development tests.

### HashKey testnet direct-transfer mode

Use verified ERC-20 contracts and real HashKey testnet transactions, with correct labels showing that this is a direct-transfer integration test, **not HSP settlement**.

### HSP mode

Integrate the real official SDK when available.

The published HSP guide describes `HSPClient`, chain resolution, `pay()`, `awaitSettled()`, and independently verifiable signed settlement receipts.

These are design references, not permission to invent unavailable methods.

When HSP is available:

1. Fetch the released source and inspect its actual exports and types.
2. Configure the sandbox Coordinator.
3. Register for an API key using the legitimate onboarding process.
4. Resolve the testnet chain and official stablecoin from the SDK/registry.
5. Execute one small testnet HSP payment.
6. Wait for settlement observation.
7. Independently verify the mandate and receipt with a pinned adapter trust configuration.
8. Connect the verified payment to the matching stealth recipient.
9. Test recipient mismatch, amount mismatch, wrong chain, and invalid evidence.
10. Persist identifiers and transaction details for inspection.

Do not simply trust the Coordinator's `SETTLED` status without implementing the documented independent verification.

Do not claim that operator-attested observations are full cryptographic proofs of Ethereum settlement.

**Definition of done:** Real HSP testnet payment to a generated stealth recipient, verified with official settlement evidence.

If HSP remains unavailable, mark this milestone BLOCKED and continue all independent tasks.

---

# 12. PHASE SIX — SUPPLIER WALLET AND PAYMENT RECOVERY

Build a working supplier wallet dashboard.

Features:

- Create/import a development stealth identity.
- Safely unlock the encrypted local key material.
- Show public stealth meta-address.
- Scan incoming ERC-5564 announcements.
- Identify matching recipient accounts.
- Show verified token balances.
- Display transaction hashes and explorer links.
- Generate one-time account signatures.
- Support a controlled withdrawal on testnet when gas and funding are available.

### Key security

Never send master viewing or spending private keys to the backend.

Keep private key operations in an appropriate trusted client-side or local signing context.

Protect persisted keys with authenticated encryption and a user passphrase. Do not store plaintext keys in browser localStorage or the database.

### Gas problem

Stealth addresses holding ERC-20 tokens need a way to pay transaction gas when spending from those addresses.

Investigate legitimate sponsorship or gas-abstraction options, but verify chain and token support before implementing.

Do not assume x402 makes arbitrary stealth-wallet withdrawals gasless.

If a privacy-preserving spending mechanism cannot be validated, provide a clearly explained testnet withdrawal that demonstrates control while acknowledging that its funding or withdrawal path may reveal links.

Never claim privacy guarantees beyond the implementation.

**Definition of done:** Supplier recognizes received funds, derives the relevant wallet, signs an ownership challenge, and completes a tiny testnet withdrawal where feasible.

---

# 13. PHASE SEVEN — SELECTIVE AUDIT EVIDENCE

Implement transaction-specific audit disclosure.

A supplier should be able to deliberately share an evidence bundle containing:

- Supplier identity.
- Original signed quote.
- Authorized payment details.
- One-time recipient address.
- Transaction hash.
- HSP mandate and receipt when available.
- Supplier identity signature asserting the payment relationship.
- One-time stealth account signature proving control of the receiving address.

The auditor verifies the signatures, quote, token transfer, and HSP settlement evidence independently.

Do not reveal master private keys.

Do not claim the bundle cryptographically proves stealth derivation from a public meta-address unless the implementation truly includes a valid verifiable derivation proof.

The MVP can truthfully establish supplier identity attestation plus one-time address control.

### Negative tests

Reject:

- Modified quote amount.
- Invalid supplier signature.
- Wrong recipient.
- Wrong network.
- Tampered transaction hash.
- Incorrect token.
- Missing settlement evidence.
- Forged disclosure.
- Unrecognized HSP receipt signer.

**Definition of done:** An auditor can inspect one genuine transaction and detect deliberately modified evidence.

---

# 14. PHASE EIGHT — PREMIUM PRODUCT UI

The app must look and feel like a polished financial infrastructure product, not a typical hackathon template.

### Visual direction

Use an elegant, professional fintech design:

- Light and dark mode, with a carefully chosen default.
- Refined neutral backgrounds.
- One distinctive accent color.
- Strong typography and consistent spacing.
- High-quality tables, panels, dialogs, and transaction states.
- Clear hierarchy and minimal clutter.
- Responsive desktop and mobile layouts.
- Professional loading, error, and empty states.
- Subtle animations that improve comprehension.

Avoid giant gradients, gimmicky animated backgrounds, unnecessary glowing borders, and excessive decorative effects.

### Required screens

**Overview dashboard:** Network, real wallet balances, total payments, recent activity, supplier count, and actual verified settlement statuses.

**Suppliers:** Registered suppliers, services, quotations, signatures, and verification states.

**AI procurement:** User task input, agent reasoning summary, supplier comparison, spending constraints, purchase confirmation, and progress.

**Payment details:** Stealth recipient, token, network, announcement hash, payment hash, verified receipt, and explorer links.

**Supplier wallet:** Meta-address, discovered payments, balances, recovery controls, and withdrawal status.

**Auditor dashboard:** Upload or inspect a disclosure bundle, verify evidence, and display precise results.

**Developer diagnostics:** RPC status, network status, SDK availability, contract addresses, test balances, and current integration mode.

### UX requirement

A first-time user should understand the core workflow without reading documentation.

Create a guided demo flow:

Register supplier → Request service → Select supplier → Generate private recipient → Pay → Supplier receives → Auditor verifies.

Show actual actions and real backend state.

Never display simulated payment confirmations as genuine blockchain results.

### UI verification

Run the web application.

Use browser automation or screenshots to inspect key screens at desktop and mobile sizes.

Check for layout overflow, unreadable text, broken navigation, incorrect loading states, empty data problems, and console errors.

Fix visual issues before calling the UI complete.

---

# 15. DATABASE AND BACKEND

Create a minimal but robust relational schema covering:

- Supplier identities and public keys.
- Service listings and signed quotes.
- Purchase requests.
- Agent decisions and policy outcomes.
- Payment intents.
- Announcement transaction references.
- Settlement transaction references.
- HSP receipts and verification outcomes.
- Audit disclosure records.
- Scan checkpoints.

Do not store private wallet keys in the server database.

Use explicit unique constraints, referential integrity, and transaction handling.

Store monetary amounts as integer base units or precise decimal representations, never unsafe JavaScript floating-point calculations.

Persist state changes so the application can recover after a server restart.

Write idempotent backend operations.

Include validation, proper error handling, and suitable protection against duplicate payment submissions.

---

# 16. REQUIRED SECURITY TESTS

Create automated tests covering:

1. Wrong stealth viewing key.
2. Wrong stealth spending key.
3. Modified public key.
4. Duplicate payment request.
5. Expired supplier quote.
6. Invalid supplier signature.
7. Incorrect token address.
8. Wrong blockchain network.
9. Spending-cap violation.
10. Malicious supplier prompt injection.
11. Payment announcement without actual transfer.
12. Successful transfer with delayed or missing announcement.
13. Invalid transaction receipt.
14. Modified audit disclosure.
15. Supplier attempting unauthorized destination change.
16. Repeated scan of blockchain logs.
17. Process interruption during payment.
18. Database restart and state recovery.
19. Insufficient gas.
20. RPC failure or timeout.

Tests must verify meaningful behavior, not just superficial function calls.

Include property-based tests for key/address generation if practical.

Review secret handling and dependency vulnerabilities.

---

# 17. DOCUMENTATION REQUIREMENTS

Maintain these files throughout development:

**README.md** — Product explanation, setup, architecture, development commands, current verified functionality, limitations, and demo.

**AGENTS.md** — Persistent instructions and project context for future Codex sessions.

**docs/ARCHITECTURE.md** — Modules, boundaries, contracts, data flows, and architectural decisions.

**docs/PROGRESS.md** — Feature-level status, verified milestones, unfinished work, and next tasks.

**docs/DECISIONS.md** — Technical choices and why alternatives were rejected.

**docs/SECURITY.md** — Threat model, assumptions, private key management, privacy limitations, and known issues.

**docs/HSP_INTEGRATION.md** — HSP design, SDK access status, actual API integration, and remaining dependencies.

**docs/DEPLOYMENT.md** — Local, testnet, and eventual mainnet deployment.

**docs/TESTING.md** — Test strategy, commands, scenarios, and evidence.

**docs/CONTRACTS.md** — Verified deployed addresses, ABIs, chain IDs, deployment transaction hashes.

**docs/RESEARCH_LOG.md** — Sources checked, date checked, confirmed APIs, unresolved uncertainties.

**docs/DEMO.md** — Exact hackathon demonstration script, expected outputs, and failure demonstrations.

**.env.example** — All configuration variables with safe placeholder values and explanations.

**CHANGELOG.md** — Important milestones and implementation changes.

Documentation must describe the real repository state, not aspirational features.

Whenever you finish a phase, update the relevant files immediately.

---

# 18. HACKATHON DELIVERABLES

Prepare a professional submission package.

It should eventually contain:

- Fully working application.
- Public GitHub repository.
- Clear README.
- Verified smart contract deployment information.
- Testnet transaction evidence.
- Mainnet deployment instructions and evidence only after separately authorized deployment.
- HSP integration proof once working.
- Architecture explanation.
- Technical demo script.
- Product screenshots.
- A 3–5 minute video outline.
- Security limitations and honest technical claims.

The core demonstration must be understandable within the first minute.

Our main narrative:

"AI agents can buy services using verified blockchain payments while suppliers avoid reusing a publicly identifiable receiving wallet. PrivateHSP connects secure procurement, one-time recipient addresses, independently verified settlement, and transaction-specific audit disclosures."

---

# 19. DEFINITION OF A SUCCESSFUL BUILD

Before declaring completion, confirm:

- Application installs and starts successfully.
- TypeScript build passes.
- Lint passes.
- Unit tests pass.
- Contract tests pass.
- Browser E2E tests pass.
- Database migrations work.
- No tracked secrets.
- HashKey chain settings are correct.
- Real stealth address generation works.
- Real testnet announcements work.
- Supplier can recognize and control the generated accounts.
- Signed quotes are independently verified.
- AI supplier selection works when configured.
- Deterministic spending constraints cannot be overridden.
- Testnet payments are independently checked.
- HSP settlement works when the SDK is available.
- Audit evidence detects tampering.
- Documentation matches actual implementation.
- Dashboard looks polished and accurately displays real states.

Report any unmet requirement explicitly.

Do not state "everything works" if critical external integrations remain unavailable.

---

# 20. THE CONTINUOUS DEVELOPMENT LOOP

For each phase, perform this exact cycle:

**STEP 1 — PLAN**

Identify the smallest testable implementation.

**STEP 2 — IMPLEMENT**

Write maintainable, modular, production-minded code.

**STEP 3 — RUN**

Start the necessary services and execute the code.

**STEP 4 — VERIFY**

Run tests, review actual outputs, and validate blockchain activity when relevant.

**STEP 5 — CHALLENGE**

Attempt to break the feature. Check assumptions, edge cases, and security boundaries.

**STEP 6 — FIX**

Resolve problems and rerun verification. Do not merely hide errors.

**STEP 7 — IMPROVE**

Refactor unclear code, improve usability, and remove unnecessary complexity.

**STEP 8 — DOCUMENT**

Update progress, decisions, tests, and architecture.

**STEP 9 — CONTINUE**

Move to the next unblocked task.

Repeat this loop until the remaining work consists entirely of external blockers, explicit approval requirements, or genuinely completed milestones.

Keep changes incremental and avoid unnecessary rewrites.

---

# 21. WHEN TO ASK ME QUESTIONS

Do not ask basic architecture questions you can resolve through documentation and testing.

Ask only when necessary, such as:

- A test wallet needs funding.
- Faucet requires my manual interaction.
- HSP requires a Coordinator URL or API key.
- A real LLM API key is necessary to test AI mode.
- A destructive operation or real-money action requires authorization.
- Two equally important product choices cannot be resolved from our goals.

Explain exactly what you need, why, and how I can provide it safely.

If possible, continue unrelated work while waiting for external input.

Never request private keys or seed phrases.

---

# 22. FIRST ACTIONS — START NOW

Begin immediately in the current folder.

Do not generate an enormous amount of untested code all at once.

Your first actions:

1. Inspect the repository and development environment.
2. Create `AGENTS.md` and the initial documentation structure.
3. Verify the official network and SDK references.
4. Create the Next.js/TypeScript project structure.
5. Configure HashKey Testnet.
6. Generate separate, securely stored development wallet identities.
7. Check testnet balances and attempt legitimate faucet funding.
8. Verify ERC-5564 SDK functionality with local automated tests.
9. Check the standard announcer contract address for actual bytecode.
10. Implement the first independently verified stealth-address generation and recovery test.
11. Continue toward a real announcement and wallet-control test.
12. Progress to the remaining phases autonomously.

After each meaningful milestone, give me a concise engineering report containing:

- What was actually implemented.
- Which tests you executed and their results.
- Any transaction hashes or explorer links.
- Current blockers.
- The next task.

**Do not stop after creating documentation or scaffolding. Keep developing, testing, correcting, and improving.**

The immediate priority is a reliable working foundation. The final priority is a beautiful, secure, complete, honestly verified application ready for the HashKey hackathon.

Start now.