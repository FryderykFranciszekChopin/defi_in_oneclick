/**
 * Real Cross-Chain Bridge using OKX Bridge API
 * Enables actual Sepolia OKB -> X Layer OKB transfers
 */

import { type Address, type Hex } from 'viem';
import { OKXCrossChainAPI, CHAIN_IDS, TOKEN_ADDRESSES, type BridgeQuoteRequest } from './okx-bridge-api';
import { executeGaslessOperation } from '@/lib/gasless/execute';
import { createSmartAccount } from '@/lib/smart-account/factory';
import { getStoredPasskey } from '@/lib/passkey-client';
import type { SmartAccount } from '@/lib/smart-account/types';

export interface RealBridgeTransaction {
  id: string;
  fromNetwork: string;
  toNetwork: string;
  fromToken: string;
  toToken: string;
  amount: string;
  recipient: Address;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  bridgeId?: string;
  okxTxData?: any;
  timestamp: number;
  estimatedTime?: number;
}

export class RealCrossChainBridge {
  private okxAPI: OKXCrossChainAPI;
  private transactions = new Map<string, RealBridgeTransaction>();

  constructor() {
    // Initialize OKX API with credentials
    this.okxAPI = new OKXCrossChainAPI({
      apiKey: process.env.OKX_API_KEY || '',
      secretKey: process.env.OKX_SECRET_KEY || '',
      passphrase: process.env.OKX_PASSPHRASE || '',
      projectId: process.env.OKX_PROJECT_ID || ''
    });
  }

  /**
   * Get quote for real cross-chain bridge
   */
  async getRealBridgeQuote(
    fromNetwork: string,
    toNetwork: string,
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: Address
  ): Promise<{
    fromAmount: string;
    toAmount: string;
    bridgeId: string;
    estimatedTime: number;
    fees: string;
    route: string;
  }> {
    try {
      console.log(`🔍 Getting REAL bridge quote via OKX API`);

      // Map network names to chain IDs
      const fromChainId = this.getChainId(fromNetwork);
      const toChainId = this.getChainId(toNetwork);
      
      // Map token symbols to addresses
      const fromTokenAddress = this.getTokenAddress(fromNetwork, fromToken);
      const toTokenAddress = this.getTokenAddress(toNetwork, toToken);

      console.log(`📍 Bridge params:`, {
        fromChainId, toChainId,
        fromTokenAddress, toTokenAddress,
        amount, userAddress
      });

      const quoteRequest = {
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        amount,
        userWalletAddress: userAddress,
        slippage: '0.005' // 0.5%
      };

      // Call our API route instead of direct OKX API
      console.log(`📡 Calling bridge quote API route`);
      const response = await fetch('/api/okx/bridge-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Bridge quote failed: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.code !== '0') {
        throw new Error(`OKX API Error: ${data.msg || 'Unknown error'}`);
      }

      const quote = data.data[0];

      console.log(`✅ REAL bridge quote received:`, quote);

      return {
        fromAmount: quote.fromTokenAmount,
        toAmount: quote.toTokenAmount,
        bridgeId: quote.bridgeId,
        estimatedTime: quote.estimatedTime,
        fees: quote.bridgeFee,
        route: `OKX Bridge (${quote.bridgeId})`
      };

    } catch (error: any) {
      console.error('❌ Failed to get real bridge quote:', error);
      
      // Fallback to estimated quote if API fails
      return {
        fromAmount: amount,
        toAmount: (parseFloat(amount) * 0.995).toFixed(6), // 0.5% fee
        bridgeId: 'fallback_' + Date.now(),
        estimatedTime: 300, // 5 minutes
        fees: (parseFloat(amount) * 0.005).toFixed(6),
        route: 'Fallback estimation (OKX API unavailable)'
      };
    }
  }

