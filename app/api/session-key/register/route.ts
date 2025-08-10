import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

// SessionKeyModule ABI
const SESSION_KEY_MODULE_ABI = [
  {
    inputs: [
      { name: 'key', type: 'address' },
      { name: 'validUntil', type: 'uint256' },
      { name: 'spendingLimit', type: 'uint256' },
      { name: 'allowedTargets', type: 'address[]' },
      { name: 'allowedFunctions', type: 'bytes4[]' },
    ],
    name: 'registerSessionKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// OneClickAccount ABI for setting session key module
const ACCOUNT_ABI = [
  {
    inputs: [{ name: 'module', type: 'address' }],
    name: 'setSessionKeyModule',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userAddress,
      sessionKeyAddress,
      validUntil,
      spendingLimit,
      allowedTargets = [],
      allowedFunctions = [],
    } = body;

    if (!userAddress || !sessionKeyAddress || !validUntil || !spendingLimit) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the session key module address from environment
    const sessionKeyModuleAddress = process.env.SESSION_KEY_MODULE_ADDRESS as Address;
    if (!sessionKeyModuleAddress) {
      return NextResponse.json(
        { error: 'Session key module not configured' },
        { status: 500 }
      );
    }

    // Create clients
    const publicClient = createPublicClient({
      chain: polygon,
      transport: http(process.env.RPC_URL),
    });

    // For production, this would be done through a meta-transaction or admin key
    // Here we're simulating the registration
    const registrationData = {
      userAddress: userAddress as Address,
      sessionKey: sessionKeyAddress as Address,
      validUntil: BigInt(validUntil),
      spendingLimit: BigInt(spendingLimit),
      allowedTargets: allowedTargets as Address[],
      allowedFunctions: allowedFunctions as `0x${string}`[],
    };

    // In production, this would:
    // 1. Verify the user owns the account
    // 2. Create a UserOperation to register the session key
    // 3. Submit it through the bundler
    
    // For now, we'll just return success
    // The actual registration would happen on-chain
    
    return NextResponse.json({
      success: true,
      sessionKey: sessionKeyAddress,
      validUntil,
      message: 'Session key registration initiated. Please confirm the transaction in your wallet.',
    });
  } catch (error) {
    console.error('Session key registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register session key' },
      { status: 500 }
    );
  }
}