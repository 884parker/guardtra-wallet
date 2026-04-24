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
  // PIN/wallet operations now use functions.invoke('wallet', { action: '...' }) directly.
  // These legacy mappings kept for backward compat if anything still calls them:
  'getSeedPhrase': 'wallet',
  'verifyPin': 'wallet',
  'setSecurityPin': 'wallet',
};

export function mapFunctionName(name) {
  return FUNCTION_MAP[name] || name;
}
