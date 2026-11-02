import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { HASHKEY_TESTNET_ID } from "./chain";

export const MAX_DIRECT_TESTNET_TRANSFER = BigInt("1000000000000000"); // 0.001 HSK
export const PAYMENT_MODE_DIRECT_TRANSFER = "direct-testnet-transfer" as const;

export type DirectTransferPlan = {
  mode: typeof PAYMENT_MODE_DIRECT_TRANSFER;
  chainId: 133;
  from: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  gasPrice: bigint;
  totalRequired: bigint;
};

export type DirectTransferEvidence = {
  mode: typeof PAYMENT_MODE_DIRECT_TRANSFER;
  chainId: 133;
  from: Address;
  to: Address;
  value: bigint;
  transactionHash: Hex;
  blockNumber: bigint;
  status: "success";
  explorerUrl: string;
};

function requireTestnet(chainId: number, walletChainId: number | undefined): void {
  if (chainId !== HASHKEY_TESTNET_ID || walletChainId !== HASHKEY_TESTNET_ID) {
    throw new Error("Direct transfer is restricted to HashKey Testnet (133)");
  }
}

function requireAccount(client: Pick<WalletClient, "account">): Address {
  const account = client.account;
  if (!account || typeof account === "string") throw new Error("A local or connected signing account is required");
  return account.address;
}

export async function prepareDirectTestnetTransfer(
  publicClient: Pick<PublicClient, "getChainId" | "getBalance" | "estimateGas" | "getGasPrice">,
  walletClient: Pick<WalletClient, "chain" | "account">,
  to: Address,
  value: bigint,
): Promise<DirectTransferPlan> {
  const chainId = await publicClient.getChainId();
  requireTestnet(chainId, walletClient.chain?.id);
  const from = requireAccount(walletClient);
  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) throw new Error("Recipient address is malformed");
  if (value <= BigInt(0) || value > MAX_DIRECT_TESTNET_TRANSFER) {
    throw new Error("Direct-transfer amount must be positive and no greater than 0.001 HSK");
  }

  const [balance, gas, gasPrice] = await Promise.all([
    publicClient.getBalance({ address: from }),
    publicClient.estimateGas({ account: from, to, value }),
    publicClient.getGasPrice(),
  ]);
  const totalRequired = value + gas * gasPrice;
  if (balance < totalRequired) throw new Error("Payer wallet does not have enough HSK for value and gas");
  return { mode: PAYMENT_MODE_DIRECT_TRANSFER, chainId: 133, from, to, value, gas, gasPrice, totalRequired };
}

export async function executeDirectTestnetTransfer(
  publicClient: Pick<PublicClient, "getChainId" | "waitForTransactionReceipt" | "getTransaction" | "getTransactionReceipt">,
  walletClient: Pick<WalletClient, "chain" | "account" | "sendTransaction">,
  plan: DirectTransferPlan,
): Promise<DirectTransferEvidence> {
  requireTestnet(await publicClient.getChainId(), walletClient.chain?.id);
  const from = requireAccount(walletClient);
  if (plan.mode !== PAYMENT_MODE_DIRECT_TRANSFER
      || plan.value <= BigInt(0)
      || plan.value > MAX_DIRECT_TESTNET_TRANSFER
      || plan.gas <= BigInt(0)
      || plan.gasPrice <= BigInt(0)
      || plan.totalRequired !== plan.value + plan.gas * plan.gasPrice
      || !/^0x[0-9a-fA-F]{40}$/.test(plan.to)) {
    throw new Error("Direct-transfer plan failed validation");
  }
  if (from.toLowerCase() !== plan.from.toLowerCase() || plan.chainId !== HASHKEY_TESTNET_ID) {
    throw new Error("Transfer plan does not match the active payer account and chain");
  }

  const transactionHash = await walletClient.sendTransaction({
    account: walletClient.account as Exclude<WalletClient["account"], string | undefined>,
    chain: walletClient.chain,
    to: plan.to,
    value: plan.value,
    gas: plan.gas,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  if (receipt.status !== "success") throw new Error("Direct testnet transfer transaction did not succeed");
  const [chainId, transaction] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getTransaction({ hash: transactionHash }),
  ]);
  requireTestnet(chainId, walletClient.chain?.id);
  if (transaction.from.toLowerCase() !== plan.from.toLowerCase()
      || transaction.to?.toLowerCase() !== plan.to.toLowerCase()
      || transaction.value !== plan.value) {
    throw new Error("Mined transaction does not match the authorized direct-transfer plan");
  }
  if (receipt.transactionHash.toLowerCase() !== transactionHash.toLowerCase()
      || !receipt.blockNumber) throw new Error("Successful receipt does not match the submitted transaction");

  return {
    mode: PAYMENT_MODE_DIRECT_TRANSFER,
    chainId: 133,
    from: plan.from,
    to: plan.to,
    value: plan.value,
    transactionHash,
    blockNumber: receipt.blockNumber,
    status: "success",
    explorerUrl: `https://testnet-explorer.hsk.xyz/tx/${transactionHash}`,
  };
}

export async function verifyDirectTestnetTransfer(
  publicClient: Pick<PublicClient, "getChainId" | "getTransaction" | "getTransactionReceipt">,
  evidence: DirectTransferEvidence,
): Promise<boolean> {
  if (evidence.mode !== PAYMENT_MODE_DIRECT_TRANSFER || evidence.chainId !== HASHKEY_TESTNET_ID) return false;
  if (await publicClient.getChainId() !== HASHKEY_TESTNET_ID) return false;
  const [transaction, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: evidence.transactionHash }),
    publicClient.getTransactionReceipt({ hash: evidence.transactionHash }),
  ]);
  return receipt.status === "success"
    && receipt.transactionHash.toLowerCase() === evidence.transactionHash.toLowerCase()
    && receipt.blockNumber === evidence.blockNumber
    && transaction.from.toLowerCase() === evidence.from.toLowerCase()
    && transaction.to?.toLowerCase() === evidence.to.toLowerCase()
    && transaction.value === evidence.value;
}
