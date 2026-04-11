/**
 * Centralized network configuration.
 * 
 * The active network is stored in AppConfig as 'active_network'.
 * Defaults to 'sepolia' for safety.
 * 
 * To switch to mainnet:
 *   1. Change AppConfig 'active_network' to 'mainnet' in Settings
 *   2. Ensure ALCHEMY_MAINNET_KEY is set in Base44 env secrets
 *   3. Ensure wallet mnemonics are funded on mainnet
 */

export const NETWORKS = {
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcSuffix: 'eth-sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerName: 'Sepolia Etherscan',
    usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    isTestnet: true,
  },
  mainnet: {
    id: 'mainnet',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcSuffix: 'eth-mainnet',
    explorerUrl: 'https://etherscan.io',
    explorerName: 'Etherscan',
    usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    isTestnet: false,
  },
};

// Default to Sepolia for safety — never accidentally send on mainnet
let _activeNetwork = 'sepolia';

export function setActiveNetwork(networkId) {
  if (NETWORKS[networkId]) {
    _activeNetwork = networkId;
  }
}

export function getActiveNetwork() {
  return NETWORKS[_activeNetwork];
}

export function getNetworkId() {
  return _activeNetwork;
}

/**
 * Helper: build an Etherscan link for the active network
 */
export function txUrl(hash) {
  return `${getActiveNetwork().explorerUrl}/tx/${hash}`;
}

export function addressUrl(address) {
  return `${getActiveNetwork().explorerUrl}/address/${address}`;
}

/**
 * Helper: build the Alchemy RPC URL for the active network
 */
export function alchemyRpcUrl(apiKey) {
  return `https://${getActiveNetwork().rpcSuffix}.g.alchemy.com/v2/${apiKey}`;
}
