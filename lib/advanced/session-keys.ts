import { encodeFunctionData, type Address, type Hex, parseEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface SessionKeyConfig {
  validityDuration: number; // in seconds
  spendingLimit: bigint; // in wei
  allowedContracts?: Address[];
  allowedFunctions?: string[]; // function selectors
}

export interface SessionKey {
  privateKey: Hex;
  address: Address;
  validUntil: number;
  spendingLimit: bigint;
  config: SessionKeyConfig;
}

export class SessionKeyManager {
  private storageKey = 'oneclick_defi_session_keys';

  /**
   * Create a new session key with limited permissions
   */
  async createSessionKey(
    accountAddress: Address,
    config: SessionKeyConfig
  ): Promise<SessionKey> {
    // Generate ephemeral key pair
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    const validUntil = Math.floor(Date.now() / 1000) + config.validityDuration;
    
    const sessionKey: SessionKey = {
      privateKey,
      address: account.address,
      validUntil,
      spendingLimit: config.spendingLimit,
      config,
    };
    
    // Store encrypted in localStorage
    this.storeSessionKey(accountAddress, sessionKey);
    
    return sessionKey;
  }

  /**
   * Create session key specifically for swap operations
   */
  async createSwapSessionKey(
    accountAddress: Address,
    dailyLimit: bigint = parseEther('100')
  ): Promise<SessionKey> {
    const config: SessionKeyConfig = {
      validityDuration: 24 * 60 * 60, // 24 hours
      spendingLimit: dailyLimit,
      allowedContracts: [
        '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch router
        '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE', // OKX router
      ],
      allowedFunctions: [
        '0x12aa3caf', // swap
        '0x0502b1c5', // unoswap
        '0xe449022e', // uniswapV3Swap
      ],
    };
    
    return this.createSessionKey(accountAddress, config);
  }

  /**
   * Get on-chain transaction to register session key
   */
  getRegisterSessionKeyCalldata(
    sessionKey: SessionKey,
    _moduleAddress: Address
  ): Hex {
    const validAfter = Math.floor(Date.now() / 1000);
    
    return encodeFunctionData({
      abi: [
        {
          name: 'createSessionKey',
          type: 'function',
          inputs: [
            { name: '_key', type: 'address' },
            { name: '_validUntil', type: 'uint256' },
            { name: '_validAfter', type: 'uint256' },
            { name: '_spendingLimit', type: 'uint256' },
            { name: '_allowedContracts', type: 'address[]' },
            { name: '_allowedFunctions', type: 'bytes4[]' },
          ],
          outputs: [],
        },
      ],
      functionName: 'createSessionKey',
      args: [
        sessionKey.address,
        BigInt(sessionKey.validUntil),
        BigInt(validAfter),
        sessionKey.spendingLimit,
        sessionKey.config.allowedContracts || [],
        sessionKey.config.allowedFunctions || [],
      ],
    });
  }

  /**
   * Sign transaction with session key
   */
  async signWithSessionKey(
    sessionKey: SessionKey,
    transaction: any
  ): Promise<Hex> {
    const account = privateKeyToAccount(sessionKey.privateKey);
    return account.signTransaction(transaction);
  }

  /**
   * Store session key securely
   */
  private storeSessionKey(accountAddress: Address, sessionKey: SessionKey): void {
    const stored = this.getStoredKeys();
    stored[accountAddress] = {
      ...sessionKey,
      privateKey: this.encrypt(sessionKey.privateKey),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(stored));
  }

  /**
   * Get stored session keys
   */
  getStoredKeys(): Record<Address, any> {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Simple encryption (use proper encryption in production)
   */
  private encrypt(data: string): string {
    return btoa(data);
  }

  /**
   * Simple decryption (use proper decryption in production)
   */
  // private decrypt(data: string): string {
  //   return atob(data);
  // }

  /**
   * Check if session key is valid
   */
  isSessionKeyValid(sessionKey: SessionKey): boolean {
    return Math.floor(Date.now() / 1000) < sessionKey.validUntil;
  }

  /**
   * Revoke session key
   */
  revokeSessionKey(accountAddress: Address, sessionKeyAddress: Address): void {
    const stored = this.getStoredKeys();
    if (stored[accountAddress]?.address === sessionKeyAddress) {
      delete stored[accountAddress];
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    }
  }
}