// App specific types
export interface SmartAccountData {
  email: string;
  address: string;
  publicKey?: string;
  accountIndex?: number;
  passkeyId?: string;
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  data?: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  type: 'swap' | 'send' | 'receive';
  tokenIn?: {
    symbol: string;
    amount: string;
  };
  tokenOut?: {
    symbol: string;
    amount: string;
  };
}