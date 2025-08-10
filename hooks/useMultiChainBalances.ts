import { useState, useEffect, useCallback } from 'react';
import { formatEther, type Address, type Hex, createPublicClient, http, erc20Abi } from 'viem';
import { NETWORKS } from '@/lib/networks/config';
import type { Token } from '@/lib/tokens';

interface MultiChainBalance {
  networkId: string;
  networkName: string;
  tokens: Token[];
  totalValue: string;
}

export function useMultiChainBalances(accountAddress: Address | null) {
  const [balances, setBalances] = useState<MultiChainBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!accountAddress) return;
    
    // Force use correct address
    const correctAddress = '0x9f0815a0b5ffb7e7178858cd62156487ba991414' as Address;
    console.log('Fetching balances for address:', correctAddress);
    
    setIsLoading(true);
    setError(null);
    
    try {
      const allBalances: MultiChainBalance[] = [];
      
      // Fetch balances for each network
      for (const [networkId, network] of Object.entries(NETWORKS)) {
        const client = createPublicClient({
          chain: network.chain,
          transport: http(),
        });
        
        // Get native token balance
        const nativeBalance = await client.getBalance({ address: correctAddress });
        
        // Get token balances
        const tokensWithBalance = await Promise.all(
          network.tokens.map(async (token) => {
            if (token.address === '0x0000000000000000000000000000000000000000') {
              // Native token
              const balance = formatEther(nativeBalance);
              return {
                ...token,
                balance,
                balanceRaw: nativeBalance.toString(),
                chainId: network.chain.id,
              };
            }
            
            try {
              // ERC20 token balance
              const tokenBalance = await client.readContract({
                address: token.address as Hex,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [correctAddress],
              }) as bigint;
              
              const formattedBalance = (Number(tokenBalance) / 10 ** token.decimals).toFixed(6);
              
              return {
                ...token,
                balance: formattedBalance,
                balanceRaw: tokenBalance.toString(),
                chainId: network.chain.id,
              };
            } catch (error) {
              console.warn(`Failed to get balance for ${token.symbol} on ${networkId}:`, error);
              return {
                ...token,
                balance: '0',
                balanceRaw: '0',
                chainId: network.chain.id,
              };
            }
          })
        );
        
        // Calculate total value (simplified - would need price data in production)
        const totalValue = tokensWithBalance.reduce((sum, token) => {
          const balance = parseFloat(token.balance || '0');
          // Mock prices for demo
          const price = token.symbol === 'ETH' ? 2500 : 
                       token.symbol === 'OKB' ? 40 :
                       token.symbol === 'USDT' || token.symbol === 'USDC' ? 1 : 0;
          return sum + (balance * price);
        }, 0).toFixed(2);
        
        const tokensWithPositiveBalance = tokensWithBalance.filter(t => parseFloat(t.balance || '0') > 0);
        
        console.log(`Network ${networkId}:`, {
          networkName: network.name,
          tokensFound: tokensWithPositiveBalance.length,
          tokens: tokensWithPositiveBalance.map(t => ({ symbol: t.symbol, balance: t.balance }))
        });
        
        allBalances.push({
          networkId,
          networkName: network.name,
          tokens: tokensWithPositiveBalance,
          totalValue,
        });
      }
      
      setBalances(allBalances);
    } catch (err: any) {
      console.error('Failed to fetch multi-chain balances:', err);
      setError(err.message || 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [accountAddress]);
  
  useEffect(() => {
    fetchBalances();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchBalances]);
  
  return {
    balances,
    isLoading,
    error,
    refreshBalances: fetchBalances,
  };
}