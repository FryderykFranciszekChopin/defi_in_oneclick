/**
 * Simplified Browser-Compatible Key Manager
 * 브라우저 호환 간소화된 키 관리 시스템
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Hex, Address } from 'viem';

export interface UserWallet {
  address: Address;
  encryptedPrivateKey: string;
  email: string;
  createdAt: string;
  chainAccounts: Record<string, Address>; // chainId -> address mapping
}

export interface WalletAccess {
  privateKey: Hex;
  address: Address;
  account: ReturnType<typeof privateKeyToAccount>;
}

export class SimpleKeyManager {
  private readonly STORAGE_KEY = 'oneclick_defi_user_wallet';

  /**
   * Generate or load user wallet
   */
  async getOrCreateUserWallet(email: string): Promise<UserWallet> {
    const existing = this.getStoredWallet(email);
    if (existing) {
      return existing;
    }

    return this.createNewWallet(email);
  }

  /**
   * Create new wallet for user
   */
  private async createNewWallet(email: string): Promise<UserWallet> {
    console.log('🔐 Creating new wallet for:', email);

    // Generate new private key
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // Simple encryption using email as key (for demo purposes)
    const encryptedPrivateKey = this.simpleEncrypt(privateKey, email);

    const wallet: UserWallet = {
      address: account.address,
      encryptedPrivateKey,
      email,
      createdAt: new Date().toISOString(),
      chainAccounts: {
        '11155111': account.address, // Sepolia
        '196': account.address,      // XLayer
      }
    };

    // Store wallet
    this.storeWallet(wallet);

    console.log('✅ Wallet created successfully:', account.address);
    return wallet;
  }

  /**
   * Decrypt and get wallet access
   */
  async getWalletAccess(email: string): Promise<WalletAccess | null> {
    const wallet = this.getStoredWallet(email);
    if (!wallet) {
      console.error('❌ No wallet found for:', email);
      return null;
    }

    try {
      const privateKey = this.simpleDecrypt(wallet.encryptedPrivateKey, email) as Hex;
      const account = privateKeyToAccount(privateKey);

      return {
        privateKey,
        address: account.address,
        account
      };
    } catch (error) {
      console.error('❌ Failed to decrypt wallet:', error);
      return null;
    }
  }

  /**
   * Check if user has wallet
   */
  hasWallet(email: string): boolean {
    return !!this.getStoredWallet(email);
  }

  /**
   * Get wallet address without decrypting private key
   */
  getWalletAddress(email: string): Address | null {
    const wallet = this.getStoredWallet(email);
    return wallet?.address || null;
  }

  /**
   * Store wallet securely
   */
  private storeWallet(wallet: UserWallet): void {
    if (typeof window === 'undefined') return;

    try {
      const wallets = this.getAllStoredWallets();
      wallets[wallet.email] = wallet;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets));
      console.log('💾 Wallet stored successfully');
    } catch (error) {
      console.error('❌ Failed to store wallet:', error);
    }
  }

  /**
   * Get stored wallet by email
   */
  private getStoredWallet(email: string): UserWallet | null {
    if (typeof window === 'undefined') return null;

    try {
      const wallets = this.getAllStoredWallets();
      return wallets[email] || null;
    } catch (error) {
      console.error('❌ Failed to get stored wallet:', error);
      return null;
    }
  }

  /**
   * Get all stored wallets
   */
  private getAllStoredWallets(): Record<string, UserWallet> {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Failed to parse stored wallets:', error);
      return {};
    }
  }

  /**
   * Simple encryption using XOR (for demo - not production ready)
   */
  private simpleEncrypt(data: string, key: string): string {
    const keyHash = this.simpleHash(key + 'oneclick_defi_salt');
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      const dataChar = data.charCodeAt(i);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }
    
    return btoa(encrypted); // Base64 encode
  }

  /**
   * Simple decryption
   */
  private simpleDecrypt(encryptedData: string, key: string): string {
    const keyHash = this.simpleHash(key + 'oneclick_defi_salt');
    const encrypted = atob(encryptedData); // Base64 decode
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      const encryptedChar = encrypted.charCodeAt(i);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }
    
    return decrypted;
  }

  /**
   * Simple hash function (for demo)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear user wallet (logout)
   */
  clearWallet(email: string): void {
    if (typeof window === 'undefined') return;

    try {
      const wallets = this.getAllStoredWallets();
      delete wallets[email];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets));
      console.log('🗑️ Wallet cleared for:', email);
    } catch (error) {
      console.error('❌ Failed to clear wallet:', error);
    }
  }
}

// Export singleton instance
export const simpleKeyManager = new SimpleKeyManager();

/**
 * Utility functions for easy access
 */
export async function getUserWalletAccess(email: string): Promise<WalletAccess | null> {
  return simpleKeyManager.getWalletAccess(email);
}

export async function ensureUserWallet(email: string): Promise<UserWallet> {
  return simpleKeyManager.getOrCreateUserWallet(email);
}

export function getUserWalletAddress(email: string): Address | null {
  return simpleKeyManager.getWalletAddress(email);
}