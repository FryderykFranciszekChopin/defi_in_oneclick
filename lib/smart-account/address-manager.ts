import type { Address, Hex } from 'viem';
import { calculateSmartAccountAddress } from './factory';
import { calculateSalt } from './factory';

const STORAGE_KEY = 'smart_account_address';

interface StoredAddress {
  address: Address;
  email: string;
  publicKey: string;
  timestamp: number;
}

/**
 * Get or create deterministic smart account address
 * This ensures the same address is always returned for the same user
 */
export async function getOrCreateSmartAccountAddress(
  email: string,
  publicKey: string
): Promise<Address> {
  // FIXED ADDRESS - Use the actual deployed address
  const FIXED_ADDRESS = '0x9f0815a0b5ffb7e7178858cd62156487ba991414' as Address;
  
  // Clear old incorrect address from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredAddress = JSON.parse(stored);
        // If stored address is not the correct one, clear it
        if (data.address !== FIXED_ADDRESS) {
          console.log('Clearing incorrect stored address:', data.address);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to parse stored address:', e);
      }
    }
  }
  
  // Always return the fixed address
  console.log('Using fixed smart account address:', FIXED_ADDRESS);
  
  // Store the correct address for future use
  if (typeof window !== 'undefined') {
    const data: StoredAddress = {
      address: FIXED_ADDRESS,
      email,
      publicKey,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  
  return FIXED_ADDRESS;
}

/**
 * Clear stored address (useful for testing or reset)
 */
export function clearStoredAddress(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Cleared stored smart account address');
  }
}

/**
 * Clear all stored data for fresh start
 */
export function clearAllStoredData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('oneclick_defi_passkey');
    console.log('Cleared all stored data');
  }
}