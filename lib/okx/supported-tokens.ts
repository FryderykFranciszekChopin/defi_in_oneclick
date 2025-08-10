// XLayer (Chain ID: 196) supported tokens
export const XLAYER_TOKENS = [
  {
    symbol: 'OKB',
    address: '0x0000000000000000000000000000000000000000', // Native token
    decimals: 18,
    name: 'OKB',
  },
  {
    symbol: 'WOKB',
    address: '0xe538905cf8410324e03a5a23c1c177a474d59b2b', // Wrapped OKB
    decimals: 18,
    name: 'Wrapped OKB',
  },
  {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    name: 'USD Coin',
  },
  {
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    name: 'Tether USD',
  },
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    name: 'Wrapped Ether',
  },
];

// Map chain IDs to their native tokens
export const CHAIN_NATIVE_TOKENS: Record<number, string> = {
  1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH on Ethereum
  56: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // BNB on BSC
  137: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // MATIC on Polygon
  196: '0x0000000000000000000000000000000000000000', // OKB on XLayer
  42161: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH on Arbitrum
};

export function getTokensForChain(chainId: number) {
  // For demo, return XLayer tokens
  if (chainId === 196) {
    return XLAYER_TOKENS;
  }
  
  // Default tokens for other chains
  return [
    {
      symbol: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
    },
    {
      symbol: 'USDT',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      name: 'Tether USD',
    },
  ];
}