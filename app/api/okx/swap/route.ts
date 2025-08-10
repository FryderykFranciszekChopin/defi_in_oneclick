import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// OKX API configuration
const OKX_API_BASE = 'https://www.okx.com';
const OKX_API_KEY = process.env.OKX_API_KEY!;
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY!;
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE!;

interface SwapRequest {
  chainId: string;
  amount: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  slippage: string;
  userWalletAddress: string;
  referrerAddress?: string;
}

/**
 * Create HMAC signature for OKX API
 */
function createSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string = ''
): string {
  const message = timestamp + method + path + body;
  const hmac = crypto.createHmac('sha256', OKX_SECRET_KEY);
  hmac.update(message);
  return hmac.digest('base64');
}

/**
 * Handle swap requests to OKX DEX API
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body: SwapRequest = await request.json();
    
    if (!body.chainId || !body.amount || !body.fromTokenAddress || 
        !body.toTokenAddress || !body.userWalletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare OKX API request
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const queryParams = new URLSearchParams({
      chainId: body.chainId,
      amount: body.amount,
      fromTokenAddress: body.fromTokenAddress,
      toTokenAddress: body.toTokenAddress,
      slippage: body.slippage || '0.01',
      userWalletAddress: body.userWalletAddress,
      ...(body.referrerAddress && { referrerAddress: body.referrerAddress })
    });
    const path = `/api/v5/dex/aggregator/swap?${queryParams}`;
    
    // Create signature
    const signature = createSignature(timestamp, method, path);
    
    // Make request to OKX API
    const response = await fetch(`${OKX_API_BASE}${path}`, {
      method,
      headers: {
        'OK-ACCESS-KEY': OKX_API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 0 } // Disable caching for swap data
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OKX Swap API Error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to get swap data',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log swap request for monitoring (remove sensitive data)
    console.log('Swap request processed:', {
      chainId: body.chainId,
      fromToken: body.fromTokenAddress,
      toToken: body.toTokenAddress,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Swap API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}