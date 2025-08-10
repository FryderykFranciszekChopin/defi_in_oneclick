/**
 * Token Operations for Bridge
 * Handles ERC20 token burns and mints for cross-chain bridging
 */

import {
  encodeFunctionData,
  parseUnits,
  type Hex,
  type Address,
} from 'viem';
import { createUserOperation } from '@/lib/smart-account/operations';
import { executeGaslessOperation } from '@/lib/gasless/execute';
import type { SmartAccount } from '@/lib/smart-account/types';

// ERC20 ABI for token operations
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'burn',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'burnFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

/**
 * Create UserOperation to burn OKB tokens
 */
export async function createBurnTokenOperation(
  account: SmartAccount,
  tokenAddress: Address,
  amount: string,
  decimals: number = 18
): Promise<{
  userOpHash: string;
  calldata: Hex;
}> {
  console.log(`🔥 Creating burn operation for ${amount} tokens`);
  
  // Parse amount to wei
  const amountWei = parseUnits(amount, decimals);
  console.log(`💰 Amount in wei: ${amountWei.toString()}`);

  // Encode burn function call
  const burnCalldata = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'burn',
    args: [amountWei]
  });

  console.log(`📝 Burn calldata: ${burnCalldata}`);

  // Create UserOperation
  const userOp = await createUserOperation({
    account,
    to: tokenAddress,
    data: burnCalldata,
    value: '0'
  });

  return {
    userOpHash: userOp.hash,
    calldata: burnCalldata
  };
}

/**
 * Execute token burn through bundler
 */
export async function executeBurnToken(
  account: SmartAccount,
  tokenAddress: Address,
  amount: string,
  decimals: number = 18
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    console.log(`🚀 Executing burn: ${amount} tokens at ${tokenAddress}`);

    // Create burn operation
    const burnOp = await createBurnTokenOperation(account, tokenAddress, amount, decimals);
    
    // Execute through bundler
    const result = await executeGaslessOperation({
      account,
      to: tokenAddress,
      data: burnOp.calldata,
      value: '0'
    });

    if (result.success && result.txHash) {
      console.log(`✅ Token burn successful: ${result.txHash}`);
      return {
        success: true,
        txHash: result.txHash
      };
    } else {
      console.error(`❌ Token burn failed:`, result.error);
      return {
        success: false,
        error: result.error || 'Unknown error'
      };
    }

  } catch (error: any) {
    console.error('Token burn execution error:', error);
    return {
      success: false,
      error: error.message || 'Execution failed'
    };
  }
}

/**
 * Create UserOperation to transfer tokens to bridge contract
 */
export async function createTransferToBridgeOperation(
  account: SmartAccount,
  tokenAddress: Address,
  bridgeAddress: Address,
  amount: string,
  decimals: number = 18
): Promise<{
  userOpHash: string;
  calldata: Hex;
}> {
  console.log(`📤 Creating transfer to bridge: ${amount} tokens`);
  
  // Parse amount to wei
  const amountWei = parseUnits(amount, decimals);

  // Encode transfer function call
  const transferCalldata = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [bridgeAddress, amountWei]
  });

  // Create UserOperation
  const userOp = await createUserOperation({
    account,
    to: tokenAddress,
    data: transferCalldata,
    value: '0'
  });

  return {
    userOpHash: userOp.hash,
    calldata: transferCalldata
  };
}

/**
 * Execute token transfer to bridge contract
 */
export async function executeTransferToBridge(
  account: SmartAccount,
  tokenAddress: Address,
  bridgeAddress: Address,
  amount: string,
  decimals: number = 18
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    console.log(`🌉 Transferring ${amount} tokens to bridge at ${bridgeAddress}`);

    // Create transfer operation
    const transferOp = await createTransferToBridgeOperation(
      account, 
      tokenAddress, 
      bridgeAddress, 
      amount, 
      decimals
    );
    
    // Execute through bundler
    const result = await executeGaslessOperation({
      account,
      to: tokenAddress,
      data: transferOp.calldata,
      value: '0'
    });

    if (result.success && result.txHash) {
      console.log(`✅ Transfer to bridge successful: ${result.txHash}`);
      return {
        success: true,
        txHash: result.txHash
      };
    } else {
      console.error(`❌ Transfer to bridge failed:`, result.error);
      return {
        success: false,
        error: result.error || 'Unknown error'
      };
    }

  } catch (error: any) {
    console.error('Transfer to bridge execution error:', error);
    return {
      success: false,
      error: error.message || 'Execution failed'
    };
  }
}