import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, type Hex, type Log } from 'viem';
import { xlayer } from '../lib/smart-account/factory';
import type { UserOperationReceipt } from '../lib/gasless/bundler';

export interface Transaction {
  hash: Hex;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  type: 'swap' | 'transfer' | 'deployment';
  tokenIn?: {
    symbol: string;
    amount: string;
  };
  tokenOut?: {
    symbol: string;
    amount: string;
  };
  gasUsed?: string;
  gasCost?: string;
}

const TRANSACTION_STORAGE_KEY = 'oneclick_defi_transactions';

export function useTransactionHistory(accountAddress?: Hex) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load transactions from localStorage
  const loadStoredTransactions = useCallback(() => {
    if (!accountAddress) return;
    
    try {
      const key = `${TRANSACTION_STORAGE_KEY}_${accountAddress}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTransactions(parsed);
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    }
  }, [accountAddress]);

  // Save transactions to localStorage
  const saveTransactions = useCallback((txs: Transaction[]) => {
    if (!accountAddress) return;
    
    try {
      const key = `${TRANSACTION_STORAGE_KEY}_${accountAddress}`;
      localStorage.setItem(key, JSON.stringify(txs));
    } catch (error) {
      console.error('Failed to save transaction history:', error);
    }
  }, [accountAddress]);

  // Add a new transaction
  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => {
      const updated = [tx, ...prev].slice(0, 50); // Keep last 50 transactions
      saveTransactions(updated);
      return updated;
    });
  }, [saveTransactions]);

  // Update transaction status
  const updateTransaction = useCallback((hash: Hex, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const updated = prev.map(tx => 
        tx.hash === hash ? { ...tx, ...updates } : tx
      );
      saveTransactions(updated);
      return updated;
    });
  }, [saveTransactions]);

  // Track a UserOperation
  const trackUserOperation = useCallback(async (
    opHash: Hex,
    details: {
      type: 'swap' | 'transfer';
      tokenIn?: { symbol: string; amount: string };
      tokenOut?: { symbol: string; amount: string };
    }
  ) => {
    // Add pending transaction
    const pendingTx: Transaction = {
      hash: opHash,
      from: accountAddress || '0x',
      to: details.tokenOut ? 'OKX DEX' : '0x',
      value: '0',
      timestamp: Date.now(),
      status: 'pending',
      type: details.type,
      tokenIn: details.tokenIn,
      tokenOut: details.tokenOut,
    };
    
    addTransaction(pendingTx);

    // Poll for completion
    try {
      const bundler = await import('../lib/gasless/bundler').then(m => new m.BundlerClient());
      const receipt = await bundler.waitForUserOperationReceipt(opHash, 120000); // 2 min timeout
      
      if (receipt) {
        updateTransaction(opHash, {
          status: receipt.success ? 'success' : 'failed',
          gasUsed: receipt.actualGasUsed.toString(),
          gasCost: receipt.actualGasCost.toString(),
          hash: receipt.receipt.transactionHash, // Update to real tx hash
        });
      }
    } catch (error) {
      console.error('Failed to track transaction:', error);
      updateTransaction(opHash, { status: 'failed' });
    }
  }, [accountAddress, addTransaction, updateTransaction]);

  // Fetch on-chain transaction history
  const fetchOnChainHistory = useCallback(async () => {
    if (!accountAddress) return;
    
    setIsLoading(true);
    try {
      const client = createPublicClient({
        chain: xlayer,
        transport: http(),
      });

      // Get recent blocks
      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestBlock > 1000n ? latestBlock - 1000n : 0n;

      // Get logs for the account (sent transactions)
      const logs = await client.getLogs({
        address: accountAddress,
        fromBlock,
        toBlock: latestBlock,
      });

      // Process logs into transactions
      const onChainTxs = await Promise.all(
        logs.slice(0, 20).map(async (log) => {
          try {
            const tx = await client.getTransaction({ hash: log.transactionHash });
            const block = await client.getBlock({ blockHash: log.blockHash });
            
            return {
              hash: tx.hash,
              from: tx.from,
              to: tx.to || '0x',
              value: tx.value.toString(),
              timestamp: Number(block.timestamp) * 1000,
              status: 'success' as const,
              type: 'transfer' as const,
              gasUsed: tx.gas.toString(),
            };
          } catch (error) {
            console.error('Failed to fetch transaction details:', error);
            return null;
          }
        })
      );

      // Merge with stored transactions
      const validTxs = onChainTxs.filter((tx): tx is Transaction => tx !== null);
      if (validTxs.length > 0) {
        setTransactions(prev => {
          // Deduplicate by hash
          const existingHashes = new Set(prev.map(tx => tx.hash));
          const newTxs = validTxs.filter(tx => !existingHashes.has(tx.hash));
          return [...prev, ...newTxs].sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    } catch (error) {
      console.error('Failed to fetch on-chain history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accountAddress]);

  // Load stored transactions on mount
  useEffect(() => {
    loadStoredTransactions();
  }, [loadStoredTransactions]);

  // Fetch on-chain history periodically
  useEffect(() => {
    if (accountAddress) {
      fetchOnChainHistory();
      const interval = setInterval(fetchOnChainHistory, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [accountAddress, fetchOnChainHistory]);

  return {
    transactions,
    isLoading,
    addTransaction,
    updateTransaction,
    trackUserOperation,
    refreshHistory: fetchOnChainHistory,
  };
}