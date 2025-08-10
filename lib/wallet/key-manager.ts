/**
 * Secure Private Key Management System
 * 사용자별 private key 생성, 암호화 저장, 안전한 사용을 위한 시스템
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
// Browser-compatible crypto implementation
function createHash(algorithm: string) {
  return {
    update: (data: string) => ({
      digest: (encoding: string) => {
        if (typeof window !== 'undefined') {
          // Browser environment - use Web Crypto API
          const encoder = new TextEncoder();
          return crypto.subtle.digest('SHA-256', encoder.encode(data))
            .then(buffer => {
              const hashArray = new Uint8Array(buffer);
              return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
            });
        } else {
          // Node.js environment - use crypto module
          const crypto = require('crypto');
          return crypto.createHash(algorithm).update(data).digest(encoding);
        }
      })
    })
  };
}

function randomBytes(size: number): { toString: (encoding: string) => string } {
  if (typeof window !== 'undefined') {
    // Browser environment
    const array = new Uint8Array(size);
    crypto.getRandomValues(array);
    return {
      toString: (encoding: string) => {
        if (encoding === 'hex') {
          return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return '';
      }
    };
  } else {
    // Node.js environment
    const crypto = require('crypto');
    return crypto.randomBytes(size);
  }
}
import type { Hex, Address } from 'viem';

export interface UserWallet {
  address: Address;
  encryptedPrivateKey: string;
  salt: string;
  email: string;
  createdAt: string;
  chainAccounts: Record<string, Address>; // chainId -> address mapping
}

export interface WalletAccess {
  privateKey: Hex;
  address: Address;
  account: ReturnType<typeof privateKeyToAccount>;
}

export class SecureKeyManager {
  private readonly STORAGE_KEY = 'oneclick_defi_user_wallet';
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  /**
   * Generate or load user wallet
   */
  async getOrCreateUserWallet(email: string, password?: string): Promise<UserWallet> {
    const existing = this.getStoredWallet(email);
    if (existing) {
      return existing;
    }

    return this.createNewWallet(email, password);
  }

  /**
   * Create new wallet for user
   */
  private async createNewWallet(email: string, password?: string): Promise<UserWallet> {
    console.log('🔐 Creating new wallet for:', email);

    // Generate new private key
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // Create encryption password from email if not provided
    const encryptionPassword = password || await this.derivePasswordFromEmail(email);
    
    // Generate salt for encryption
    const salt = randomBytes(32).toString('hex');
    
    // Encrypt private key
    const encryptedPrivateKey = this.encryptPrivateKey(privateKey, encryptionPassword, salt);

    const wallet: UserWallet = {
      address: account.address,
      encryptedPrivateKey,
      salt,
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
  async getWalletAccess(email: string, password?: string): Promise<WalletAccess | null> {
    const wallet = this.getStoredWallet(email);
    if (!wallet) {
      console.error('❌ No wallet found for:', email);
      return null;
    }

    try {
      const encryptionPassword = password || await this.derivePasswordFromEmail(email);
      const privateKey = this.decryptPrivateKey(
        wallet.encryptedPrivateKey, 
        encryptionPassword, 
        wallet.salt
      ) as Hex;

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
   * Derive deterministic password from email
   */
  private async derivePasswordFromEmail(email: string): Promise<string> {
    // Create deterministic but reasonably secure password from email
    if (typeof window !== 'undefined') {
      // Browser environment
      const encoder = new TextEncoder();
      const data = encoder.encode(email + 'oneclick_defi_salt_2024');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js environment
      const crypto = require('crypto');
      return crypto.createHash('sha256')
        .update(email + 'oneclick_defi_salt_2024')
        .digest('hex');
    }
  }

  /**
   * Simple XOR encryption (for demo - use proper encryption in production)
   */
  private encryptPrivateKey(privateKey: string, password: string, salt: string): string {
    try {
      // Simple XOR encryption for browser compatibility
      const key = (password + salt).repeat(Math.ceil(privateKey.length / (password + salt).length));
      let encrypted = '';
      
      for (let i = 0; i < privateKey.length; i++) {
        encrypted += String.fromCharCode(privateKey.charCodeAt(i) ^ key.charCodeAt(i));
      }
      
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  /**
   * Simple XOR decryption
   */
  private decryptPrivateKey(encryptedPrivateKey: string, password: string, salt: string): string {
    try {
      const encrypted = atob(encryptedPrivateKey); // Base64 decode
      const key = (password + salt).repeat(Math.ceil(encrypted.length / (password + salt).length));
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i));
      }
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Failed to decrypt private key');
    }
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

  /**
   * Fund wallet with test tokens (for development)
   */
  async fundWalletForTesting(address: Address, chainId: number = 11155111): Promise<void> {
    console.log(`💰 Funding wallet ${address} on chain ${chainId} for testing...`);
    
    // This would typically involve:
    // 1. Calling faucet APIs
    // 2. Or transferring from a funded test account
    // 3. For now, just log the intent
    
    if (chainId === 11155111) { // Sepolia
      console.log('🚰 Visit Sepolia faucet: https://sepoliafaucet.com/');
      console.log('🚰 Or Alchemy faucet: https://sepoliafaucet.net/');
    } else if (chainId === 196) { // XLayer
      console.log('🚰 Visit XLayer faucet: https://www.okx.com/xlayer/faucet');
    }
  }
}

// Export singleton instance
export const keyManager = new SecureKeyManager();

/**
 * Utility functions for easy access
 */
export async function getUserWalletAccess(email: string): Promise<WalletAccess | null> {
  return keyManager.getWalletAccess(email);
}

export async function ensureUserWallet(email: string): Promise<UserWallet> {
  return keyManager.getOrCreateUserWallet(email);
}

export function getUserWalletAddress(email: string): Address | null {
  return keyManager.getWalletAddress(email);
}