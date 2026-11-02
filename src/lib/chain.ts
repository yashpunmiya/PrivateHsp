import { createPublicClient, defineChain, http } from "viem";
import { sepolia } from "viem/chains";

export const HASHKEY_TESTNET_ID = 133;
export const ERC5564_ANNOUNCER = "0x55649E01B5Df198D18D95b5cc5051630cfD45564" as const;

export const hashkeyTestnet = defineChain({
  id: HASHKEY_TESTNET_ID,
  name: "HashKey Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hsk.xyz"] } },
  blockExplorers: { default: { name: "HashKey Explorer", url: "https://testnet-explorer.hsk.xyz" } },
  testnet: true,
});

export const testnetClient = createPublicClient({
  chain: hashkeyTestnet,
  transport: http("https://testnet.hsk.xyz", { timeout: 10_000 }),
});

export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com", { timeout: 10_000 }),
});
