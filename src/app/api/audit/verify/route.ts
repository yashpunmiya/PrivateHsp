import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuditBundle } from "@/lib/audit";
import { sepoliaClient, testnetClient } from "@/lib/chain";
import { SEPOLIA_CHAIN_ID, SEPOLIA_USDC, verifySepoliaUsdcTransfer } from "@/lib/sepolia-audit";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const sepoliaEvidence = z.object({
  chainId: z.literal(SEPOLIA_CHAIN_ID), token: address, from: address, to: address,
  amountBaseUnits: z.string().regex(/^[1-9][0-9]*$/).max(78),
  transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  blockNumber: z.string().regex(/^[1-9][0-9]*$/).max(78),
}).strict();

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "chainId" in body && body.chainId === SEPOLIA_CHAIN_ID) {
      const parsed = sepoliaEvidence.safeParse(body);
      if (!parsed.success || parsed.data.token.toLowerCase() !== SEPOLIA_USDC.toLowerCase()) {
        return NextResponse.json({ valid: false, error: "invalid_sepolia_usdc_evidence", evidenceType: "sepolia-usdc-transfer", hspSettlementVerified: false }, { status: 422 });
      }
      const valid = await verifySepoliaUsdcTransfer(sepoliaClient, { ...parsed.data, token: parsed.data.token as `0x${string}`, from: parsed.data.from as `0x${string}`, to: parsed.data.to as `0x${string}`, transactionHash: parsed.data.transactionHash as `0x${string}`, amountBaseUnits: BigInt(parsed.data.amountBaseUnits), blockNumber: BigInt(parsed.data.blockNumber) });
      return NextResponse.json({ valid, evidenceType: "sepolia-usdc-transfer", hspSettlementVerified: false }, { status: valid ? 200 : 422 });
    }
    const result = await verifyAuditBundle(body, testnetClient);
    return NextResponse.json({ ...result, evidenceType: "direct-testnet-transfer", hspSettlementVerified: false }, { status: result.valid ? 200 : 422 });
  } catch {
    return NextResponse.json({ valid: false, error: "verification_unavailable", evidenceType: "direct-testnet-transfer", hspSettlementVerified: false }, { status: 503 });
  }
}
