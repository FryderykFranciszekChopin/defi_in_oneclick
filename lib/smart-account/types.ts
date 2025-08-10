import { Address, Hex } from 'viem';

export interface SmartAccountConfig {
  email: string;
  publicKey: string;
  chainId: number;
}

export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

export interface SmartAccount {
  address: Address;
  publicKey: string;
  email: string;
  isDeployed: boolean;
  nonce?: bigint;
  balance?: string;
  chainId?: number;
}

// Helper to serialize UserOperation for JSON
export function serializeUserOp(userOp: UserOperation): any {
  return {
    sender: userOp.sender,
    nonce: '0x' + userOp.nonce.toString(16),
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: '0x' + userOp.callGasLimit.toString(16),
    verificationGasLimit: '0x' + userOp.verificationGasLimit.toString(16),
    preVerificationGas: '0x' + userOp.preVerificationGas.toString(16),
    maxFeePerGas: '0x' + userOp.maxFeePerGas.toString(16),
    maxPriorityFeePerGas: '0x' + userOp.maxPriorityFeePerGas.toString(16),
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  };
}