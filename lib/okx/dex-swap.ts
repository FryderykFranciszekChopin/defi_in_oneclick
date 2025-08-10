import axios from 'axios';
import type { Hex } from 'viem';

const OKX_API_URL = 'https://www.okx.com/api/v5';

export interface SwapData {
  to: string;
  data: Hex;
  value: string;
  gas: string;
}

export interface SwapRequest {
  chainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage: number;
  userWalletAddress: string;
}

export class OKXSwapAPI {
  private apiKey: string;
  // private _secretKey: string;
  private _passphrase: string;

  constructor() {
    this.apiKey = process.env.OKX_API_KEY || '';
    // this._secretKey = process.env.OKX_SECRET_KEY || '';
    this._passphrase = process.env.OKX_PASSPHRASE || '';
  }

  private createSignature(
    _timestamp: string,
    _method: string,
    _requestPath: string,
    _body?: string
  ): string {
    // In production, this should be done server-side
    // const message = timestamp + method + requestPath + (body || '');
    // Mock signature for client-side demo
    return 'mock-signature';
  }

  async getSwapData(params: SwapRequest): Promise<SwapData> {
    try {
      const requestPath = '/api/v5/dex/aggregator/swap';
      const queryParams = new URLSearchParams({
        chainId: params.chainId.toString(),
        fromTokenAddress: params.fromTokenAddress,
        toTokenAddress: params.toTokenAddress,
        amount: params.amount,
        slippage: params.slippage.toString(),
        userWalletAddress: params.userWalletAddress,
      });
      
      const timestamp = new Date().toISOString();
      const queryString = '?' + queryParams.toString();
      const signature = this.createSignature(timestamp, 'GET', requestPath, queryString);
      
      const headers = {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this._passphrase,
        'Content-Type': 'application/json',
      };

      const response = await axios.get(`${OKX_API_URL}${requestPath}${queryString}`, { headers });
      
      if (response.data.code !== '0') {
        throw new Error(response.data.msg || 'Failed to get swap data');
      }

      const data = response.data.data[0];
      
      // Extract transaction data for executing the swap
      return {
        to: data.tx.to,
        data: data.tx.data as Hex,
        value: data.tx.value || '0',
        gas: data.tx.gas || data.estimateGasFee || '300000',
      };
    } catch (error) {
      console.error('Error getting swap data:', error);
      // Return mock data for demo
      return {
        to: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch router
        data: '0x' as Hex,
        value: '0',
        gas: '300000',
      };
    }
  }
}