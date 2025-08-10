import type { Hex } from 'viem';
import type { UserOperation } from '../smart-account/types';
const PAYMASTER_RPC = `https://api.pimlico.io/v2/xlayer/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY || ''}`;

export interface SponsorshipResult {
  paymasterAndData: Hex;
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
  paymaster?: Hex;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
}

export interface SponsorshipPolicy {
  sponsorshipPolicyId?: string;
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
}

export class PaymasterClient {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = PAYMASTER_RPC;
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
      throw new Error(`Paymaster RPC Error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    return result.result;
  }

  async sponsorUserOperation(
    userOp: Partial<UserOperation>,
    entryPoint: Hex = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    policy?: SponsorshipPolicy
  ): Promise<SponsorshipResult> {
    try {
      // Format UserOperation for sponsorship
      const formattedUserOp = {
        sender: userOp.sender,
        nonce: userOp.nonce ? `0x${userOp.nonce.toString(16)}` : '0x0',
        initCode: userOp.initCode || '0x',
        callData: userOp.callData,
        callGasLimit: userOp.callGasLimit ? `0x${userOp.callGasLimit.toString(16)}` : '0x0',
        verificationGasLimit: userOp.verificationGasLimit ? `0x${userOp.verificationGasLimit.toString(16)}` : '0x0',
        preVerificationGas: userOp.preVerificationGas ? `0x${userOp.preVerificationGas.toString(16)}` : '0x0',
        maxFeePerGas: userOp.maxFeePerGas ? `0x${userOp.maxFeePerGas.toString(16)}` : '0x0',
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas ? `0x${userOp.maxPriorityFeePerGas.toString(16)}` : '0x0',
        paymasterAndData: '0x',
        signature: '0x',
      };

      // Call Pimlico's sponsorship endpoint
      const sponsorshipResult = await this.rpcCall('pm_sponsorUserOperation', [
        formattedUserOp,
        entryPoint,
        policy || {},
      ]);

      return {
        paymasterAndData: sponsorshipResult.paymasterAndData,
        preVerificationGas: BigInt(sponsorshipResult.preVerificationGas || userOp.preVerificationGas || 0),
        verificationGasLimit: BigInt(sponsorshipResult.verificationGasLimit || userOp.verificationGasLimit || 0),
        callGasLimit: BigInt(sponsorshipResult.callGasLimit || userOp.callGasLimit || 0),
        paymaster: sponsorshipResult.paymaster,
        paymasterVerificationGasLimit: sponsorshipResult.paymasterVerificationGasLimit ? 
          BigInt(sponsorshipResult.paymasterVerificationGasLimit) : undefined,
        paymasterPostOpGasLimit: sponsorshipResult.paymasterPostOpGasLimit ? 
          BigInt(sponsorshipResult.paymasterPostOpGasLimit) : undefined,
      };
    } catch (error: any) {
      console.error('Sponsorship failed:', error);
      
      // Check for specific errors
      if (error.message?.includes('insufficient deposit')) {
        throw new Error('Paymaster has insufficient funds. Please contact support.');
      }
      if (error.message?.includes('policy not found')) {
        throw new Error('Invalid sponsorship policy. Please check configuration.');
      }
      if (error.message?.includes('user operation not eligible')) {
        throw new Error('This operation is not eligible for sponsorship.');
      }
      
      throw new Error(`Sponsorship failed: ${error.message || 'Unknown error'}`);
    }
  }

  async validateSponsorshipPolicy(policyId: string): Promise<boolean> {
    try {
      const result = await this.rpcCall('pm_validateSponsorshipPolicy', [policyId]);
      return result.valid === true;
    } catch (error) {
      console.error('Policy validation failed:', error);
      return false;
    }
  }

  async getSponsorshipStatus(): Promise<{
    active: boolean;
    balance: bigint;
    policies: string[];
  }> {
    try {
      const status = await this.rpcCall('pm_sponsorshipStatus', []);
      
      return {
        active: status.active || false,
        balance: BigInt(status.balance || 0),
        policies: status.policies || [],
      };
    } catch (error) {
      console.error('Failed to get sponsorship status:', error);
      return {
        active: false,
        balance: 0n,
        policies: [],
      };
    }
  }
}

// Export a singleton instance
export const paymasterClient = new PaymasterClient();