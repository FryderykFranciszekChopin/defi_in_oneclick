import { NextRequest, NextResponse } from 'next/server';
// import { type Address } from 'viem';

// SessionKeyModule ABI (for future implementation)
/*
const SESSION_KEY_MODULE_ABI = [
  {
    inputs: [{ name: 'key', type: 'address' }],
    name: 'revokeSessionKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
*/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, sessionKeyAddress } = body;

    if (!userAddress || !sessionKeyAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Verify the user owns the account
    // 2. Create a UserOperation to revoke the session key
    // 3. Submit it through the bundler
    
    // For now, we'll just return success
    // The actual revocation would happen on-chain
    
    return NextResponse.json({
      success: true,
      sessionKey: sessionKeyAddress,
      message: 'Session key revocation initiated. Please confirm the transaction in your wallet.',
    });
  } catch (error) {
    console.error('Session key revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session key' },
      { status: 500 }
    );
  }
}