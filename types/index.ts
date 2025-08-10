/**
 * Shared type definitions for OneClick DeFi
 */

// User account types
export interface UserAccount {
  email: string;
  address: `0x${string}`;
  publicKey: string;
  passkeyId: string;
  createdAt: string;
}

// Passkey types
export interface PasskeyCredential {
  id: string;
  publicKey: string;
  algorithm: number;
  transports?: AuthenticatorTransport[];
}

// Token types
export interface Token {
  chainId: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
  balance?: string;
}

// Swap types
export interface SwapQuote {
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  priceImpact: string;
  route: SwapRoute[];
  minimumReceived: string;
}

export interface SwapRoute {
  protocol: string;
  percentage: number;
  pools: string[];
}

// Transaction types
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  chainId: number;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

// Error types
export class OKXError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OKXError';
  }
}

export class PasskeyError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PasskeyError';
  }
}

// Chain configuration
export interface ChainConfig {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorers: {
    name: string;
    url: string;
  }[];
  testnet: boolean;
}

// Supported chains
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  xlayer: {
    id: 196,
    name: 'X Layer',
    network: 'xlayer',
    nativeCurrency: {
      name: 'OKB',
      symbol: 'OKB',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.xlayer.tech'],
    blockExplorers: [{
      name: 'X Layer Explorer',
      url: 'https://www.okx.com/explorer/xlayer',
    }],
    testnet: false,
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    network: 'ethereum',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorers: [{
      name: 'Etherscan',
      url: 'https://etherscan.io',
    }],
    testnet: false,
  },
  // Add more chains as needed
};