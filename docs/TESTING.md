# Testing

## Current environment
- Node.js v22.20.0, npm 10.9.2, pnpm 10.30.0, Python 3.12.7.
- Foundry `forge` and `anvil` are not installed.

## Verified on 2026-10-27
- `npm test` — 4 files, 17 tests passed. Covers ERC-5564 generation/recognition/recovery, wrong keys, malformed announcements, distinct recipients, encrypted backup round-trip/wrong passphrase/modified ciphertext, announcer runtime hash extraction, duplicate/unrelated/wrong-chain scans, RPC errors, direct-transfer chain/amount/balance guards, receipt success/failure, and transfer mismatch.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed with Webpack on current HEAD. The default Turbopack production builder panicked while starting a CSS worker in the restricted environment; the package script selects Webpack for repeatable builds.
- Earlier production app check: HTTP 200 on `/`; `/api/health` returned chain ID 133 and `announcerDeployed:false`.
- A fresh RPC request on 2026-10-27 failed DNS resolution in the current environment. No chain writes/faucet tests have run.
- Scanner and publication/transfer tests use mock clients; they do not prove live network, contract deployment, or transaction evidence.

## Still required
- Browser E2E for backup download/import, key persistence/restart behavior, and responsive layout.
- Scanner and transaction adapter integration tests, RPC timeout/failure/restart cases.
- Foundry contract tests and testnet receipt/balance/announcement verification. `forge`/`anvil` are not installed.

## 2026-10-30 additions
- `npm test`: 8 files / 26 tests passed after quote, deterministic policy, local agent-service, and order idempotency tests were added.
- The audit verifier is not yet covered by tests. Browser E2E is still not configured or executed.
- Avoid running `npx tsc --noEmit` concurrently with `next build`; Next regenerates `.next/types`, which can make the overlapping check fail spuriously. Run checks sequentially.

## 2026-10-30 verification update
- Unit tests: 11 files, 32 passed.
- TypeScript: `npx tsc --noEmit` passed.
- Lint: `npm run lint` passed.
- Production build: passed; non-fatal dynamic-dependency warning originates from the installed ScopeLift SDK/viem chain exports.
- Playwright: the browser test assertion passed using installed Chrome, but the Playwright command did not exit during web-server cleanup and was interrupted. Treat browser E2E as partially verified, not a clean suite pass.
- HTTP smoke: `/agents` returned 200 and both supplier APIs returned expected results.

## 2026-10-30 final local verification
- `npm test` — 12 files / 35 tests passed. Includes encrypted stealth-key backup/recovery, stealth generation/discovery, direct transfer guards, quote/policy and LLM selection boundaries, forged/tampered audit evidence, RPC interruption, order idempotency/conflicts, terminal failure transitions, and fresh-process order recovery.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed with a non-fatal dynamic dependency warning from `ox` through viem chain exports and ScopeLift SDK helpers.
- `npm run test:e2e` — clean exit, 4 tests passed against a production server in installed Chrome. Covers both local supplier APIs, the missing-supplier-identity fail-closed path, invalid audit evidence / explicit non-HSP labeling, and local stealth identity creation plus recipient recognition. The Windows wrapper cleans up the server and browser process tree.
- Procurement unit tests verify human approval is bound to the exact reviewed signed quote and does not trigger a second LLM selection.
- Current unverified flows at that checkpoint: API offers with a verified HSP token and real quote prices (supplier identities are present but token/prices are blank); live model selection; wallet signatures or any testnet transfer; HSP Gateway (profile registration exists, but no tools were loaded into that session and the QA endpoint returned Cloudflare 403); cross-process/multi-instance order writes. The local JSON store only guarantees in-process serialized writes and restart-readable state.
- Non-failing warnings: Node emits `MODULE_TYPELESS_PACKAGE_JSON` in the order-store fresh-process recovery test; production build reports an expression-based dynamic import under `ox`/viem/ScopeLift. No runtime regression was observed in the unit or browser coverage, but this is not proof for every SDK runtime path.
- After creating ACL-restricted local supplier identities, the same full verification passed again: 35 unit tests, lint, TypeScript, production build, and 4 Playwright tests. A content scan confirmed none of the six local private keys appear in `.next/static`. Two generated supplier identities signed and verified actual EIP-712 quotes in an isolated test using ephemeral placeholder token/price values; this did not establish HSP token support or real supplier pricing.
- Warning investigation: ScopeLift's chain helper imports from the broad `viem/chains` index. That index includes Tempo modules, and `ox` uses an expression-based dynamic import for a Node worker pool. Current HashKey scheme-1 browser key/recipient flows pass; the Tempo-specific worker path is unused and has not been runtime-tested. Warning remains unresolved upstream/in dependency graph and is non-fatal in this build.

