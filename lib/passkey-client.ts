/**
 * Client-side passkey management utilities
 * @module passkey-client
 */

/**
 * Passkey data stored in localStorage
 * @interface StoredPasskey
 */
export interface StoredPasskey {
  id: string;
  publicKey: string;
  email: string;
  createdAt: string;
  accountIndex?: number; // Support for multiple accounts
}

/**
 * Retrieves stored passkey data from localStorage
 * @returns {StoredPasskey | null} Stored passkey data or null if not found
 * @example
 * ```typescript
 * const passkey = getStoredPasskey();
 * if (passkey) {
 *   console.log('Found passkey for:', passkey.email);
 * }
 * ```
 */
export function getStoredPasskey(): StoredPasskey | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('oneclick_defi_passkey');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve passkey:', error);
    return null;
  }
}

/**
 * Stores passkey data in localStorage
 * @param {StoredPasskey} passkey - Passkey data to store
 * @returns {boolean} Success status
 */
export function storePasskey(passkey: StoredPasskey): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem('oneclick_defi_passkey', JSON.stringify(passkey));
    return true;
  } catch (error) {
    console.error('Failed to store passkey:', error);
    return false;
  }
}

/**
 * Clears stored passkey data from localStorage
 * @returns {void}
 * @example
 * ```typescript
 * // Logout user
 * clearPasskey();
 * ```
 */
export function clearPasskey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('oneclick_defi_passkey');
}

/**
 * Gets the next account index for the given email
 * @param {string} email - User's email
 * @returns {number} Next account index
 */
export function getNextAccountIndex(email: string): number {
  if (typeof window === 'undefined') return 0;
  
  const key = `oneclick_defi_account_index_${email}`;
  const currentIndex = parseInt(localStorage.getItem(key) || '0', 10);
  const nextIndex = currentIndex + 1;
  
  localStorage.setItem(key, nextIndex.toString());
  return nextIndex;
}

/**
 * Gets the current account index for the given email
 * @param {string} email - User's email
 * @returns {number} Current account index
 */
export function getCurrentAccountIndex(email: string): number {
  if (typeof window === 'undefined') return 0;
  
  const key = `oneclick_defi_account_index_${email}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}