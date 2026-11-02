# Security

## Current state
- Supplier viewing/spending keys are created and used by client-side code. They are kept in React memory; no identity key is submitted to the API.
- Optional key backup uses Web Crypto PBKDF2-HMAC-SHA-256 (310,000 iterations) to derive a 256-bit AES-GCM key, random 16-byte salt and 12-byte nonce, and a 128-bit authentication tag. The decrypted identity must have matching private/public key pairs and a correctly encoded HashKey Testnet meta-address.
- Backup security depends on the user's passphrase. The passphrase is not stored; if lost, the file cannot be recovered. Store it separately from the encrypted file.
- The diagnostics endpoint is read-only. Announcement and native-HSK direct-transfer functions exist, but have not been used on-chain. Direct transfers carry an explicit `direct-testnet-transfer` label, chain-133 checks, and a per-transfer maximum of 0.001 HSK.
- The reference announcer adapter checks the canonical singleton against the pinned runtime hash and verifies code after deployment. Deployment only accepts chain 133; it uses the standard deterministic deployer when present, otherwise it uses CREATE and returns the actual address.
- On-chain status must not be shown as successful until a receipt and relevant chain state have been read and verified.
- Supplier quote-signing keys are server-only `SUPPLIER_A_SIGNING_PRIVATE_KEY` / `SUPPLIER_B_SIGNING_PRIVATE_KEY` configuration. The offer endpoint checks each key against its separately configured public identity and never returns the key. Development identities are provisioned locally; offers remain disabled until supported token and quote terms are configured.
- Two local development signing identities and two separate stealth identities are in ignored `.env.local`; Windows ACLs allow only the project user, Codex sandbox identity, SYSTEM, and Administrators. Their private values were not printed or committed. Before any funds are handled, export and successfully restore each receiving identity using the encrypted backup flow; the ACL-protected local file alone is not that recovery test.
- Vertex ADC is used only by the server-side `@google/genai` adapter; project, location, Vertex-mode flag, and model are server environment configuration. No ADC token or credential object is sent to the browser. Model output is untrusted ranking data; deterministic policy and explicit approval remain required. No API key or service-account key file is used.

## Requirements
- Do not send supplier master private keys to a backend.
- No plaintext persisted keys or private keys in logs, database rows, telemetry, or network requests.
- Verify chain IDs and contract bytecode before transactions.
- Complete and test encrypted backup recovery before any testnet funds are handled.
- The app must clearly distinguish local workflow checkpoints, direct testnet transfers, and HSP settlements.
- Privacy scope is limited to avoiding direct reuse of a supplier's known recipient wallet. Sender identity, amounts, coordinator knowledge, and chain analysis may remain observable.

## Sepolia stealth recipient withdrawal
- ERC-5564 key recovery and local message signing prove control of the stealth address; a successful `eth_call` shows the USDC token would accept the transfer, but neither proves an on-chain withdrawal.
- The tested stealth recipient currently has no Sepolia ETH for gas. Directly funding it from the payer/development wallet would create an obvious on-chain link between funder and recipient. Do not call that privacy-preserving.
- No relayer, paymaster, mixer, or withdrawal contract has been integrated or reviewed. Do not use one or claim unlinkability without an independently reviewed design and explicit user approval. Any withdrawal transaction requires separate approval.
