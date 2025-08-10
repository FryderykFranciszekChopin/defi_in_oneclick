/**
 * Wallet Funding Utilities for Testing
 * 개발자가 테스트 지갑에 자금을 제공하기 위한 유틸리티
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex, Address } from 'viem';
import { getNetwork } from '../networks/config';
import { getUserWalletAccess, simpleKeyManager as keyManager } from './simple-key-manager';

// 개발용 funding account private key (실제 테스트넷 토큰이 있는 계정)
const FUNDING_PRIVATE_KEY = process.env.FUNDING_PRIVATE_KEY || '0x4883a8fd611148c2eeda5397693e12fba45b939e22375d4f9a469b62d1f1c882';

export interface WalletFundingResult {
  success: boolean;
  txHash?: string;
  error?: string;
  balance?: string;
}

export class WalletFunder {
  /**
   * Fund user wallet with test tokens
   */
  async fundUserWallet(
    userEmail: string, 
    networkId: string, 
    amount: string = '0.1'
  ): Promise<WalletFundingResult> {
    try {
      console.log(`💰 Funding wallet for ${userEmail} on ${networkId} with ${amount} tokens`);
      
      // Get user's wallet address
      const userAddress = keyManager.getWalletAddress(userEmail);
      if (!userAddress) {
        return {
          success: false,
          error: 'User wallet not found. Please create wallet first.'
        };
      }

      const network = getNetwork(networkId);
      const fundingAccount = privateKeyToAccount(FUNDING_PRIVATE_KEY as Hex);
      
      // Create wallet client with funding account
      const walletClient = createWalletClient({
        account: fundingAccount,
        chain: network.chain,
        transport: http(),
      });

      // Create public client to check balances
      const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(),
      });

      // Check funding account balance
      const fundingBalance = await publicClient.getBalance({
        address: fundingAccount.address,
      });

      console.log(`💰 Funding account balance: ${formatEther(fundingBalance)} tokens`);

      if (fundingBalance < parseEther(amount)) {
        return {
          success: false,
          error: `Insufficient balance in funding account. Has ${formatEther(fundingBalance)} tokens, needs ${amount}`
        };
      }

      // Send tokens to user wallet
      const hash = await walletClient.sendTransaction({
        to: userAddress,
        value: parseEther(amount),
      });

      console.log(`✅ Funding transaction sent: ${hash}`);

      // Wait for transaction and check new balance
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        const newBalance = await publicClient.getBalance({
          address: userAddress,
        });

        console.log(`✅ User wallet funded! New balance: ${formatEther(newBalance)}`);

        return {
          success: true,
          txHash: hash,
          balance: formatEther(newBalance)
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed'
        };
      }

    } catch (error) {
      console.error('❌ Funding failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check user wallet balance
   */
  async getUserWalletBalance(userEmail: string, networkId: string): Promise<string | null> {
    try {
      const userAddress = keyManager.getWalletAddress(userEmail);
      if (!userAddress) {
        return null;
      }

      const network = getNetwork(networkId);
      const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(),
      });

      const balance = await publicClient.getBalance({
        address: userAddress,
      });

      return formatEther(balance);
    } catch (error) {
      console.error('❌ Balance check failed:', error);
      return null;
    }
  }

  /**
   * Fund multiple networks at once
   */
  async fundUserWalletMultiChain(
    userEmail: string,
    networks: string[] = ['sepolia', 'xlayer'],
    amount: string = '0.1'
  ): Promise<Record<string, WalletFundingResult>> {
    console.log(`🌐 Funding user ${userEmail} on multiple networks:`, networks);
    
    const results: Record<string, WalletFundingResult> = {};

    for (const networkId of networks) {
      try {
        results[networkId] = await this.fundUserWallet(userEmail, networkId, amount);
        
        // Add delay between funding operations
        if (networks.indexOf(networkId) < networks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        results[networkId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Get funding account info (for debugging)
   */
  getFundingAccountInfo(): { address: Address; privateKey: string } {
    const fundingAccount = privateKeyToAccount(FUNDING_PRIVATE_KEY as Hex);
    return {
      address: fundingAccount.address,
      privateKey: FUNDING_PRIVATE_KEY
    };
  }

  /**
   * Display funding instructions
   */
  getFundingInstructions(networkId: string): string {
    const network = getNetwork(networkId);
    const fundingAccount = this.getFundingAccountInfo();

    let faucetUrls = '';
    if (networkId === 'sepolia') {
      faucetUrls = `
🚰 Sepolia Faucets:
- Alchemy: https://sepoliafaucet.net/
- QuickNode: https://faucet.quicknode.com/ethereum/sepolia
- Alchemy: https://sepoliafaucet.com/`;
    } else if (networkId === 'xlayer') {
      faucetUrls = `
🚰 XLayer Faucets:
- OKX: https://www.okx.com/xlayer/faucet`;
    }

    return `
💰 To fund the system for testing:

1. Fund the funding account: ${fundingAccount.address}
${faucetUrls}

2. Or set FUNDING_PRIVATE_KEY environment variable with a funded account

3. Then use walletFunder.fundUserWallet(email, '${networkId}') to fund user wallets

Network: ${network.chain.name} (Chain ID: ${network.chain.id})
`;
  }
}

// Export singleton instance
export const walletFunder = new WalletFunder();

/**
 * Easy-to-use utility functions
 */
export async function fundUserForTesting(
  userEmail: string,
  networkId: string = 'sepolia',
  amount: string = '0.1'
): Promise<WalletFundingResult> {
  return walletFunder.fundUserWallet(userEmail, networkId, amount);
}

export async function fundUserMultiChain(
  userEmail: string,
  amount: string = '0.1'
): Promise<Record<string, WalletFundingResult>> {
  return walletFunder.fundUserWalletMultiChain(userEmail, ['sepolia', 'xlayer'], amount);
}

export async function checkUserBalance(
  userEmail: string,
  networkId: string
): Promise<string | null> {
  return walletFunder.getUserWalletBalance(userEmail, networkId);
}