import { describe, expect, it, vi } from "vitest";
import type { PublicClient, WalletClient } from "viem";
import { executeDirectTestnetTransfer, MAX_DIRECT_TESTNET_TRANSFER, prepareDirectTestnetTransfer, verifyDirectTestnetTransfer } from "./payment";

const payer = "0x1111111111111111111111111111111111111111" as const;
const recipient = "0x2222222222222222222222222222222222222222" as const;
const transactionHash = `0x${"a".repeat(64)}` as const;
const wallet = { chain: { id: 133 }, account: { address: payer } } as unknown as Pick<WalletClient, "chain" | "account">;

describe("direct HashKey Testnet transfer adapter", () => {
  it("prepares a bounded transfer only when balance covers value and gas", async () => {
    const client = {
      getChainId: vi.fn(async () => 133),
      getBalance: vi.fn(async () => BigInt("1000000000000000000")),
      estimateGas: vi.fn(async () => BigInt(21_000)),
      getGasPrice: vi.fn(async () => BigInt(1_000_000_000)),
    } as unknown as Pick<PublicClient, "getChainId" | "getBalance" | "estimateGas" | "getGasPrice">;

    const plan = await prepareDirectTestnetTransfer(client, wallet, recipient, BigInt("100000000000000"));
    expect(plan.mode).toBe("direct-testnet-transfer");
    expect(plan.totalRequired).toBe(BigInt("121000000000000"));
    await expect(prepareDirectTestnetTransfer(client, wallet, recipient, MAX_DIRECT_TESTNET_TRANSFER + BigInt(1)))
      .rejects.toThrow("no greater than 0.001 HSK");
  });

  it("rejects mainnet, insufficient balances, and RPC errors before signing", async () => {
    const base = {
      getChainId: vi.fn(async () => 133),
      getBalance: vi.fn(async () => BigInt(1)),
      estimateGas: vi.fn(async () => BigInt(21_000)),
      getGasPrice: vi.fn(async () => BigInt(1_000_000_000)),
    };
    const client = base as unknown as Pick<PublicClient, "getChainId" | "getBalance" | "estimateGas" | "getGasPrice">;
    await expect(prepareDirectTestnetTransfer(client, wallet, recipient, BigInt("100000000000000")))
      .rejects.toThrow("does not have enough HSK");
    base.getChainId.mockResolvedValue(177);
    await expect(prepareDirectTestnetTransfer(client, wallet, recipient, BigInt("100000000000000")))
      .rejects.toThrow("restricted to HashKey Testnet");
    base.getChainId.mockRejectedValue(new Error("RPC timeout"));
    await expect(prepareDirectTestnetTransfer(client, wallet, recipient, BigInt("100000000000000")))
      .rejects.toThrow("RPC timeout");
  });

  it("submits, waits for, and verifies the exact successful transfer receipt", async () => {
    const receipt = {
      status: "success",
      blockNumber: BigInt(500),
      transactionHash,
      logs: [],
    };
    const rpc = {
      getChainId: vi.fn(async () => 133),
      waitForTransactionReceipt: vi.fn(async () => receipt),
      getTransaction: vi.fn(async () => ({ from: payer, to: recipient, value: BigInt("100000000000000") })),
      getTransactionReceipt: vi.fn(async () => receipt),
    } as unknown as Pick<PublicClient, "getChainId" | "waitForTransactionReceipt" | "getTransaction" | "getTransactionReceipt">;
    const signer = {
      ...wallet,
      sendTransaction: vi.fn(async () => transactionHash),
    } as unknown as Pick<WalletClient, "chain" | "account" | "sendTransaction">;
    const plan = {
      mode: "direct-testnet-transfer" as const,
      chainId: 133 as const,
      from: payer,
      to: recipient,
      value: BigInt("100000000000000"),
      gas: BigInt(21_000),
      gasPrice: BigInt(1_000_000_000),
      totalRequired: BigInt("121000000000000"),
    };

    const evidence = await executeDirectTestnetTransfer(rpc, signer, plan);
    expect(signer.sendTransaction).toHaveBeenCalledOnce();
    expect(evidence.mode).toBe("direct-testnet-transfer");
    expect(evidence.explorerUrl).toBe(`https://testnet-explorer.hsk.xyz/tx/${transactionHash}`);
    expect(await verifyDirectTestnetTransfer(rpc, evidence)).toBe(true);
    expect(await verifyDirectTestnetTransfer(rpc, { ...evidence, value: evidence.value + BigInt(1) })).toBe(false);
  });

  it("rejects reverted receipts and mismatched mined transfers", async () => {
    const plan = {
      mode: "direct-testnet-transfer" as const,
      chainId: 133 as const,
      from: payer,
      to: recipient,
      value: BigInt("100000000000000"),
      gas: BigInt(21_000),
      gasPrice: BigInt(1_000_000_000),
      totalRequired: BigInt("121000000000000"),
    };
    const make = (status: "success" | "reverted", to: string) => ({
      getChainId: vi.fn(async () => 133),
      waitForTransactionReceipt: vi.fn(async () => ({ status, blockNumber: BigInt(500), transactionHash, logs: [] })),
      getTransaction: vi.fn(async () => ({ from: payer, to, value: plan.value })),
      getTransactionReceipt: vi.fn(async () => ({ status, blockNumber: BigInt(500), transactionHash })),
    }) as unknown as Pick<PublicClient, "getChainId" | "waitForTransactionReceipt" | "getTransaction" | "getTransactionReceipt">;
    const signer = { ...wallet, sendTransaction: vi.fn(async () => transactionHash) } as unknown as Pick<WalletClient, "chain" | "account" | "sendTransaction">;

    await expect(executeDirectTestnetTransfer(make("reverted", recipient), signer, plan)).rejects.toThrow("did not succeed");
    await expect(executeDirectTestnetTransfer(make("success", payer), signer, plan)).rejects.toThrow("does not match");
    await expect(executeDirectTestnetTransfer(make("success", recipient), signer, { ...plan, value: MAX_DIRECT_TESTNET_TRANSFER + BigInt(1) }))
      .rejects.toThrow("plan failed validation");
  });
});
