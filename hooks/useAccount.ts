import { useState, useEffect, useCallback } from 'react';
import { formatEther, type Hex } from 'viem';
import { createSmartAccount, getAccountBalance } from '../lib/smart-account/factory';
import { getStoredPasskey } from '../lib/passkey-client';
import type { SmartAccount } from '../lib/smart-account/types';
import type { Token } from '../types';
import { createPublicClient, http, erc20Abi } from 'viem';
import { sepolia } from '../lib/smart-account/factory';
import { useSession } from 'next-auth/react';

interface AccountState {
  account: SmartAccount | null;
  balance: string;
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
}

// Common Sepolia tokens with CDN-hosted logos for CORS compatibility
const SEPOLIA_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Sepolia Ether',
    address: '0x0000000000000000000000000000000000000000', // Native token
    decimals: 18,
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0x75231F58b43240C9718Dd58B4967c5114342a86c/logo.png',
    chainId: '11155111',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
    decimals: 6,
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    chainId: '11155111',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035',
    decimals: 6,
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    chainId: '11155111',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c',
    decimals: 18,
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    chainId: '11155111',
  },
];

export function useAccount() {
  const { data: session } = useSession();
  const [state, setState] = useState<AccountState>({
    account: null,
    balance: '0',
    tokens: [],
    isLoading: false,
    error: null,
  });

  // Load account using session data (consistent address)
  const loadAccount = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // First check session for existing smart account address
      if (session?.user?.smartAccountAddress && session?.user?.email) {
        // Use session data for consistent account
        const account: SmartAccount = {
          address: session.user.smartAccountAddress as Hex,
          email: session.user.email,
          publicKey: session.user.publicKey || '',
          isDeployed: true, // Assume deployed if in session
          nonce: 0n,
        };
        
        setState(prev => ({ ...prev, account, isLoading: false }));
        return;
      }
      
      // Fallback to passkey for new accounts
      const passkey = getStoredPasskey();
      if (!passkey) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Create smart account instance
      const account = await createSmartAccount({
        email: passkey.email,
        publicKey: passkey.publicKey,
        chainId: sepolia.id,
      });

      setState(prev => ({ ...prev, account, isLoading: false }));
    } catch (error: any) {
      console.error('Failed to load account:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to load account' 
      }));
    }
  }, [session]);

  // Fetch balance and token balances
  const refreshBalance = useCallback(async () => {
    if (!state.account) return;

    try {
      // Get native token balance
      const balance = await getAccountBalance(state.account.address);
      const balanceInEther = formatEther(balance);

      // Get token balances
      const client = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      const tokensWithBalance = await Promise.all(
        SEPOLIA_TOKENS.map(async (token) => {
          if (token.address === '0x0000000000000000000000000000000000000000') {
            // Native token
            return {
              ...token,
              balance: balanceInEther,
              balanceRaw: balance.toString(),
            };
          }

          try {
            // ERC20 token balance
            const tokenBalance = await client.readContract({
              address: token.address as Hex,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [state.account!.address],
            }) as bigint;

            const formattedBalance = (Number(tokenBalance) / 10 ** token.decimals).toFixed(6);
            
            return {
              ...token,
              balance: formattedBalance,
              balanceRaw: tokenBalance.toString(),
            };
          } catch (error) {
            console.warn(`Failed to get balance for ${token.symbol}:`, error);
            return {
              ...token,
              balance: '0',
              balanceRaw: '0',
            };
          }
        })
      );

      setState(prev => ({ 
        ...prev, 
        balance: balanceInEther,
        tokens: tokensWithBalance.filter(t => t.balance !== '0' || t.symbol === 'OKB'),
      }));
    } catch (error: any) {
      console.error('Failed to refresh balance:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to fetch balance' 
      }));
    }
  }, [state.account]);

  // Load account on mount
  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  // Refresh balance when account changes
  useEffect(() => {
    if (state.account) {
      refreshBalance();
      
      // Set up periodic refresh
      const interval = setInterval(refreshBalance, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [state.account, refreshBalance]);

  return {
    account: state.account,
    balance: state.balance,
    tokens: state.tokens,
    isLoading: state.isLoading,
    error: state.error,
    refreshBalance,
    isConnected: !!state.account,
  };
}