## 2026-11-02 Vertex provider verification
- ADC token command succeeded on the local Windows host; token output was discarded.
- Vertex `gemini-2.5-flash` in `global` returned HTTP 404. `gemini-3.8-flash` in `global` returned the requested `VERTEX_AI_ADC_OK` text through `@google/genai`.
- The new selector's unit tests exercise structured response validation and denial of malformed or unknown supplier output with an injected SDK client; these are unit tests only, not counted as live provider evidence.

## 2026-11-02 Vertex migration regression
- `npm test` — 12 files / 37 tests passed.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed on retry. The first attempt hit a transient Windows `EPERM` while creating a `.next` directory. The successful build reports the known non-fatal `ox`/viem/ScopeLift expression-based dynamic-import warning.
- `npm run test:e2e` — 4 tests passed and the runner exited cleanly after stopping the local production server. The buyer browser test had two signed offers from distinct configured suppliers, called the real Vertex-backed route with ADC, showed a recommendation awaiting approval, then approved the exact displayed quote. No wallet signing or blockchain transaction occurred.
- A live `@google/genai` Vertex call using ADC succeeded with `gemini-3.8-flash` in `global`; a separate buyer-agent run returned an actual supplier selection and rationale. The buyer policy remained the authorization gate (`human-approval-required`, `paymentAuthorized:false` until quote-specific human approval).
- Searches found no legacy provider configuration or dependency in source/docs or package manifests/lockfile. Do not count the injected-client selector unit tests as live Vertex tests.

## 2026-11-02 Sepolia stealth-payment test
- Approved live Sepolia announcement and 1.000000 Circle test-USDC transfer both succeeded: announcement tx `0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b`; transfer tx `0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d`.
- Supplier recognition and one-time key recovery succeeded for the announcement log. Recipient-control challenge signature verified locally against the stealth address. Sepolia USDC transaction evidence passed `verifySepoliaUsdcTransfer` against the actual transaction and receipt; tampering unit tests passed.
- A read-only `eth_call` simulated spending 1.000000 USDC from the stealth address and returned true. Recipient ETH balance is zero, so an actual withdrawal cannot yet pay gas. No withdrawal was signed or broadcast.
- Current regression: 13 files / 39 unit tests passed; lint, TypeScript, build, and 4 browser E2E tests passed. Build retains the non-fatal ScopeLift/viem `ox` dynamic-import warning.

## 2026-11-02 — Sepolia audit UI regression
- Audit route now verifies Sepolia transfer evidence read-only and fails closed on wrong chain/token, mismatched transaction data, reverted/missing receipt, wrong block, or missing/mismatched Transfer event.
- Browser audit view loads the recorded Sepolia transaction evidence and verifies it against live Sepolia RPC; forged evidence remains rejected. Full Playwright suite: 4 passed.
- Full checks: 13 unit files / 39 tests passed; lint passed; TypeScript passed; production build passed on retry after transient Windows EPERM. Known ScopeLift/viem dynamic-import warning remains non-fatal.
- HSP access recheck: direct initialize HTTP 403 Cloudflare challenge, Ray ID `a5433b2c1e8df549-SIN`; no tools or chain config could be verified.

## 2026-11-02 final submission check
- Latest full run: `npm test` 13 files / 39 tests passed; lint passed; `npx tsc --noEmit` passed; `npm run build` passed; `npm run test:e2e` 4 passed.
- HSP access was checked once from local Windows with current IPv4 152.58.28.166: HTTP 403 Cloudflare challenge, Ray ID `a543956d8892e8ef-LAX`; no tool listing or chain config. No Gateway order/payment was created.
- External HSK Meter implementation and fixture review was read-only and not counted as PrivateHSP testing.

## 2026-11-02 workflow checkpoint regression
- `npm test` — 15 files / 44 tests passed, including sequence ordering/idempotency and the API's false Gateway/signature/submission/settlement results.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. The build retains the known non-fatal `ox`/viem dynamic dependency warning.
- The six Playwright tests independent of live Vertex passed, including exact-quote approval and all six locally persisted checkpoints. The live Vertex supplier-ranking test timed out after its bounded retry; a separate prior run had passed a real Vertex ranking, so provider availability is intermittent.
- No Gateway order, wallet signature, testnet transaction, or HSP settlement was created.

## 2026-11-03 adapter boundary
- `npm test` — 16 files / 45 tests passed. Adapter tests assert that Gateway order/payment, transaction hash, signature, submission, and settlement data stay absent from the local adapter response.
- Lint, TypeScript, and production build passed; the known `ox`/viem dynamic import warning remains non-fatal.
- Six browser tests excluding the live Vertex-ranking test passed, including local workflow progression, approval, audit, and stealth UI. Live Vertex was previously observed returning HTTP 504 after the bounded retry; it remains intermittent and is not treated as a passing check.
