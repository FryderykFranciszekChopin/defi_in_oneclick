/**
 * OKX DEX API Client - Server-side implementation
 * All API calls are proxied through our Next.js API routes for security
 */

export interface Token {
  chainId: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
}

export interface QuoteParams {
  chainId: string;
  amount: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  slippage?: string;
}

export interface SwapParams extends QuoteParams {
  userWalletAddress: string;
  referrerAddress?: string;
}

export interface QuoteResponse {
  code: string;
  msg: string;
  data: {
    estimatedGas: string;
    fromToken: Token;
    toToken: Token;
    fromTokenAmount: string;
    toTokenAmount: string;
    tradeFee: string;
    routerList: Array<{
      router: string;
      routerPercent: string;
      subRouterList: Array<{
        fromToken: Token;
        toToken: Token;
        dexProtocol: Array<{
          dexName: string;
          percent: string;
        }>;
      }>;
    }>;
  };
}

export interface SwapResponse extends QuoteResponse {
  data: QuoteResponse['data'] & {
    tx: {
      to: string;
      data: string;
      value: string;
      gas: string;
      gasPrice: string;
    };
  };
}

export class OKXDexClient {
  /**
   * Fetch quote for token swap
   * @param params Quote parameters
   * @returns Quote response with route information
   */
  static async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    try {
      const response = await fetch('/api/okx/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Quote fetch error:', error);
      throw error;
    }
  }

  /**
   * Get swap transaction data
   * @param params Swap parameters
   * @returns Swap response with transaction data
   */
  static async getSwapData(params: SwapParams): Promise<SwapResponse> {
    try {
      const response = await fetch('/api/okx/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get swap data');
      }

      return await response.json();
    } catch (error) {
      console.error('Swap data fetch error:', error);
      throw error;
    }
  }

  /**
   * Get supported tokens for a chain
   * @param chainId Chain ID (default: 196 for XLayer)
   * @returns List of supported tokens
   */
  static async getSupportedTokens(chainId: string = '196'): Promise<Token[]> {
    try {
      const response = await fetch(`/api/okx/tokens?chainId=${chainId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tokens');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Tokens fetch error:', error);
      throw error;
    }
  }

  /**
   * Format token amount considering decimals
   * @param amount Human-readable amount
   * @param decimals Token decimals
   * @returns Wei/smallest unit amount
   */
  static formatTokenAmount(amount: string, decimals: number): string {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0');
    const trimmedFraction = paddedFraction.slice(0, decimals);
    return whole + trimmedFraction;
  }

  /**
   * Parse token amount from wei to human-readable
   * @param amount Wei/smallest unit amount
   * @param decimals Token decimals
   * @returns Human-readable amount
   */
  static parseTokenAmount(amount: string, decimals: number): string {
    if (amount === '0') return '0';
    
    const padded = amount.padStart(decimals + 1, '0');
    const beforeDecimal = padded.slice(0, -decimals) || '0';
    const afterDecimal = padded.slice(-decimals);
    
    // Remove trailing zeros
    const trimmed = afterDecimal.replace(/0+$/, '');
    
    return trimmed ? `${beforeDecimal}.${trimmed}` : beforeDecimal;
  }
}