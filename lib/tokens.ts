/**
 * Default tokens for OneClick DeFi
 * These tokens are commonly used across multiple chains
 */

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  logoURI: string;
  balance?: string;
  value?: string;
}

// XLayer Testnet tokens
export const XLAYER_TESTNET_TOKENS: Token[] = [
  {
    symbol: 'OKB',
    name: 'OKB',
    address: '0x3F4B6664338F23d2397c953f2AB4Ce8031663f80',
    decimals: 18,
    chainId: 195,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/247/3E95624D106C8255.png',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x74b7F16337b8972027F6196A17a631aC6dE26d22',
    decimals: 6,
    chainId: 195,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
    decimals: 6,
    chainId: 195,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/243/2821A137A0E0A990.png',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c',
    decimals: 18,
    chainId: 195,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1',
    decimals: 8,
    chainId: 195,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/247/7164D5B720C3F1FF.png',
  },
];

// XLayer Mainnet tokens
export const XLAYER_MAINNET_TOKENS: Token[] = [
  {
    symbol: 'OKB',
    name: 'OKB',
    address: '0xc55E93C62874D8100dBd2DfE307EDc1036ad5434',
    decimals: 18,
    chainId: 196,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/247/3E95624D106C8255.png',
  },
  {
    symbol: 'USDC.e',
    name: 'USD Coin',
    address: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035',
    decimals: 6,
    chainId: 196,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
    decimals: 6,
    chainId: 196,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/243/2821A137A0E0A990.png',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c',
    decimals: 18,
    chainId: 196,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1',
    decimals: 8,
    chainId: 196,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/247/7164D5B720C3F1FF.png',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4',
    decimals: 18,
    chainId: 196,
    logoURI: 'https://static.okx.com/cdn/assets/imgs/2311/0BC5310F89125FCB.png',
  },
];

// Popular tokens on other chains (for reference)
export const POPULAR_TOKENS = {
  ethereum: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/243/2821A137A0E0A990.png',
    },
  ],
  polygon: [
    {
      symbol: 'MATIC',
      name: 'Polygon',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/247/07BD17702DB19F7F.png',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
    },
  ],
  arbitrum: [
    {
      symbol: 'ARB',
      name: 'Arbitrum',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/2311/7FA4D7B99B9AD33B.png',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
    },
  ],
  optimism: [
    {
      symbol: 'OP',
      name: 'Optimism',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/247/CB88D53AD30C1836.png',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
    },
  ],
  base: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
    },
  ],
  bsc: [
    {
      symbol: 'BNB',
      name: 'BNB',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/247/231DC3D9F60FA339.png',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/243/2821A137A0E0A990.png',
    },
  ],
  avalanche: [
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/247/A214290B1DCCDEE2.png',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
    },
  ],
};

/**
 * Get default tokens for a given chain ID
 */
export function getDefaultTokens(chainId: number): Token[] {
  switch (chainId) {
    case 195: // XLayer Testnet
      return XLAYER_TESTNET_TOKENS;
    case 196: // XLayer Mainnet
      return XLAYER_MAINNET_TOKENS;
    default:
      // Return some common tokens as fallback
      return [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          chainId,
          logoURI: 'https://static.okx.com/cdn/assets/imgs/2310/0E4D616E1919A0EC.png',
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 6,
          chainId,
          logoURI: 'https://static.okx.com/cdn/assets/imgs/243/27A2A6863610D96E.png',
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 6,
          chainId,
          logoURI: 'https://static.okx.com/cdn/assets/imgs/243/2821A137A0E0A990.png',
        },
      ];
  }
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: string, decimals: number): string {
  const value = parseFloat(balance) / Math.pow(10, decimals);
  if (value === 0) return '0';
  if (value < 0.01) return '< 0.01';
  if (value < 1) return value.toFixed(4);
  if (value < 1000) return value.toFixed(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}