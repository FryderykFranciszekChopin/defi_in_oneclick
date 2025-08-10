import { NextResponse } from 'next/server';
import crypto from 'crypto';

const OKX_API_KEY = process.env.OKX_API_KEY!;
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY!;
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE!;
const OKX_PROJECT_ID = process.env.OKX_PROJECT_ID!;

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

export async function GET() {
  try {
    console.log('🧪 Testing OKX API authentication...');
    
    // Test with OKX DEX API endpoint (not trading API)
    const timestamp = Date.now().toString();
    const method = 'GET';
    const path = '/api/v5/dex/aggregator/supported/chain';
    
    const signature = createSignature(timestamp, method, path);
    
    console.log('📡 Test params:', {
      timestamp,
      method,
      path,
      apiKey: OKX_API_KEY?.substring(0, 8) + '...',
      passphrase: OKX_PASSPHRASE?.substring(0, 3) + '...'
    });
    
    const response = await fetch(`https://www.okx.com${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': OKX_API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
        'OK-ACCESS-PROJECT': OKX_PROJECT_ID
      }
    });

    console.log('📦 Response status:', response.status);
    const responseText = await response.text();
    console.log('📦 Response:', responseText.substring(0, 500));

    if (!response.ok) {
      return NextResponse.json({
        error: 'OKX API test failed',
        status: response.status,
        response: responseText
      });
    }

    const data = JSON.parse(responseText);
    
    return NextResponse.json({
      success: true,
      status: response.status,
      data: data
    });
    
  } catch (error: any) {
    console.error('❌ OKX API test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error.message
    });
  }
}