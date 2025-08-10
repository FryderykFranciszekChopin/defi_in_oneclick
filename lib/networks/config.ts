/**
 * Multi-chain Network Configuration
 * Supports Sepolia and XLayer testnets with cross-chain bridge
 */

import type { Chain } from 'viem';

export interface NetworkConfig {
  name: string;
  chain: Chain;
  factoryAddress: string;
  entryPointAddress: string;
  bundlerUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  bridgeAddress?: string;
  tokens: TokenConfig[];
}

export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
  isNative?: boolean;
}

// Standard ERC-4337 EntryPoint address
export const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// Network definitions
export const sepolia: Chain = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://eth-sepolia.public.blastapi.io'] },
    public: { http: ['https://eth-sepolia.public.blastapi.io'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

export const xlayerTestnet: Chain = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'OKB',
    symbol: 'OKB',
  },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
    public: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/explorer/xlayer-test' },
  },
  testnet: true,
};

// Network configurations
export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia',
    chain: sepolia,
    factoryAddress: '0xB8D779eeEF173c6dBC3a28f0Dec73e48cBE6411C', // Already deployed
    entryPointAddress: ENTRYPOINT_ADDRESS,
    bundlerUrl: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`,
    explorerUrl: 'https://sepolia.etherscan.io',
    faucetUrl: 'https://sepolia-faucet.pk910.de',
    bridgeAddress: '0x298bC730bdCc17a2B8E8d9841EFA3E0bDbD5165A', // SimpleBridge contract
    tokens: [
      {
        symbol: 'ETH',
        name: 'Sepolia Ether',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        isNative: true,
      },
      {
        symbol: 'OKB',
        name: 'OKB Token',
        address: '0x0BC13595f7DABbF1D00fC5CAa670D2374BD4AA9a',
        decimals: 18,
        logoURI: 'https://static.okx.com/cdn/assets/imgs/247/3E95624D106C8255.png',
      },
      {
        symbol: 'USDC',
        name: 'USD Coin (Sepolia)',
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        decimals: 6,
        logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xA0b86991c6218b36a1d19D4a2e9Eb0cE3606eB48/logo.png',
      },
    ],
  },
  xlayer: {
    name: 'X Layer Testnet',
    chain: xlayerTestnet,
    factoryAddress: '0x7cEb6617962Dd76E96b3227352f0ee9f83FCD2B7', // Mock address for demo
    entryPointAddress: ENTRYPOINT_ADDRESS,
    bundlerUrl: `https://api.pimlico.io/v2/xlayer-testnet/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`,
    explorerUrl: 'https://www.okx.com/explorer/xlayer-test',
    faucetUrl: 'https://www.okx.com/xlayer/faucet',
    tokens: [
      {
        symbol: 'OKB',
        name: 'OKB',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        logoURI: 'https://static.okx.com/cdn/assets/imgs/247/3E95624D106C8255.png',
        isNative: true,
      },
      // Remove USDT and USDC for now as they don't exist on X Layer testnet
      // or have different addresses
    ],
  },
};

// Default network
export const DEFAULT_NETWORK = 'sepolia';

// Cross-chain bridge pairs
export const BRIDGE_PAIRS = [
  {
    from: { network: 'sepolia', token: 'ETH' },
    to: { network: 'xlayer', token: 'OKB' },
    rate: 1, // 1:1 for demo
    minAmount: '0.001',
    maxAmount: '10',
  },
  {
    from: { network: 'sepolia', token: 'OKB' },
    to: { network: 'xlayer', token: 'OKB' },
    rate: 1, // 1:1 OKB to OKB
    minAmount: '0.001',
    maxAmount: '10',
  },
  {
    from: { network: 'xlayer', token: 'OKB' },
    to: { network: 'sepolia', token: 'ETH' },
    rate: 1, // 1:1 for demo
    minAmount: '0.001',
    maxAmount: '10',
  },
  {
    from: { network: 'xlayer', token: 'OKB' },
    to: { network: 'sepolia', token: 'OKB' },
    rate: 1, // 1:1 OKB to OKB
    minAmount: '0.001',
    maxAmount: '10',
  },
];

// Helper functions
export function getNetwork(networkId: string): NetworkConfig {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Network ${networkId} not found`);
  }
  return network;
}

export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find(network => network.chain.id === chainId);
}

export function getSupportedNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS);
}

export function getTokenBySymbol(networkId: string, symbol: string): TokenConfig | undefined {
  return NETWORKS[networkId]?.tokens.find(token => token.symbol === symbol);
}