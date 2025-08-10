import { type Address, type Hex } from 'viem';
import { OKXDexAPI, type SwapQuote } from '../okx/dex-api';

export interface CrossChainRoute {
  fromChain: ChainInfo;
  toChain: ChainInfo;
  bridgeProtocol: string;
  estimatedTime: number; // in seconds
  bridgeFee: bigint;
  steps: SwapStep[];
}

export interface ChainInfo {
  chainId: number;
  name: string;
  nativeCurrency: string;
}

export interface SwapStep {
  type: 'swap' | 'bridge';
  chainId: number;
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  protocol?: string;
  data?: Hex;
}

export class CrossChainAggregator {
  private dexApi: OKXDexAPI;
  
  // Supported chains for cross-chain swaps
  private supportedChains: ChainInfo[] = [
    { chainId: 1, name: 'Ethereum', nativeCurrency: 'ETH' },
    { chainId: 56, name: 'BSC', nativeCurrency: 'BNB' },
    { chainId: 137, name: 'Polygon', nativeCurrency: 'MATIC' },
    { chainId: 196, name: 'X Layer', nativeCurrency: 'OKB' },
    { chainId: 42161, name: 'Arbitrum', nativeCurrency: 'ETH' },
    { chainId: 10, name: 'Optimism', nativeCurrency: 'ETH' },
    { chainId: 43114, name: 'Avalanche', nativeCurrency: 'AVAX' },
  ];

  constructor() {
    this.dexApi = new OKXDexAPI();
  }

  /**
   * Find optimal cross-chain swap route
   */
  async findBestCrossChainRoute(
    fromChainId: number,
    toChainId: number,
    fromToken: Address,
    toToken: Address,
    amount: bigint
  ): Promise<CrossChainRoute> {
    // If same chain, just do a simple swap
    if (fromChainId === toChainId) {
      const quote = await this.dexApi.getQuote({
        chainId: fromChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount: amount.toString(),
        slippage: 1,
        userAddress: '0x0000000000000000000000000000000000000000',
      });

      return {
        fromChain: this.getChainInfo(fromChainId),
        toChain: this.getChainInfo(toChainId),
        bridgeProtocol: 'none',
        estimatedTime: 30,
        bridgeFee: 0n,
        steps: [
          {
            type: 'swap',
            chainId: fromChainId,
            fromToken,
            toToken,
            amount,
          },
        ],
      };
    }

    // Complex cross-chain route
    return this.calculateCrossChainRoute(
      fromChainId,
      toChainId,
      fromToken,
      toToken,
      amount
    );
  }

  /**
   * Calculate optimal cross-chain route with bridge
   */
  private async calculateCrossChainRoute(
    fromChainId: number,
    toChainId: number,
    fromToken: Address,
    toToken: Address,
    amount: bigint
  ): Promise<CrossChainRoute> {
    // Step 1: Swap to bridgeable token on source chain (usually USDC)
    const bridgeToken = this.getBridgeToken(fromChainId);
    const steps: SwapStep[] = [];

    if (fromToken.toLowerCase() !== bridgeToken.toLowerCase()) {
      steps.push({
        type: 'swap',
        chainId: fromChainId,
        fromToken,
        toToken: bridgeToken as Address,
        amount,
        protocol: 'OKX DEX',
      });
    }

    // Step 2: Bridge to destination chain
    const bridgeProtocol = this.selectBridgeProtocol(fromChainId, toChainId);
    const bridgeFee = this.estimateBridgeFee(amount, bridgeProtocol);
    
    steps.push({
      type: 'bridge',
      chainId: fromChainId,
      fromToken: bridgeToken as Address,
      toToken: bridgeToken as Address,
      amount: amount - bridgeFee,
      protocol: bridgeProtocol,
    });

    // Step 3: Swap to target token on destination chain
    if (toToken.toLowerCase() !== bridgeToken.toLowerCase()) {
      steps.push({
        type: 'swap',
        chainId: toChainId,
        fromToken: bridgeToken as Address,
        toToken,
        amount: amount - bridgeFee,
        protocol: 'OKX DEX',
      });
    }

    return {
      fromChain: this.getChainInfo(fromChainId),
      toChain: this.getChainInfo(toChainId),
      bridgeProtocol,
      estimatedTime: this.estimateBridgeTime(bridgeProtocol),
      bridgeFee,
      steps,
    };
  }

  /**
   * Select best bridge protocol based on chains
   */
  private selectBridgeProtocol(fromChainId: number, toChainId: number): string {
    // OKX Bridge supports most major chains
    if (this.isOKXBridgeSupported(fromChainId, toChainId)) {
      return 'OKX Bridge';
    }
    
    // Fallback to other bridges
    if (this.isLayerZeroSupported(fromChainId, toChainId)) {
      return 'LayerZero';
    }
    
    return 'Across Protocol';
  }

  /**
   * Check if OKX Bridge supports the route
   */
  private isOKXBridgeSupported(fromChainId: number, toChainId: number): boolean {
    const okxSupportedChains = [1, 56, 137, 196, 42161, 10, 43114];
    return okxSupportedChains.includes(fromChainId) && okxSupportedChains.includes(toChainId);
  }

  /**
   * Check if LayerZero supports the route
   */
  private isLayerZeroSupported(fromChainId: number, toChainId: number): boolean {
    const lzChains = [1, 56, 137, 42161, 10, 43114];
    return lzChains.includes(fromChainId) && lzChains.includes(toChainId);
  }

  /**
   * Get common bridge token for a chain
   */
  private getBridgeToken(chainId: number): string {
    // USDC is the most common bridge token
    const usdcAddresses: Record<number, string> = {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
      56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      196: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // X Layer
      42161: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum
      10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Optimism
      43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
    };
    
    return usdcAddresses[chainId] || '0x0000000000000000000000000000000000000000';
  }

  /**
   * Estimate bridge fee
   */
  private estimateBridgeFee(amount: bigint, protocol: string): bigint {
    const feePercentage = {
      'OKX Bridge': 0.1, // 0.1%
      'LayerZero': 0.06, // 0.06%
      'Across Protocol': 0.12, // 0.12%
    };
    
    const fee = feePercentage[protocol as keyof typeof feePercentage] || 0.1;
    return (amount * BigInt(Math.floor(fee * 1000))) / 1000n;
  }

  /**
   * Estimate bridge time
   */
  private estimateBridgeTime(protocol: string): number {
    const times = {
      'OKX Bridge': 300, // 5 minutes
      'LayerZero': 180, // 3 minutes
      'Across Protocol': 120, // 2 minutes
    };
    
    return times[protocol as keyof typeof times] || 300;
  }

  /**
   * Get chain info
   */
  private getChainInfo(chainId: number): ChainInfo {
    return this.supportedChains.find(c => c.chainId === chainId) || {
      chainId,
      name: 'Unknown',
      nativeCurrency: 'ETH',
    };
  }

  /**
   * Format time estimate
   */
  formatTimeEstimate(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
  }
}