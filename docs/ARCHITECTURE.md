# Architecture

PrivateHSP is a single Next.js App Router TypeScript app. Current modules:

## Network boundaries (testnets only)
- Ethereum Sepolia (11155111) is the authorized environment for standalone ERC-5564 announcer compatibility and test USDC experiments. Its `SEPOLIA_*` configuration is isolated and does not change quote chain IDs, payment policy, or HSP configuration.
- HashKey Testnet (133) remains a separate environment for HashKey-specific flows. HSP QA supported chain/token/protocol remain unknown until the live MCP `get_chain_config` response is available. Never assume Sepolia is HSP-supported.
- Mainnet deployments and transactions are prohibited for this project. Future wallet writes must validate the selected testnet chain ID and transaction intent; deployments, signatures, and transactions require explicit user approval.
- `src/lib/sepolia-audit.ts` verifies Sepolia USDC transfer evidence against the actual transaction calldata, successful receipt, block number, chain, and ERC-20 `Transfer` log. It is separate from the legacy HashKey direct-native-transfer evidence format.
- `/audit` and `/api/audit/verify` accept either legacy HashKey direct-transfer evidence or Sepolia USDC evidence. Sepolia verification remains read-only and always reports `hspSettlementVerified:false`.

- `src/app/page.tsx`: browser-only dashboard, supplier key generation, local recipient demo, and encrypted backup/recovery UI.
- `src/lib/stealth.ts`: ScopeLift ERC-5564 scheme-1 key derivation, announcement recognition, and local one-time key recovery.
- `src/lib/key-backup.ts`: browser Web Crypto AES-GCM encryption and PBKDF2 key derivation; decrypt validates format and identity key relationships.
- `src/lib/chain.ts`: pinned HashKey Testnet chain ID 133 and read-only viem client.
- `src/app/api/health/route.ts`: read-only RPC/chain/announcer diagnostics. It does not sign or submit transactions.
- `src/lib/announcer.ts`: ScopeLift reference bytecode pin, runtime-hash check, guarded announcer deployment, event publication verification, and bounded recipient scan with duplicate suppression.
- `src/lib/payment.ts`: native HSK direct-transfer preparation/submission/verification. It enforces chain 133, caps each transfer at 0.001 HSK, and labels evidence `direct-testnet-transfer`.
- `contracts/ERC5564Announcer.sol`: minimal reference event emitter; it does not transfer tokens or attest to settlement.

There is no production database or multi-instance persistence. Wallet identity keys remain client-side and encrypted backups are downloaded locally. Announcement and direct-transfer adapters are unit-tested only; no live chain calls have completed in this environment. Quote issuance, deterministic buyer policy, optional LLM ranking, audit verification, and local order persistence are implemented as described below. HSP remains unavailable until its tools and schemas are exposed.

## Procurement agents and state (2026-10-30)
- `src/lib/services.ts` implements two local supplier service agents using validated requester data: numeric-series analysis and relevant excerpts from supplied documents.
- `src/app/api/agents/*` exposes independent HTTP routes; `src/lib/agent-client.ts` makes HTTP A2A requests and validates response envelopes. These are co-hosted local agents; no independent service deployment or LLM is claimed.
- `src/lib/quotes.ts` signs/verifies supplier quote EIP-712 data. `src/lib/policy.ts` is the deterministic authorization boundary and does not accept model decisions as authority.
- `src/lib/order-store.ts` persists non-secret order/payment state to an atomic local JSON file and enforces idempotency and explicit state transitions. It is single-process/local-disk storage, not production multi-instance persistence.
- `src/lib/audit.ts` validates signed quote, supplier attestation, recipient control, and direct transfer chain evidence. Audit claims do not include proof of stealth derivation or HSP settlement.
- Request IDs are serialized within one Node process and persisted through atomic file replacement. This is not a shared multi-process database; deploy a transactional database with unique request-ID constraints before scaling out.

## AI ranking adapter
`src/lib/llm-selector.ts` uses `@google/genai` with Vertex AI mode, explicit project/location, ADC, and configurable `GEMINI_MODEL`. It requests structured JSON and accepts only a known candidate ID. The buyer's deterministic policy remains an independent authorization gate. A live ADC-backed `gemini-3.8-flash` request succeeded in project `project-aa91aa00-7576-4735-b60` at `global`; the retired `gemini-2.5-flash` returned HTTP 404.

## Buyer orchestration update (2026-10-30)
- `/api/buyer/procurement` consumes signed quotes from at least two offers, asks the configured LLM to rank only verified quote candidates, then invokes deterministic authorization and persists order state. It does not perform payment preparation, wallet signing, Gateway submission, or claim settlement.
- `src/lib/hsp-adapter.ts` defines the replaceable payment workflow adapter. The local adapter returns typed workflow checkpoints with Gateway order/payment data and transaction hash set to `null`, and all external action/settlement flags set to `false`.
- `/api/hsp/workflow` advances the persisted local checkpoint ledger through the six lifecycle steps only after the quote is approved. It does not call the HSP Gateway, create Gateway identifiers, sign, submit, or claim settlement.
- Supplier quote issuance supports distinct `SUPPLIER_A_*` and `SUPPLIER_B_*` server identities. The endpoint rejects key/address mismatches and never returns signing keys. No identities are configured here, so issuing offers and running procurement are blocked in this environment.
- Playwright covers both local service APIs, fail-closed supplier configuration, and invalid audit evidence. It does not cover configured signed offers, a live LLM, wallet signing, or payment states.
