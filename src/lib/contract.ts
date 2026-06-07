// ── Contract stubs ────────────────────────────────────────────────────────────
// Replace placeholder values and un-stub functions once the ERC-1155 is deployed.

export const CONTRACT_ADDRESS  = '0x0000000000000000000000000000000000000000'; // TODO: deploy on Base
export const USDC_ADDRESS_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base mainnet
export const CHAIN_ID          = 8453; // Base mainnet
export const ROYALTY_BPS       = 500;  // 5% — stored in ERC-2981
export const ROYALTY_PCT       = 5;

export type MintStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

/** Returns false until CONTRACT_ADDRESS is set to a real address. */
export function isContractDeployed(): boolean {
  return CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
}

/**
 * Buy a pack on-chain: approve USDC spend → call buyPack(tier).
 * Returns the tx hash.
 * TODO: implement via viem + wagmi once ABI is available.
 */
export async function buyPackOnChain(
  _walletClient: unknown,
  _tier: string,
  _usdcAmount: number,
): Promise<string> {
  throw new Error('Contract not yet deployed — use demo mode');
}

/**
 * Cards are minted automatically inside buyPackOnChain — there is no separate mint step.
 * This function exists only if you need to re-mint a card that failed mid-tx.
 * TODO: implement via viem once ABI is available.
 */
export async function remintCard(
  _walletClient: unknown,
  _imageId: string,
  _serialNumber: number,
): Promise<string> {
  throw new Error('Contract not yet deployed');
}

/**
 * Query whether a card has been minted on-chain.
 * Returns the token ID if minted, null if not.
 * TODO: implement via viem publicClient.readContract once ABI is available.
 */
export async function getCardTokenId(_imageId: string): Promise<number | null> {
  return null;
}

// ── Pricing helpers ───────────────────────────────────────────────────────────

export const PACK_PRICES_USDC: Record<string, number> = {
  scroll: 3,
  tablet: 8,
  codex:  25,
};

/** Rough ETH equivalent for display purposes (not used for on-chain pricing). */
export const ETH_PRICE_USD_APPROX = 3000;

export function usdcToEthApprox(usdc: number): string {
  const eth = usdc / ETH_PRICE_USD_APPROX;
  return eth < 0.01 ? `Ξ${eth.toFixed(4)}` : `Ξ${eth.toFixed(3)}`;
}