  /**
   * Execute real cross-chain bridge
   */
  async executeRealBridge(
    fromNetwork: string,
    toNetwork: string,
    fromToken: string,
    toToken: string,
    amount: string,
    recipient: Address,
    userEmail: string
  ): Promise<RealBridgeTransaction> {
    console.log(`🌉 Executing REAL cross-chain bridge via OKX`);

    // Generate transaction ID
    const txId = `real_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create bridge transaction record
    const bridgeTx: RealBridgeTransaction = {
      id: txId,
      fromNetwork,
      toNetwork,
      fromToken,
      toToken,
      amount,
      recipient,
      status: 'pending',
      timestamp: Date.now(),
      estimatedTime: 300,
    };

    this.transactions.set(txId, bridgeTx);

    try {
      console.log(`👤 Processing real bridge for user: ${userEmail}`);

      // Step 1: Get bridge quote
      const quote = await this.getRealBridgeQuote(
        fromNetwork, toNetwork, fromToken, toToken, amount, recipient
      );

      bridgeTx.bridgeId = quote.bridgeId;
      bridgeTx.estimatedTime = quote.estimatedTime;

      console.log(`📋 Bridge quote: ${quote.fromAmount} ${fromToken} -> ${quote.toAmount} ${toToken}`);

      // Step 2: Build bridge transaction
      const fromChainId = this.getChainId(fromNetwork);
      const toChainId = this.getChainId(toNetwork);
      const fromTokenAddress = this.getTokenAddress(fromNetwork, fromToken);
      const toTokenAddress = this.getTokenAddress(toNetwork, toToken);

      const bridgeTxData = await this.okxAPI.buildBridgeTx({
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        amount: quote.fromAmount,
        userWalletAddress: recipient,
        bridgeId: quote.bridgeId,
        slippage: '0.005'
      });

      console.log(`🔨 Bridge transaction built:`, bridgeTxData);
      bridgeTx.okxTxData = bridgeTxData;

      // Step 3: Execute transaction via smart account
      const txHash = await this.executeSmartAccountTransaction(
        userEmail,
        bridgeTxData,
        fromNetwork
      );

      bridgeTx.status = 'processing';
      bridgeTx.txHash = txHash;
      this.transactions.set(txId, bridgeTx);

      console.log(`✅ REAL bridge transaction submitted: ${txHash}`);

      // Step 4: Monitor transaction status
      this.monitorBridgeTransaction(txId, txHash, fromChainId);

      return bridgeTx;

    } catch (error: any) {
      console.error('❌ Real bridge execution failed:', error);
      bridgeTx.status = 'failed';
      this.transactions.set(txId, bridgeTx);
      throw error;
    }
  }

  /**
   * Execute transaction via smart account
   */
  private async executeSmartAccountTransaction(
    userEmail: string,
    bridgeTxData: any,
    network: string
  ): Promise<string> {
    console.log(`🔐 Executing via smart account for: ${userEmail}`);

    // Get user's passkey
    const passkey = getStoredPasskey();
    if (!passkey || !passkey.publicKey) {
      throw new Error('No valid passkey found for signing');
    }

    // Create smart account
    const chainId = network === 'sepolia' ? 11155111 : 195;
    const smartAccount = await createSmartAccount({
      email: userEmail,
      publicKey: passkey.publicKey,
      chainId
    });

    console.log(`🔐 Smart account: ${smartAccount.address}`);

    // Execute the bridge transaction
    const result = await executeGaslessOperation({
      account: smartAccount,
      to: bridgeTxData.to as Address,
      data: bridgeTxData.data as Hex,
      value: bridgeTxData.value || '0'
    });

    if (!result.success || !result.txHash) {
      throw new Error(`Transaction failed: ${result.error}`);
    }

    return result.txHash;
  }

  /**
   * Monitor bridge transaction status
   */
  private async monitorBridgeTransaction(
    txId: string,
    txHash: string,
    fromChainId: string
  ): Promise<void> {
    console.log(`👀 Monitoring bridge transaction: ${txHash}`);

    const checkStatus = async () => {
      try {
        const status = await this.okxAPI.getBridgeStatus(txHash, fromChainId);
        const bridgeTx = this.transactions.get(txId);
        
        if (bridgeTx) {
          if (status.status === 'completed') {
            bridgeTx.status = 'completed';
            console.log(`✅ Bridge completed: ${txId}`);
          } else if (status.status === 'failed') {
            bridgeTx.status = 'failed';
            console.log(`❌ Bridge failed: ${txId}`);
          } else {
            console.log(`⏳ Bridge still processing: ${txId} - ${status.status}`);
            // Continue monitoring
            setTimeout(checkStatus, 30000); // Check every 30 seconds
          }
          
          this.transactions.set(txId, bridgeTx);
        }
      } catch (error) {
        console.error('Error checking bridge status:', error);
        // Retry after delay
        setTimeout(checkStatus, 60000); // Retry in 1 minute
      }
    };

    // Start monitoring after 30 seconds
    setTimeout(checkStatus, 30000);
  }

  /**
   * Get chain ID from network name
   */
  private getChainId(network: string): string {
    switch (network.toLowerCase()) {
      case 'sepolia':
        return CHAIN_IDS.SEPOLIA;
      case 'xlayer':
        return CHAIN_IDS.XLAYER_TESTNET;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  /**
   * Get token address from network and token symbol
   */
  private getTokenAddress(network: string, token: string): string {
    switch (network.toLowerCase()) {
      case 'sepolia':
        if (token === 'ETH') return TOKEN_ADDRESSES.SEPOLIA.ETH;
        if (token === 'OKB') return TOKEN_ADDRESSES.SEPOLIA.OKB;
        break;
      case 'xlayer':
        if (token === 'OKB') return TOKEN_ADDRESSES.XLAYER_TESTNET.OKB;
        break;
    }
    throw new Error(`Unsupported token ${token} on network ${network}`);
  }

  /**
   * Get bridge transaction status
   */
  getBridgeTransaction(txId: string): RealBridgeTransaction | null {
    return this.transactions.get(txId) || null;
  }
}

// Export singleton instance
export const realCrossChainBridge = new RealCrossChainBridge();