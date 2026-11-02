# HSP integration status

## Current connectivity (2026-11-02)
- The local profile file `C:\Users\yyash\.codex\config.toml` contains an `hsp-agentic-payment` server section. The current Codex chat exposes no tools under that server. Running `codex mcp list` from the local PowerShell session produced no output, so client/session readiness is not confirmed.
- Laptop IPv4 egress verified as `152.58.28.166`.
- One read-only MCP initialize was attempted from Windows: HTTP **403**, `text/html; charset=UTF-8`, Cloudflare challenge page. Ray ID: `a543956d8892e8ef-LAX`. Stop further Gateway requests until HashKey Operations confirms access. This response shows Cloudflare denied this request; it does not prove the allowlist is the specific cause.
- No MCP initialize success, `tools/list`, eight-tool discovery, or `get_chain_config` response. No Gateway order/payment or HSP settlement exists for PrivateHSP.

## External implementation reference (not PrivateHSP evidence)
The public [Swift Bot Labs HSK Meter](https://github.com/swiftbotlabs/hsk-meter) repository provides useful implementation and fixture references. Its [HSP QA README](https://github.com/swiftbotlabs/hsk-meter/blob/main/hsp_qa/README.md), [HSP status report](https://github.com/swiftbotlabs/hsk-meter/blob/main/HSP_STATUS.md), [fixtures](https://github.com/swiftbotlabs/hsk-meter/tree/main/hsp_qa/fixtures), and [receipt file](https://github.com/swiftbotlabs/hsk-meter/blob/main/docs/hsp_receipts.json) report a live QA configuration that included Ethereum Sepolia USDC at the time of their status report. This is another team's report and fixture set; it is **not** a current official response for PrivateHSP and must not be treated as proof of our Gateway access/payment.

The reference highlights implementation hazards to handle once our own live tool schemas are available:
- `get_chain_config` may return flat `networks` and `tokens` collections joined by `chain_id`, with duplicate token rows; do not assume nested token lists.
- Hexadecimal `domain.chainId` values (for example `0x14a34`) must be parsed as base 16; token base units must come from the prepared mandate and supported token metadata.
- `gas_fee_advanced` may be per-network configuration on `get_order`; Gateway sponsorship does not imply a zero-fee order.
- The prepared EIP-712 `from`, `to`, token domain, chain, amount, and validity interval must match the locally authorized order before signing. The same exact approved payload must be signed.
- `attribution_verified` alone is not payment proof; require a successful payment status and independently verify the transaction/token transfer. A query timeout/error does not erase on-chain evidence.

These observations guide defensive parser/tests only. Do not build guessed request/response schemas or adopt unknown network/token addresses in production logic without validating them against PrivateHSP's live MCP response.

## Required flow after access is restored
1. Restart/refresh the correct local Codex session and confirm the HSP tools appear.
2. Discover the actual tools and schemas; call read-only `get_chain_config` and persist a sanitized config snapshot with timestamp.
3. Determine supported testnet/token/protocol from that response. Check whether the existing Sepolia stealth recipient is accepted as `pay_to`; otherwise stop and use an officially supported testnet only after configuring its chain/token and deriving a matching stealth recipient.
4. Enforce supplier allowlist, quote expiry, unique request/payment IDs, spend cap, exact recipient/token/payer/chain/amount/fee/validity. Any mismatch refuses before signing.
5. Present the exact `prepare_payment` payload for human approval; require a separate approval before signing and a second explicit approval before `submit_payment`.
6. Preserve identifiers/statuses and recover safely from duplicate calls/timeouts. Query payment and independently check the returned transaction receipt and token transfer. Never treat a timeout as success.

## Access owner action
Give HashKey Operations IP `152.58.28.166` and Ray ID `a543956d8892e8ef-LAX`. Ask them to inspect that request at the QA edge and confirm the exact client/IP/session requirements. Do not use another IP, credentials, or bypass mechanisms.

## Current egress/Cloudflare diagnostic — 2026-11-02 14:08:08 UTC
- The IP previously submitted for allowlisting was `152.58.28.166`. The current Windows egress is now **IPv4 `152.58.42.114`** and IPv6 `2409:40c0:1054:26a0:553:daaa:5def:bc8c`; the IPv4 has changed. No proxy environment variables or active VPN adapter were detected; default route is Wi-Fi. This strongly warrants an Operations check but does not itself prove the allowlist caused the 403.
- Profile file confirms the server stanza and exact URL. `codex mcp list` returned no output in this shell, and the current chat tool catalog has no HSP tool, so effective startup registration is not confirmed.
- One direct, no-proxy, correctly formed Streamable HTTP `POST /` initialize (Accept JSON + SSE; JSON-RPC 2.0 initialize) was sent at `2026-11-02T14:08:08.025Z`. Response: HTTP 403, `text/html; charset=UTF-8`, title `Attention Required! | Cloudflare`, no JSON-RPC response, Ray `a543b5aa2d566100-DFW`. This was rejected before MCP handling. No further initialization was attempted.
- The local source IP submitted previously does not match current IPv4. Give Operations the current IPv4, IPv6 and Ray ID; ask them to look up the edge-observed client address for the Ray and confirm/update the allowlist for the actual routed address (including whether IPv6 is used). Ask them to confirm completion before a later single retry.
- Reviewed HSK Meter's public MCP client: it uses Streamable HTTP initialize/tools discovery and disables proxy inheritance and redirects. Our direct no-proxy request reproduced the same Cloudflare denial, so a local proxy/client redirect does not explain this attempt. The HSP section has no URL mismatch. The active desktop-session tool injection remains unavailable to this chat.
