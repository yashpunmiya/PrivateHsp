# Deployment

No app or contracts are deployed. All project development, deployment, and payment testing is TESTNET ONLY; mainnet contracts and transactions are prohibited. Sepolia is the authorized standalone Ethereum test environment, while HashKey Testnet is a separate HashKey-specific environment. Do not treat Sepolia as an HSP-supported network without an actual `get_chain_config` response.

### Ethereum Sepolia test environment
- Chain ID: `11155111` (`0xaa36a7`); read-only RPC verified at `https://ethereum-sepolia-rpc.publicnode.com` on 2026-11-02.
- Circle test USDC contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`; obtain test USDC from the [official Circle faucet](https://faucet.circle.com/). Token receipt does not pay gas; a separate faucet must provide Sepolia ETH.
- The canonical ERC-5564 singleton `0x55649E01B5Df198D18D95b5cc5051630cfD45564` has 709 bytes of code on Sepolia. Its observed runtime hash exactly matched the pinned ScopeLift reference hash `0x80ed491c57edc6d92b5a85cc7db2dfeb40bbab52476b5b09b9b21c5c907b77c4` on 2026-11-02. No announcer deployment is needed on Sepolia unless a different address or contract extension is required.
- Dedicated Sepolia development wallet: `0xae0D850f81a4224e0fA8CeD2f0026206D16Bc1F3`. Its private key is stored only as a Windows DPAPI-encrypted blob in ignored `.privatehsp-data/sepolia-wallet.dpapi`; address metadata is in that ignored folder. Decryption and viem address derivation were verified locally. Before the approved test transaction it held 0.05 Sepolia ETH and 60 test USDC; check current balances before further use. The key is DPAPI-bound to this Windows user profile and is not a portable backup.
- Before any additional transaction, check sender balance and gas for exact calldata, and obtain explicit user approval. The Sepolia canonical announcer already matches the pinned runtime; no duplicate deployment is needed.
- `SEPOLIA_*` settings in `.env.example` are isolated read/development settings; never route HSP payments to this network unless live HSP configuration explicitly supports it.

### Vertex AI supplier selector
The server uses `@google/genai` with explicit `vertexai: true`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`. Configure `GEMINI_USE_VERTEX=true` and `GEMINI_MODEL`; local development uses ADC from `gcloud auth application-default login`. Never use a Gemini API key, service-account key file, or `NEXT_PUBLIC_` credential. Model calls fail closed if configuration or ADC is unavailable. `gemini-3.8-flash` was verified with a real ADC-backed request in the configured project and `global` location; `gemini-2.5-flash` returned HTTP 404 because it is retired. See [Vertex setup](../README.md#run-locally).

### Hosting readiness
- No hosting provider, project, domain, or deployment credentials are configured; production deployment is not complete.
- Required server-side settings: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_USE_VERTEX`, `GEMINI_MODEL`, the two supplier signing identities, their stealth meta-addresses, and actual supported quote token/amount settings. Do not copy local `.env.local` wholesale.
- Never upload the Windows ADC file, `.privatehsp-data/`, wallet keys, or local `.env.local` to the host. On Google Cloud, attach a dedicated least-privilege runtime service identity for Vertex AI and let ADC obtain credentials from the platform. Google explicitly advises against setting `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run when using its service identity; see [Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity).
- For a non-Google host, use Workload Identity Federation where supported; avoid long-lived service-account keys. See [Google ADC guidance](https://docs.cloud.google.com/docs/authentication/set-up-adc-on-premises).
- Keep model calls server-side and all payment/wallet secrets out of browser-exposed variables. Before deploy, provision a persistent database and test the deployed server actions with secrets configured only in the host's encrypted environment settings.
