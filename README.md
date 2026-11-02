# PrivateHSP

Private supplier discovery and testnet payment evidence for autonomous procurement agents. All development and payment activity is **testnet only**. Mainnet deployments and transactions are prohibited.

## Current capabilities

- Two local HTTP supplier agents; EIP-712 signed offers; deterministic spend policy and explicit quote-specific approval.
- Server-side supplier ranking through Vertex AI (`@google/genai`) using ADC.
- A persisted, six-step local workflow checkpoint sequence after human approval. HSP Gateway access is unavailable; no Gateway order/payment request, wallet signature, or settlement is created by these checkpoints.
- ERC-5564 stealth identity generation, recognition, encrypted backup/recovery, and one-time key recovery.
- Real Sepolia ERC-5564 announcement and 1 USDC test transfer. Supplier recognized the on-chain announcement, recovered a key matching the recipient, and signed a local ownership challenge. Transaction-specific audit checked the actual calldata, receipt, block and USDC `Transfer` event.
- **This Sepolia transfer is a direct testnet transfer, not HSP settlement.** HSP QA MCP is currently blocked with HTTP 403 from Cloudflare; no HSP order/payment was created by this project.

### Sepolia evidence

- Announcement: [Sepolia Etherscan](https://sepolia.etherscan.io/tx/0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b)
- 1.000000 test USDC transfer: [Sepolia Etherscan](https://sepolia.etherscan.io/tx/0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d)
- Canonical ERC-5564 Announcer already exists on Sepolia and its runtime matches the pinned ScopeLift reference. No duplicate was deployed.

## Run locally

Requires Node.js 22+ and npm. Configure `.env.local` from `.env.example`; keep private keys only in ignored local storage. Google ADC is required for live buyer ranking. If ADC is not configured, run `gcloud auth application-default login`. Do not use API keys or service-account key files.

```sh
npm install
npm run dev
```

Open `/agents` to load and verify both signed offers, have Vertex rank them, review deterministic policy, approve the exact quote, and step through the locally stored workflow checkpoints. The page states that Gateway access is unavailable and that no Gateway request or settlement occurred. The separate Sepolia links and `/audit` page inspect the earlier real transfer, which used a different recipient from any newly generated address. The audit UI is read-only. HSP QA network and token support must come from a live `get_chain_config`; do not assume Sepolia is supported by HSP.

## Checks

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

Latest verified results are recorded in [progress](docs/PROGRESS.md). They include unit tests, lint, TypeScript, a production build, and Playwright browser tests. The suite covers configured Vertex procurement, local checkpoint progression, stealth-recipient recognition, and Sepolia audit verification. See [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [deployment](docs/DEPLOYMENT.md), and [testing](docs/TESTING.md).

## Submission and deployment status

Source repository: [github.com/yashpunmiya/PrivateHsp](https://github.com/yashpunmiya/PrivateHsp). The application is not deployed. Do not upload `.env.local`, DPAPI files, private keys, ADC data, or wallet backups. HSP integration remains blocked; no Gateway settlement is claimed.
