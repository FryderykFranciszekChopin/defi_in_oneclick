import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const OKX_API_BASE = 'https://www.okx.com/api/v5/dex/aggregator';
const OKX_API_KEY = process.env.OKX_API_KEY!;
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY!;
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE!;

interface BridgeQuoteRequest {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userWalletAddress: string;
  slippage?: string;
}

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

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
      return NextResponse.json(
        { error: 'OKX API credentials not configured' },
        { status: 500 }
      );
    }

    const params: BridgeQuoteRequest = await request.json();
    
    console.log('🔍 Getting OKX bridge quote for:', params);

    // Prepare API request
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const queryParams = new URLSearchParams({
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      userWalletAddress: params.userWalletAddress,
      slippage: params.slippage || '0.005'
    });
    const path = `/api/v5/dex/aggregator/quote?${queryParams}`;
    
    // Create signature
    const signature = createSignature(timestamp, method, path);
    
    console.log(`📡 Calling OKX API: ${OKX_API_BASE}${path}`);
    
    // Make request to OKX API
    const response = await fetch(`${OKX_API_BASE}${path}`, {
      method,
      headers: {
        'OK-ACCESS-KEY': OKX_API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OKX API Error:', errorData);
      return NextResponse.json(
        { 
          error: 'OKX API request failed',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ OKX bridge quote response:', data);
    
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Bridge quote API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}