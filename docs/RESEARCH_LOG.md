# Research log

Checked 2026-10-26 (Asia/Kolkata).

- HashKey official Network Info: testnet RPC `https://testnet.hsk.xyz`, chain ID 133, native token HSK, explorer `https://testnet-explorer.hsk.xyz`; mainnet is 177. Testnet RPC `eth_chainId` returned `0x85` (verified).
- HashKey official Developer QuickStart: confirms testnet chain ID 133 and Foundry command usage. Foundry/anvil are not installed in this environment.
- ERC-5564 singleton from the EIP is `0x55649E01B5Df198D18D95b5cc5051630cfD45564`. Testnet `eth_getCode` returned `0x`, so it is not deployed at the canonical address on HashKey testnet at the checked head. No contract has been deployed.
- ScopeLift GitHub repository is reachable; `git ls-remote` returned HEAD `88bcc27c3b6163080ee18f330dfd6336dc8bd2e2` on check. npm currently documents package `@scopelift/stealth-address-sdk` 1.0.0-beta.5 and ERC-5564 scheme 1 utilities. Actual installed exports will be checked before use.
- HSP guide is reachable, but the referenced canonical repository `https://github.com/project-hsp/hsp.git` returns “Repository not found” from `git ls-remote`. Guide labels Coordinator URL/API key as organizer-shared placeholders; no real HSP credentials/API have been provided. HSP integration is blocked; no SDK API is assumed.
- DoraHacks hackathon detail page could not be fetched from this environment. Official rules/tracks/submission requirements remain unverified.
- Faucet availability/funding not yet checked. No development wallets created and no funds requested.
