/**
 * OKX Cross-Chain Bridge API
 * Real bridge implementation for Sepolia <-> X Layer
 */

// Use Web Crypto API for client-side compatibility

export interface OKXBridgeConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  projectId?: string;
}

export interface BridgeQuoteRequest {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userWalletAddress: string;
  slippage?: string;
}

export interface BridgeQuoteResponse {
  fromTokenAmount: string;
  toTokenAmount: string;
  bridgeId: string;
  estimatedTime: number;
  gasFee: string;
  bridgeFee: string;
  route: any[];
}

export interface BridgeTxRequest {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userWalletAddress: string;
  bridgeId: string;
  slippage?: string;
}

export interface BridgeTxResponse {
  data: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
}

export class OKXCrossChainAPI {
  private config: OKXBridgeConfig;
  private baseURL = 'https://www.okx.com/api/v5/dex/cross-chain';

  constructor(config: OKXBridgeConfig) {
    this.config = config;
  }

  private async createSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): Promise<string> {
    const message = timestamp + method + requestPath + body;
    
    // Use Web Crypto API for client-side compatibility
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secretKey);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    
    // Convert ArrayBuffer to base64
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  private async getHeaders(method: string, requestPath: string, body?: string): Promise<Record<string, string>> {
    const timestamp = new Date().toISOString();
    const signature = await this.createSignature(timestamp, method, requestPath, body || '');

    return {
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'OK-ACCESS-PROJECT': this.config.projectId || '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get supported chains
   */
  async getSupportedChains(): Promise<any> {
    const endpoint = '/supported/chain';
    const headers = await this.getHeaders('GET', endpoint);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting supported chains:', error);
      throw error;
    }
  }

  /**
   * Get supported tokens for cross-chain bridging
   */
  async getSupportedTokens(chainId?: string): Promise<any> {
    const endpoint = chainId ? 
      `/supported/tokens?chainId=${chainId}` : 
      '/supported/tokens';
    const headers = this.getHeaders('GET', endpoint);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting supported tokens:', error);
      throw error;
    }
  }

  /**
   * Get bridge quote for cross-chain transfer
   */
  async getBridgeQuote(params: BridgeQuoteRequest): Promise<BridgeQuoteResponse> {
    const endpoint = '/quote';
    const queryParams = new URLSearchParams({
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      userWalletAddress: params.userWalletAddress,
      slippage: params.slippage || '0.01'
    });

    const fullEndpoint = `${endpoint}?${queryParams}`;
    const headers = this.getHeaders('GET', fullEndpoint);

    try {
      console.log(`🔍 Getting OKX bridge quote: ${this.baseURL}${fullEndpoint}`);
      
      const response = await fetch(`${this.baseURL}${fullEndpoint}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OKX Bridge Quote Error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ OKX bridge quote received:', data);

      if (data.code !== '0') {
        throw new Error(`OKX API Error: ${data.msg || 'Unknown error'}`);
      }

      return data.data[0];
    } catch (error) {
      console.error('Error getting bridge quote:', error);
      throw error;
    }
  }

  /**
   * Build bridge transaction
   */
  async buildBridgeTx(params: BridgeTxRequest): Promise<BridgeTxResponse> {
    const endpoint = '/build-tx';
    const body = JSON.stringify({
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      userWalletAddress: params.userWalletAddress,
      bridgeId: params.bridgeId,
      slippage: params.slippage || '0.01'
    });

    const headers = this.getHeaders('POST', endpoint, body);

    try {
      console.log(`🔨 Building OKX bridge transaction: ${this.baseURL}${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OKX Bridge TX Error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ OKX bridge transaction built:', data);

      if (data.code !== '0') {
        throw new Error(`OKX API Error: ${data.msg || 'Unknown error'}`);
      }

      return data.data;
    } catch (error) {
      console.error('Error building bridge transaction:', error);
      throw error;
    }
  }

  /**
   * Check bridge transaction status
   */
  async getBridgeStatus(txHash: string, fromChainId: string): Promise<any> {
    const endpoint = '/status';
    const queryParams = new URLSearchParams({
      txHash,
      fromChainId
    });

    const fullEndpoint = `${endpoint}?${queryParams}`;
    const headers = this.getHeaders('GET', fullEndpoint);

    try {
      const response = await fetch(`${this.baseURL}${fullEndpoint}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OKX Bridge Status Error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`OKX API Error: ${data.msg || 'Unknown error'}`);
      }

      return data.data;
    } catch (error) {
      console.error('Error checking bridge status:', error);
      throw error;
    }
  }
}

// Chain ID constants
export const CHAIN_IDS = {
  SEPOLIA: '11155111',
  XLAYER_TESTNET: '195'
} as const;

// Token addresses
export const TOKEN_ADDRESSES = {
  SEPOLIA: {
    ETH: '0x0000000000000000000000000000000000000000',
    OKB: '0x0BC13595f7DABbF1D00fC5CAa670D2374BD4AA9a' // Our deployed OKB token
  },
  XLAYER_TESTNET: {
    OKB: '0x0000000000000000000000000000000000000000' // Native OKB on X Layer
  }
} as const;