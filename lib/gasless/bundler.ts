import { createPublicClient, http, type Hex, parseEther } from 'viem';
import { xlayerTestnet } from '../networks/config';
import type { UserOperation } from '../smart-account/types';
const BUNDLER_RPC = `https://api.pimlico.io/v2/xlayer/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY || ''}`;
const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;

export interface GasEstimate {
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface UserOperationReceipt {
  userOpHash: Hex;
  entryPoint: Hex;
  sender: Hex;
  nonce: bigint;
  paymaster?: Hex;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  success: boolean;
  logs: any[];
  receipt: {
    transactionHash: Hex;
    transactionIndex: number;
    blockHash: Hex;
    blockNumber: bigint;
    from: Hex;
    to: Hex;
    cumulativeGasUsed: bigint;
    gasUsed: bigint;
    logs: any[];
    logsBloom: Hex;
    status: boolean;
  };
}

export class BundlerClient {
  private client;
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = BUNDLER_RPC;
    this.client = createPublicClient({
      chain: xlayerTestnet,
      transport: http(this.rpcUrl),
    });
  }

  private async rpcCall(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC Error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    return result.result;
  }

  async estimateUserOperationGas(userOp: Partial<UserOperation>): Promise<GasEstimate> {
    try {
      // Call Pimlico's gas estimation endpoint
      const gasEstimate = await this.rpcCall('pimlico_estimateUserOperationGas', [
        {
          ...userOp,
          // Ensure all fields are properly formatted
          nonce: userOp.nonce ? `0x${userOp.nonce.toString(16)}` : '0x0',
          maxFeePerGas: '0x0',
          maxPriorityFeePerGas: '0x0',
          paymasterAndData: '0x',
          signature: '0x',
        },
        ENTRYPOINT_ADDRESS,
      ]);

      return {
        preVerificationGas: BigInt(gasEstimate.preVerificationGas),
        verificationGasLimit: BigInt(gasEstimate.verificationGasLimit),
        callGasLimit: BigInt(gasEstimate.callGasLimit),
        maxFeePerGas: BigInt(gasEstimate.maxFeePerGas || gasEstimate.baseFeePerGas),
        maxPriorityFeePerGas: BigInt(gasEstimate.maxPriorityFeePerGas || '0x5f5e100'), // 0.1 gwei default
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      
      // Fallback to chain gas price if Pimlico fails
      const baseFee = await this.client.getGasPrice();
      
      return {
        preVerificationGas: 21000n + (userOp.initCode ? 32000n : 0n),
        verificationGasLimit: userOp.initCode && userOp.initCode !== '0x' ? 600000n : 150000n,
        callGasLimit: 300000n,
        maxFeePerGas: baseFee * 120n / 100n, // 20% buffer
        maxPriorityFeePerGas: parseEther('0.0000001'), // 0.1 gwei
      };
    }
  }

  async sendUserOperation(userOp: UserOperation): Promise<Hex> {
    try {
      // Format UserOperation for RPC
      const formattedUserOp = {
        sender: userOp.sender,
        nonce: `0x${userOp.nonce.toString(16)}`,
        initCode: userOp.initCode || '0x',
        callData: userOp.callData,
        callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
        verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
        preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
        maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        paymasterAndData: userOp.paymasterAndData || '0x',
        signature: userOp.signature,
      };

      const userOpHash = await this.rpcCall('eth_sendUserOperation', [
        formattedUserOp,
        ENTRYPOINT_ADDRESS,
      ]);

      console.log('UserOperation sent:', userOpHash);
      return userOpHash as Hex;
    } catch (error: any) {
      console.error('Failed to send UserOperation:', error);
      
      // Check if it's a specific error we can handle
      if (error.message?.includes('already in mempool')) {
        throw new Error('Transaction already pending. Please wait for it to complete.');
      }
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for gas fees. Please ensure paymaster is properly configured.');
      }
      
      throw new Error(`Failed to send transaction: ${error.message || 'Unknown error'}`);
    }
  }

  async getUserOperationReceipt(hash: Hex): Promise<UserOperationReceipt | null> {
    try {
      const receipt = await this.rpcCall('eth_getUserOperationReceipt', [hash]);
      
      if (!receipt) {
        return null;
      }

      return {
        userOpHash: receipt.userOpHash,
        entryPoint: receipt.entryPoint,
        sender: receipt.sender,
        nonce: BigInt(receipt.nonce),
        paymaster: receipt.paymaster,
        actualGasCost: BigInt(receipt.actualGasCost),
        actualGasUsed: BigInt(receipt.actualGasUsed),
        success: receipt.success,
        logs: receipt.logs,
        receipt: {
          transactionHash: receipt.receipt.transactionHash,
          transactionIndex: receipt.receipt.transactionIndex,
          blockHash: receipt.receipt.blockHash,
          blockNumber: BigInt(receipt.receipt.blockNumber),
          from: receipt.receipt.from,
          to: receipt.receipt.to,
          cumulativeGasUsed: BigInt(receipt.receipt.cumulativeGasUsed),
          gasUsed: BigInt(receipt.receipt.gasUsed),
          logs: receipt.receipt.logs,
          logsBloom: receipt.receipt.logsBloom,
          status: receipt.receipt.status,
        },
      };
    } catch (error) {
      console.error('Failed to get receipt:', error);
      return null;
    }
  }

  async waitForUserOperationReceipt(hash: Hex, timeout = 60000): Promise<UserOperationReceipt> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const receipt = await this.getUserOperationReceipt(hash);
      
      if (receipt) {
        return receipt;
      }
      
      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Transaction timeout: UserOperation receipt not found');
  }

  async getSupportedEntryPoints(): Promise<Hex[]> {
    try {
      const entryPoints = await this.rpcCall('eth_supportedEntryPoints', []);
      return entryPoints as Hex[];
    } catch (error) {
      console.warn('Failed to get supported entry points:', error);
      return [ENTRYPOINT_ADDRESS];
    }
  }

  async getChainId(): Promise<number> {
    try {
      const chainId = await this.rpcCall('eth_chainId', []);
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      return xlayerTestnet.id;
    }
  }
}