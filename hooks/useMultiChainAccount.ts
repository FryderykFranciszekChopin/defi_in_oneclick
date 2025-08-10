'use client';

import { useState, useEffect } from 'react';
import { 
  createMultiChainAccount, 
  getMultiChainBalance, 
  type MultiChainAccount 
} from '@/lib/smart-account/multichain';

interface UseMultiChainAccountReturn {
  account: MultiChainAccount | null;
  isLoading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
}

export function useMultiChainAccount(
  email?: string,
  publicKey?: string,
  accountIndex: number = 0
): UseMultiChainAccountReturn {
  const [account, setAccount] = useState<MultiChainAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize multi-chain account
  useEffect(() => {
    if (!email || !publicKey) {
      setIsLoading(false);
      return;
    }

    const initAccount = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Creating multi-chain account...');
        const mcAccount = await createMultiChainAccount(email, publicKey, accountIndex);
        setAccount(mcAccount);
        console.log('✅ Multi-chain account created:', mcAccount);

      } catch (err: any) {
        console.error('❌ Failed to create multi-chain account:', err);
        setError(err.message || 'Failed to create account');
      } finally {
        setIsLoading(false);
      }
    };

    initAccount();
  }, [email, publicKey, accountIndex]);

  // Refresh balances across all networks
  const refreshBalances = async () => {
    if (!account) return;

    try {
      console.log('🔄 Refreshing multi-chain balances...');
      const updatedAccount = await getMultiChainBalance(account);
      setAccount(updatedAccount);
      console.log('✅ Balances refreshed:', updatedAccount);
    } catch (err: any) {
      console.error('❌ Failed to refresh balances:', err);
      setError(err.message || 'Failed to refresh balances');
    }
  };

  return {
    account,
    isLoading,
    error,
    refreshBalances,
  };
}