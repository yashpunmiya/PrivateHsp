import { NextResponse } from "next/server";
import { ERC5564_ANNOUNCER, HASHKEY_TESTNET_ID, testnetClient } from "@/lib/chain";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const [chainId, blockNumber, announcerCode] = await Promise.all([
      testnetClient.getChainId(),
      testnetClient.getBlockNumber(),
      testnetClient.getCode({ address: ERC5564_ANNOUNCER }),
    ]);

    return NextResponse.json({
      status: chainId === HASHKEY_TESTNET_ID ? "online" : "wrong-network",
      network: "HashKey Testnet",
      chainId,
      expectedChainId: HASHKEY_TESTNET_ID,
      rpcUrl: "https://testnet.hsk.xyz",
      explorerUrl: "https://testnet-explorer.hsk.xyz",
      blockNumber: blockNumber.toString(),
      announcerAddress: ERC5564_ANNOUNCER,
      announcerDeployed: Boolean(announcerCode && announcerCode !== "0x"),
      mode: "local-cryptography-only",
      checkedAt,
    });
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        network: "HashKey Testnet",
        chainId: null,
        expectedChainId: HASHKEY_TESTNET_ID,
        rpcUrl: "https://testnet.hsk.xyz",
        explorerUrl: "https://testnet-explorer.hsk.xyz",
        announcerAddress: ERC5564_ANNOUNCER,
        announcerDeployed: false,
        mode: "local-cryptography-only",
        checkedAt,
      },
      { status: 503 },
    );
  }
}
