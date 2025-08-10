import { NextResponse } from 'next/server';
import { OKXDexAPI } from '@/lib/okx/dex-api';
import { OKXSwapAPI } from '@/lib/okx/dex-swap';

// API route to proxy OKX requests (avoids CORS issues)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, params } = body;

    if (action === 'quote') {
      const dexApi = new OKXDexAPI();
      const quote = await dexApi.getQuote(params);
      return NextResponse.json(quote);
    }

    if (action === 'swap') {
      const swapApi = new OKXSwapAPI();
      const swapData = await swapApi.getSwapData(params);
      return NextResponse.json(swapData);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('OKX API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}