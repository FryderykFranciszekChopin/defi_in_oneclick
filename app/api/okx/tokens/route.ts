import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const OKX_API_BASE = 'https://www.okx.com';
const OKX_API_KEY = process.env.OKX_API_KEY!;
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY!;
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE!;

// Cache tokens for 5 minutes
let tokenCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
 * Get supported tokens from OKX DEX API
 */
export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (tokenCache && Date.now() - tokenCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(tokenCache.data);
    }

    // Validate environment variables
    if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get chainId from query params
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '196'; // Default to XLayer

    // Prepare OKX API request
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const path = `/api/v5/dex/aggregator/all-tokens?chainId=${chainId}`;
    
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
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OKX Tokens API Error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to fetch tokens',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Update cache
    tokenCache = {
      data,
      timestamp: Date.now()
    };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Tokens API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}