import { describe, expect, it, vi } from "vitest";
import { encodeAbiParameters, encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { SEPOLIA_CHAIN_ID, SEPOLIA_USDC, verifySepoliaUsdcTransfer, type SepoliaUsdcEvidence } from "./sepolia-audit";

const from = "0x0000000000000000000000000000000000000001" as Address;
const to = "0x0000000000000000000000000000000000000002" as Address;
const hash = `0x${"ab".repeat(32)}` as Hex;
const block = 123n;
const amount = 1_000_000n;
const abi = parseAbi(["function transfer(address to,uint256 value)", "event Transfer(address indexed from,address indexed to,uint256 value)"]);
const input = encodeFunctionData({ abi, functionName: "transfer", args: [to, amount] });
const topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex;
const log = { address: SEPOLIA_USDC, topics: [topic, `0x${from.slice(2).padStart(64,"0")}`, `0x${to.slice(2).padStart(64,"0")}`] as [Hex, Hex, Hex], data: encodeAbiParameters([{type:"uint256"}], [amount]), blockNumber:block, transactionHash:hash, transactionIndex:0, blockHash:`0x${"cd".repeat(32)}` as Hex, logIndex:0, removed:false };
const evidence: SepoliaUsdcEvidence = { chainId: SEPOLIA_CHAIN_ID, token: SEPOLIA_USDC, from, to, amountBaseUnits: amount, transactionHash: hash, blockNumber:block };

function fixture(chainId=SEPOLIA_CHAIN_ID, eventLog=log) {
  const tx = { hash, blockNumber:block, from, to:SEPOLIA_USDC, input, value:0n };
  const receipt = { transactionHash:hash, blockNumber:block, status:"success", logs:[eventLog] };
  return { getChainId:vi.fn(async()=>chainId), getTransaction:vi.fn(async()=>tx), getTransactionReceipt:vi.fn(async()=>receipt) };
}

describe("Sepolia USDC transaction audit",()=>{
  it("accepts matching successful transaction calldata and Transfer log",async()=>{
    expect(await verifySepoliaUsdcTransfer(fixture() as never,evidence)).toBe(true);
  });
  it("rejects a different chain, amount, recipient, token, or receipt event",async()=>{
    expect(await verifySepoliaUsdcTransfer(fixture(133) as never,evidence)).toBe(false);
    expect(await verifySepoliaUsdcTransfer(fixture() as never,{...evidence,amountBaseUnits:amount+1n})).toBe(false);
    expect(await verifySepoliaUsdcTransfer(fixture() as never,{...evidence,to:from})).toBe(false);
    expect(await verifySepoliaUsdcTransfer(fixture() as never,{...evidence,token:from})).toBe(false);
    expect(await verifySepoliaUsdcTransfer(fixture() as never,{...evidence,blockNumber:block+1n})).toBe(false);
  });
});
