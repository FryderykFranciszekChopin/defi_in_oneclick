/**
 * Utility functions for cleaning up corrupted localStorage data
 */

/**
 * Clear all OneClick DeFi related data from localStorage
 * Use this when data corruption is detected
 */
export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing all OneClick DeFi data...');
  
  // Clear passkey data
  localStorage.removeItem('oneclick_defi_passkey');
  
  // Clear smart account address
  localStorage.removeItem('smart_account_address');
  
  // Clear any account index data
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('oneclick_defi_account_index_')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ All OneClick DeFi data cleared');
}

/**
 * Validate stored passkey data and clear if corrupted
 * @returns boolean - true if data was valid, false if corrupted and cleared
 */
export function validateAndCleanPasskey(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem('oneclick_defi_passkey');
  if (!stored) {
    return true; // No data is fine
  }
  
  try {
    const passkey = JSON.parse(stored);
    
    // Check if passkey has required fields
    if (!passkey.publicKey || passkey.publicKey === '' || passkey.publicKey === '0x') {
      console.warn('🚨 Found corrupted passkey with invalid publicKey, clearing...');
      clearAllData();
      return false;
    }
    
    if (!passkey.email || !passkey.id) {
      console.warn('🚨 Found corrupted passkey with missing fields, clearing...');
      clearAllData();
      return false;
    }
    
    console.log('✅ Passkey data validation passed');
    return true;
  } catch (error) {
    console.warn('🚨 Found corrupted passkey JSON, clearing...');
    clearAllData();
    return false;
  }
}

/**
 * Debug: Log all stored OneClick DeFi data (without sensitive info)
 */
export function debugLogStoredData(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🔍 OneClick DeFi stored data:');
  
  const passkey = localStorage.getItem('oneclick_defi_passkey');
  if (passkey) {
    try {
      const parsed = JSON.parse(passkey);
      console.log('- Passkey:', {
        email: parsed.email,
        id: parsed.id?.substring(0, 10) + '...',
        publicKey: parsed.publicKey ? parsed.publicKey.substring(0, 10) + '...' : 'EMPTY',
        createdAt: parsed.createdAt,
        accountIndex: parsed.accountIndex
      });
    } catch (e) {
      console.log('- Passkey: CORRUPTED JSON');
    }
  } else {
    console.log('- Passkey: Not stored');
  }
  
  const address = localStorage.getItem('smart_account_address');
  if (address) {
    try {
      const parsed = JSON.parse(address);
      console.log('- Smart Account:', {
        address: parsed.address,
        email: parsed.email,
        timestamp: new Date(parsed.timestamp).toISOString()
      });
    } catch (e) {
      console.log('- Smart Account: CORRUPTED JSON');
    }
  } else {
    console.log('- Smart Account: Not stored');
  }
}

// Export for global access in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllData = clearAllData;
  (window as any).validateAndCleanPasskey = validateAndCleanPasskey;
  (window as any).debugLogStoredData = debugLogStoredData;
}