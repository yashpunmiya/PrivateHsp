# PrivateHSP submission demo (about 3 minutes)

## Before recording
1. Start the local app with `npm run dev`, then open `/agents`. Confirm Vertex ADC and both local supplier configurations are ready. Never show terminal environment output, wallet secrets, ADC files, or private keys.
2. The HSP steps are a local deterministic simulation. Keep the visible simulation labels in frame. Do not describe it as live Gateway activity or settlement.
3. Do not initiate a wallet signature, transaction, withdrawal, or HSP payment during recording.

## Script
1. **Problem (20 sec):** Procurement agents need to compare suppliers without granting an LLM payment authority. PrivateHSP separates ranking, deterministic policy, and explicit approval.
2. **Supplier workflow (55 sec):** Load both distinct signed offers and show each verified signer and newly proposed recipient. Enter/confirm the spend cap and supplier allowlist, ask Vertex to rank, then review the exact quote and policy decision before approving.
3. **Gateway-shaped walkthrough (35 sec):** Click “Run HSP sequence (simulation)” and show the six stages progressing. State plainly that these are a local simulation: no Gateway request, wallet signature, transaction, or settlement occurred. The displayed HashKey terms are local demo quote terms and have not been confirmed by live `get_chain_config`.
4. **Sepolia evidence (55 sec):** Explain this is separate real testnet evidence, not the flow shown in the HSP simulation. Open `/audit`, load “recorded Sepolia USDC evidence,” and verify it. Show the actual transfer [on Sepolia Etherscan](https://sepolia.etherscan.io/tx/0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d) and [ERC-5564 announcement](https://sepolia.etherscan.io/tx/0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b). Call out the historical recipient shown in the UI; it is not the fresh address in the procurement flow.
5. **Audit and status (25 sec):** Show the positive direct-transfer verification and `hspSettlementVerified: false`. Note that tampering tests fail closed and HSP QA access remains blocked by Cloudflare HTTP 403.
6. **Close (10 sec):** Testnet-only development; no mainnet actions. The app is local-only and not deployed.

## Evidence links
- Announcement transaction: https://sepolia.etherscan.io/tx/0xf5d72a6538bc6c114480a0988ee542f8a4a02d4582ba6e1ff65c77a641f1f29b
- Test USDC transfer: https://sepolia.etherscan.io/tx/0x65be395fce2e5b71571d9316f0c802799f8c0f733ba79ae7738849646beb452d
- The transfers are on Ethereum Sepolia. They are direct testnet transfers and must not be presented as HSP Gateway settlement.
