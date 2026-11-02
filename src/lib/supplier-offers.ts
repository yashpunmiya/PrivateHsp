import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { signSupplierQuote, type SupplierQuoteDraft } from "./quotes";

const configSchema = z.object({
  agentId: z.string().min(1), supplierAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), signingPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  stealthMetaAddress: z.string().min(1), tokenAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/), amountBaseUnits: z.string().regex(/^[1-9][0-9]*$/).max(78), tokenDecimals: z.number().int().min(0).max(36),
  serviceId: z.string().min(1).max(80), serviceName: z.string().min(1).max(120), description: z.string().min(1).max(1_000), providerTerms: z.string().min(1).max(2_000),
}).strict();
export type SupplierOfferConfig = z.infer<typeof configSchema>;

export async function issueSupplierOffer(input: unknown, nowSeconds = Math.floor(Date.now() / 1000)) {
  const config = configSchema.parse(input);
  const account = privateKeyToAccount(config.signingPrivateKey as `0x${string}`);
  if (account.address.toLowerCase() !== config.supplierAddress.toLowerCase()) throw new Error("Supplier signing key does not match configured public address");
  const draft: SupplierQuoteDraft = {
    supplierAddress: config.supplierAddress, serviceId: config.serviceId, serviceName: config.serviceName, description: config.description,
    stealthMetaAddress: config.stealthMetaAddress, tokenAddress: config.tokenAddress, amountBaseUnits: config.amountBaseUnits,
    tokenDecimals: config.tokenDecimals, chainId: 133, expiresAt: nowSeconds + 15 * 60, providerTerms: config.providerTerms,
  };
  return { agentId: config.agentId, quote: await signSupplierQuote(draft, account) };
}

export function getConfiguredSuppliers(env: NodeJS.ProcessEnv = process.env): SupplierOfferConfig[] {
  const common = { tokenAddress: env.HASHKEY_TEST_TOKEN_ADDRESS, tokenDecimals: Number(env.HASHKEY_TEST_TOKEN_DECIMALS) };
  const a = {
    agentId: "privatehsp.research-alpha.v1", supplierAddress: env.SUPPLIER_A_ADDRESS, signingPrivateKey: env.SUPPLIER_A_SIGNING_PRIVATE_KEY,
    stealthMetaAddress: env.SUPPLIER_A_STEALTH_META_ADDRESS, amountBaseUnits: env.SUPPLIER_A_AMOUNT_BASE_UNITS,
    serviceId: "research-brief", serviceName: "Research brief", description: "Evidence-led brief from requester supplied materials", providerTerms: "Delivered as a source-linked extractive brief.", ...common,
  };
  const b = {
    agentId: "privatehsp.market-insights.v1", supplierAddress: env.SUPPLIER_B_ADDRESS, signingPrivateKey: env.SUPPLIER_B_SIGNING_PRIVATE_KEY,
    stealthMetaAddress: env.SUPPLIER_B_STEALTH_META_ADDRESS, amountBaseUnits: env.SUPPLIER_B_AMOUNT_BASE_UNITS,
    serviceId: "market-analysis", serviceName: "Market analysis", description: "Statistical analysis of requester supplied observations", providerTerms: "Delivered as computed descriptive statistics.", ...common,
  };
  return [configSchema.parse(a), configSchema.parse(b)];
}
