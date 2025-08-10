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
}