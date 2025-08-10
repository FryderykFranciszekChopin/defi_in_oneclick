import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test key manager import
    const { simpleKeyManager } = await import('@/lib/wallet/simple-key-manager');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All systems operational',
      keyManager: !!simpleKeyManager
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}