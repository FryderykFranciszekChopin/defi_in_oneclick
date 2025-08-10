import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// OKX API configuration
const OKX_API_BASE = 'https://www.okx.com';
const OKX_API_KEY = process.env.OKX_API_KEY!;
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY!;
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE!;

interface QuoteRequest {
  chainId: string;
  amount: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  slippage?: string;
}

/**
 * Create HMAC signature for OKX API
 * @param timestamp - Request timestamp
 * @param method - HTTP method
 * @param path - API path
 * @param body - Request body
 * @returns Base64 encoded signature
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
 * Handle quote requests to OKX DEX API
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

    // Parse request body
    const body: QuoteRequest = await request.json();
    
    // Validate required fields
    if (!body.chainId || !body.amount || !body.fromTokenAddress || !body.toTokenAddress) {
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
      slippage: body.slippage || '0.01'
    });
    const path = `/api/v5/dex/aggregator/quote?${queryParams}`;
    
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
      console.error('OKX API Error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to fetch quote',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the quote data
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Quote API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}