/**
 * Environment variable validation and configuration
 */

interface EnvConfig {
  // OKX API Configuration
  OKX_API_KEY: string;
  OKX_SECRET_KEY: string;
  OKX_PASSPHRASE: string;
  
  // Pimlico Configuration
  NEXT_PUBLIC_PIMLICO_API_KEY: string;
  
  // XLayer Configuration
  XLAYER_RPC_URL: string;
  NEXT_PUBLIC_XLAYER_CHAIN_ID: string;
  
  // Optional
  XLAYER_PRIVATE_KEY?: string;
  XLAYER_EXPLORER_API_KEY?: string;
  
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL?: string;
}

/**
 * Validates that all required environment variables are present
 * @throws Error if any required variables are missing
 */
export function validateEnv(): void {
  const requiredVars = [
    'OKX_API_KEY',
    'OKX_SECRET_KEY',
    'OKX_PASSPHRASE',
    'NEXT_PUBLIC_PIMLICO_API_KEY',
  ];
  
  const missingVars = requiredVars.filter(key => !process.env[key]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
  
  // Validate format for specific variables
  if (process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID && 
      isNaN(Number(process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID))) {
    throw new Error('NEXT_PUBLIC_XLAYER_CHAIN_ID must be a valid number');
  }
}

/**
 * Get typed environment configuration
 * @returns Typed environment configuration object
 */
export function getEnvConfig(): EnvConfig {
  // Only validate in server environment
  if (typeof window === 'undefined') {
    validateEnv();
  }
  
  return {
    // OKX API
    OKX_API_KEY: process.env.OKX_API_KEY || '',
    OKX_SECRET_KEY: process.env.OKX_SECRET_KEY || '',
    OKX_PASSPHRASE: process.env.OKX_PASSPHRASE || '',
    
    // Pimlico
    NEXT_PUBLIC_PIMLICO_API_KEY: process.env.NEXT_PUBLIC_PIMLICO_API_KEY || '',
    
    // XLayer
    XLAYER_RPC_URL: process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech',
    NEXT_PUBLIC_XLAYER_CHAIN_ID: process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID || '196',
    XLAYER_PRIVATE_KEY: process.env.XLAYER_PRIVATE_KEY,
    XLAYER_EXPLORER_API_KEY: process.env.XLAYER_EXPLORER_API_KEY,
    
    // Application
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  };
}

/**
 * Check if running in production
 */
export const isProd = process.env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDev = process.env.NODE_ENV === 'development';

/**
 * Get public runtime config (safe for client-side)
 */
export function getPublicConfig() {
  return {
    chainId: Number(process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID || '196'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    pimlicoApiKey: process.env.NEXT_PUBLIC_PIMLICO_API_KEY || '',
  };
}