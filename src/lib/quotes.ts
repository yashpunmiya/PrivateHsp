import { keccak256, recoverTypedDataAddress, toBytes, type Account, type Address, type Hex } from "viem";
import { z } from "zod";
import { HASHKEY_TESTNET_ID } from "./chain";
import { isStealthMetaAddress } from "./stealth";

const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const positiveInteger = z.string().regex(/^[1-9][0-9]*$/).max(78);
const quoteFields = {
  Quote: [
    { name: "quoteId", type: "bytes32" },
    { name: "supplier", type: "address" },
    { name: "serviceIdHash", type: "bytes32" },
    { name: "descriptionHash", type: "bytes32" },
    { name: "metaAddressHash", type: "bytes32" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "expiresAt", type: "uint64" },
    { name: "termsHash", type: "bytes32" },
  ],
} as const;

const quoteSchema = z.object({
  quoteId: bytes32,
  supplierAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  serviceId: z.string().min(1).max(80),
  serviceName: z.string().min(1).max(120),
  description: z.string().min(1).max(1_000),
  stealthMetaAddress: z.string().min(1).max(160),
  tokenAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amountBaseUnits: positiveInteger,
  tokenDecimals: z.number().int().min(0).max(36),
  chainId: z.literal(HASHKEY_TESTNET_ID),
  expiresAt: z.number().int().positive(),
  providerTerms: z.string().min(1).max(2_000),
  termsHash: bytes32,
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export type SignedSupplierQuote = z.infer<typeof quoteSchema>;
export type SupplierQuoteDraft = Omit<SignedSupplierQuote, "quoteId" | "termsHash" | "signature">;

export function hashQuoteText(value: string): Hex {
  return keccak256(toBytes(value));
}

export function supplierQuoteTypedData(quote: Omit<SignedSupplierQuote, "signature">) {
  return {
    domain: { name: "PrivateHSP Supplier Quote", version: "1", chainId: BigInt(HASHKEY_TESTNET_ID) },
    types: quoteFields,
    primaryType: "Quote" as const,
    message: {
      quoteId: quote.quoteId as Hex,
      supplier: quote.supplierAddress as Address,
      serviceIdHash: hashQuoteText(quote.serviceId),
      descriptionHash: hashQuoteText(quote.description),
      metaAddressHash: hashQuoteText(quote.stealthMetaAddress),
      token: quote.tokenAddress as Address,
      amount: BigInt(quote.amountBaseUnits),
      chainId: BigInt(quote.chainId),
      expiresAt: BigInt(quote.expiresAt),
      termsHash: quote.termsHash as Hex,
    },
  };
}

export async function signSupplierQuote(draftValue: SupplierQuoteDraft, account: Account): Promise<SignedSupplierQuote> {
  const draft: SupplierQuoteDraft = { ...draftValue, chainId: HASHKEY_TESTNET_ID };
  if (!account.signTypedData) throw new Error("Supplier account cannot sign typed data");
  if (!isStealthMetaAddress(draft.stealthMetaAddress)) throw new Error("Supplier meta-address is invalid for HashKey Testnet");
  if (draft.supplierAddress.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("Quote signer does not match the registered supplier identity");
  }
  const quoteWithoutSignature = {
    ...draft,
    quoteId: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")}` as Hex,
    termsHash: hashQuoteText(draft.providerTerms),
  };
  quoteSchema.omit({ signature: true }).parse(quoteWithoutSignature);
  const signature = await account.signTypedData(supplierQuoteTypedData(quoteWithoutSignature));
  return quoteSchema.parse({ ...quoteWithoutSignature, signature });
}

export async function verifySupplierQuote(
  value: unknown,
  registeredSupplierAddress: Address,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const parsed = quoteSchema.safeParse(value);
  if (!parsed.success) return false;
  const quote = parsed.data;
  if (!isStealthMetaAddress(quote.stealthMetaAddress)
      || BigInt(quote.amountBaseUnits) <= BigInt(0)
      || quote.termsHash.toLowerCase() !== hashQuoteText(quote.providerTerms).toLowerCase()
      || quote.supplierAddress.toLowerCase() !== registeredSupplierAddress.toLowerCase()
      || quote.chainId !== HASHKEY_TESTNET_ID
      || quote.expiresAt <= nowSeconds) return false;

  try {
    const { signature, ...unsignedQuote } = quote;
    const recovered = await recoverTypedDataAddress({ ...supplierQuoteTypedData(unsignedQuote), signature: signature as Hex });
    return recovered.toLowerCase() === registeredSupplierAddress.toLowerCase();
  } catch {
    return false;
  }
}
