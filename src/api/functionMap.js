/**
 * Maps camelCase function names to Supabase Edge Function slugs (kebab-case).
 */
export const FUNCTION_MAP = {
  'sendTransaction': 'send-transaction',
  'getWalletBalance': 'get-wallet-balance',
  'autoReleaseTransactions': 'auto-release',
  'vaultRecovery': 'vault-recovery',
  'wallet': 'wallet',
  'generateWallets': 'generate-wallets',
  // Separate endpoint for transfer history
  'getWalletTransfers': 'get-wallet-transfers',
  'getSeedPhrase': 'wallet',
  'verifyPin': 'wallet',
  'setSecurityPin': 'wallet',
};

export function mapFunctionName(name) {
  return FUNCTION_MAP[name] || name;
}
