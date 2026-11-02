import { decodeFunctionData, parseAbi, parseEventLogs, type Address, type Hex, type PublicClient } from "viem";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address;
const transferAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
  "function transfer(address to,uint256 value)",
]);

export type SepoliaUsdcEvidence = {
  chainId: typeof SEPOLIA_CHAIN_ID;
  token: Address;
  from: Address;
  to: Address;
  amountBaseUnits: bigint;
  transactionHash: Hex;
  blockNumber: bigint;
};

/** Verifies a specific Sepolia USDC transfer against its transaction and receipt. */
export async function verifySepoliaUsdcTransfer(
  client: Pick<PublicClient, "getChainId" | "getTransaction" | "getTransactionReceipt">,
  evidence: SepoliaUsdcEvidence,
): Promise<boolean> {
  if (evidence.chainId !== SEPOLIA_CHAIN_ID || evidence.token.toLowerCase() !== SEPOLIA_USDC.toLowerCase()
    || evidence.amountBaseUnits <= 0n || evidence.blockNumber <= 0n) return false;
  if (await client.getChainId() !== SEPOLIA_CHAIN_ID) return false;
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: evidence.transactionHash }),
    client.getTransactionReceipt({ hash: evidence.transactionHash }),
  ]);
  if (receipt.status !== "success" || receipt.transactionHash.toLowerCase() !== evidence.transactionHash.toLowerCase()
    || receipt.blockNumber !== evidence.blockNumber || tx.blockNumber !== evidence.blockNumber
    || tx.to?.toLowerCase() !== evidence.token.toLowerCase() || tx.from.toLowerCase() !== evidence.from.toLowerCase()) return false;
  let decoded;
  try { decoded = decodeFunctionData({ abi: transferAbi, data: tx.input }); } catch { return false; }
  if (decoded.functionName !== "transfer" || decoded.args[0].toLowerCase() !== evidence.to.toLowerCase()
    || decoded.args[1] !== evidence.amountBaseUnits) return false;
  try {
    const logs = parseEventLogs({ abi: [transferAbi[0]], logs: receipt.logs, strict: true });
    return logs.some(log => log.eventName === "Transfer"
      && log.address.toLowerCase() === evidence.token.toLowerCase()
      && log.args.from.toLowerCase() === evidence.from.toLowerCase()
      && log.args.to.toLowerCase() === evidence.to.toLowerCase()
      && log.args.value === evidence.amountBaseUnits);
  } catch { return false; }
}
