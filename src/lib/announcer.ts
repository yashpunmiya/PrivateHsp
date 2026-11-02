import { ERC5564_BYTECODE } from "@scopelift/stealth-address-sdk/dist/config/bytecode.js";
import { keccak256, parseAbi, parseEventLogs, type Address, type Hex, type PublicClient, type WalletClient } from "viem";
import { HASHKEY_TESTNET_ID } from "./chain";
import { isValidAnnouncement, recognizesAnnouncement, type StealthAnnouncement, type StealthIdentity } from "./stealth";

export const announcerAbi = parseAbi([
  "event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)",
  "function announce(uint256 schemeId, address stealthAddress, bytes ephemeralPubKey, bytes metadata)",
]);
const announcementEvent = announcerAbi[0];
const announceFunction = announcerAbi[1];
const CREATE2_FACTORY = "0x4e59b44847b379578588920ca78fbf26c0b4956c" as const;
const CREATE2_SALT = "0xd0103a290d760f027c9ca72675f5121d725397fb2f618f05b6c44958b25b4447" as const;

export type AnnouncementRecord = {
  id: string;
  schemeId: 1;
  stealthAddress: Address;
  caller: Address;
  ephemeralPublicKey: Hex;
  viewTag: Hex;
  metadata: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
};

export function getReferenceAnnouncerBytecode(): Hex {
  return ERC5564_BYTECODE;
}

/** Extract the runtime section from the pinned ScopeLift reference initcode and return its code hash. */
export function getReferenceAnnouncerRuntimeHash(): Hex {
  const prefix = /^0x608060405234801561001057600080fd5b5061([0-9a-f]{4})806100206000396000f3fe/i.exec(ERC5564_BYTECODE);
  if (!prefix) throw new Error("Pinned ERC-5564 creation bytecode has an unsupported initcode prefix");
  const runtimeLength = Number.parseInt(prefix[1], 16);
  const runtimeStart = 2 + 32 * 2;
  const runtimeEnd = runtimeStart + runtimeLength * 2;
  const runtime = `0x${ERC5564_BYTECODE.slice(runtimeStart, runtimeEnd)}` as Hex;
  if (runtime.length !== 2 + runtimeLength * 2) throw new Error("Pinned ERC-5564 bytecode is truncated");
  return keccak256(runtime);
}

export async function isCompatibleAnnouncer(client: Pick<PublicClient, "getCode">, address: Address): Promise<boolean> {
  const code = await client.getCode({ address });
  return !!code && code !== "0x" && keccak256(code) === getReferenceAnnouncerRuntimeHash();
}

export async function deployReferenceAnnouncer(
  publicClient: Pick<PublicClient, "getChainId" | "getCode" | "waitForTransactionReceipt">,
  walletClient: Pick<WalletClient, "chain" | "account" | "sendTransaction">,
): Promise<{ address: Address; transactionHash?: Hex; method: "existing" | "create2" | "create" }> {
  const chainId = await publicClient.getChainId();
  if (chainId !== HASHKEY_TESTNET_ID || walletClient.chain?.id !== HASHKEY_TESTNET_ID) {
    throw new Error("Deployment is restricted to a wallet and RPC on HashKey Testnet (133)");
  }
  const account = walletClient.account;
  if (!account || typeof account === "string") throw new Error("A local or connected account is required");

  const canonical = "0x55649E01B5Df198D18D95b5cc5051630cfD45564" as Address;
  const existingCanonical = await publicClient.getCode({ address: canonical });
  if (existingCanonical && existingCanonical !== "0x") {
    if (keccak256(existingCanonical) === getReferenceAnnouncerRuntimeHash()) return { address: canonical, method: "existing" };
  }

  const factoryCode = await publicClient.getCode({ address: CREATE2_FACTORY });
  let transactionHash: Hex;
  let method: "create2" | "create";
  let predicted: Address | undefined;
  if ((!existingCanonical || existingCanonical === "0x") && factoryCode && factoryCode !== "0x") {
    const { getCreate2Address } = await import("viem");
    predicted = getCreate2Address({ from: CREATE2_FACTORY, salt: CREATE2_SALT, bytecode: ERC5564_BYTECODE });
    const predictedCode = await publicClient.getCode({ address: predicted });
    if (predictedCode && predictedCode !== "0x") {
      if (keccak256(predictedCode) !== getReferenceAnnouncerRuntimeHash()) throw new Error("Predicted announcer address contains incompatible code");
      throw new Error("Reference announcer is already deployed at its deterministic address");
    }
    transactionHash = await walletClient.sendTransaction({
      account,
      to: CREATE2_FACTORY,
      data: `${CREATE2_SALT}${ERC5564_BYTECODE.slice(2)}` as Hex,
      chain: walletClient.chain,
    });
    method = "create2";
  } else {
    transactionHash = await walletClient.sendTransaction({ account, data: ERC5564_BYTECODE, chain: walletClient.chain });
    method = "create";
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  if (receipt.status !== "success") throw new Error("ERC-5564 announcer deployment failed");
  const address = predicted ?? receipt.contractAddress;
  if (!address) throw new Error("Deployment receipt did not identify the announcer address");
  const deployedCode = await publicClient.getCode({ address });
  if (!deployedCode || keccak256(deployedCode) !== getReferenceAnnouncerRuntimeHash()) {
    throw new Error("Deployed bytecode does not match the pinned ScopeLift ERC-5564 reference");
  }
  return { address, transactionHash, method };
}

export async function publishAnnouncement(
  publicClient: Pick<PublicClient, "getChainId" | "getCode" | "waitForTransactionReceipt">,
  walletClient: Pick<WalletClient, "chain" | "account" | "writeContract">,
  address: Address,
  announcement: StealthAnnouncement,
): Promise<{ transactionHash: Hex; blockNumber: bigint; logIndex: number }> {
  if (await publicClient.getChainId() !== HASHKEY_TESTNET_ID || walletClient.chain?.id !== HASHKEY_TESTNET_ID) {
    throw new Error("Announcement is restricted to HashKey Testnet (133)");
  }
  if (!isValidAnnouncement(announcement)) throw new Error("Announcement fields are malformed");
  if (announcement.metadata.slice(0, 4).toLowerCase() !== announcement.viewTag.toLowerCase()) {
    throw new Error("ERC-5564 metadata must start with the announcement view tag");
  }
  if (!await isCompatibleAnnouncer(publicClient, address)) throw new Error("Announcer bytecode is missing or incompatible");
  const account = walletClient.account;
  if (!account || typeof account === "string") throw new Error("A local or connected account is required");

  const hash = await walletClient.writeContract({
    account,
    chain: walletClient.chain,
    address,
    abi: [announcementEvent, announceFunction],
    functionName: "announce",
    args: [BigInt(announcement.schemeId), announcement.stealthAddress, announcement.ephemeralPublicKey, announcement.metadata],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Announcement transaction did not succeed");
  const events = parseEventLogs({ abi: [announcementEvent], logs: receipt.logs, strict: true });
  const match = events.find((event) => event.eventName === "Announcement"
    && event.args.schemeId === BigInt(announcement.schemeId)
    && event.args.stealthAddress.toLowerCase() === announcement.stealthAddress.toLowerCase()
    && event.args.ephemeralPubKey.toLowerCase() === announcement.ephemeralPublicKey.toLowerCase()
    && event.args.metadata.toLowerCase() === announcement.metadata.toLowerCase());
  if (!match) throw new Error("Successful receipt is missing the expected ERC-5564 Announcement event");
  return { transactionHash: hash, blockNumber: receipt.blockNumber, logIndex: match.logIndex };
}

export async function scanAnnouncements(
  client: Pick<PublicClient, "getChainId" | "getLogs">,
  announcer: Address,
  identity: Pick<StealthIdentity, "spendingPublicKey" | "viewingPrivateKey">,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{ scanned: number; matches: AnnouncementRecord[] }> {
  const chainId = await client.getChainId();
  if (chainId !== HASHKEY_TESTNET_ID) throw new Error("Announcement scanner is restricted to HashKey Testnet (133)");
  if (fromBlock < BigInt(0) || toBlock < fromBlock || toBlock - fromBlock > BigInt(5000)) throw new Error("Block range must be ordered and at most 5001 blocks");

  const logs = await client.getLogs({ address: announcer, event: announcementEvent, fromBlock, toBlock });
  const unique = new Map<string, AnnouncementRecord>();
  const seenAnnouncements = new Set<string>();
  for (const log of logs) {
    if (log.removed || !log.args.schemeId || log.args.schemeId !== BigInt(1) || !log.args.stealthAddress || !log.args.caller || !log.args.ephemeralPubKey || !log.args.metadata || !log.blockNumber || !log.transactionHash || log.logIndex === undefined) continue;
    if (!log.args.metadata.startsWith("0x") || log.args.metadata.length < 4) continue;
    const viewTag = `0x${log.args.metadata.slice(2, 4)}` as Hex;
    const candidate: StealthAnnouncement = {
      schemeId: 1,
      stealthAddress: log.args.stealthAddress,
      ephemeralPublicKey: log.args.ephemeralPubKey,
      viewTag,
      metadata: log.args.metadata,
    };
    if (!recognizesAnnouncement(identity, candidate)) continue;
    const tuple = `${candidate.stealthAddress.toLowerCase()}:${candidate.ephemeralPublicKey.toLowerCase()}:${viewTag.toLowerCase()}`;
    if (seenAnnouncements.has(tuple)) continue;
    seenAnnouncements.add(tuple);
    const id = `${log.blockHash ?? "unknown"}:${log.transactionHash}:${log.logIndex}`;
    unique.set(id, {
      id,
      schemeId: 1,
      stealthAddress: log.args.stealthAddress,
      caller: log.args.caller,
      ephemeralPublicKey: log.args.ephemeralPubKey,
      viewTag,
      metadata: log.args.metadata,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
    });
  }
  return { scanned: logs.length, matches: [...unique.values()] };
}
