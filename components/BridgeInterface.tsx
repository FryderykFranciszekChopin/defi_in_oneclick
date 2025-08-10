'use client';

import { useState, useEffect } from 'react';
import { getNetwork } from '@/lib/networks/config';
import { crossChainBridge, type BridgeTransaction, type BridgeQuote } from '@/lib/bridge/cross-chain';
import { NetworkSwitcher } from './NetworkSwitcher';
import type { Address } from 'viem';

interface BridgeInterfaceProps {
  userAddress: Address;
  userEmail: string;
  onBridgeComplete?: (tx: BridgeTransaction) => void;
}

export function BridgeInterface({ userAddress, userEmail, onBridgeComplete }: BridgeInterfaceProps) {
  const [fromNetwork, setFromNetwork] = useState('sepolia');
  const [toNetwork, setToNetwork] = useState('xlayer');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTx, setActiveTx] = useState<BridgeTransaction | null>(null);
  const [error, setError] = useState('');

  // Get supported pairs
  const fromConfig = getNetwork(fromNetwork);
  const toConfig = getNetwork(toNetwork);
  const fromToken = fromConfig.tokens.find(t => t.isNative);
  const toToken = toConfig.tokens.find(t => t.isNative);

  // Update quote when inputs change
  useEffect(() => {
    if (amount && fromToken && toToken && parseFloat(amount) > 0) {
      updateQuote();
    } else {
      setQuote(null);
    }
  }, [amount, fromNetwork, toNetwork]);

  const updateQuote = async () => {
    if (!fromToken || !toToken) return;

    try {
      setError('');
      const newQuote = await crossChainBridge.getQuote(
        fromNetwork,
        toNetwork,
        fromToken.symbol,
        toToken.symbol,
        amount
      );
      setQuote(newQuote);
    } catch (err: any) {
      setError(err.message);
      setQuote(null);
    }
  };

  const handleBridge = async () => {
    if (!quote || !fromToken || !toToken) return;

    setIsLoading(true);
    setError('');

    try {
      const bridgeTx = await crossChainBridge.executeBridge(
        fromNetwork,
        toNetwork,
        fromToken.symbol,
        toToken.symbol,
        amount,
        userAddress,
        userEmail
      );

      setActiveTx(bridgeTx);
      
      // Monitor transaction status
      const checkStatus = setInterval(() => {
        const status = crossChainBridge.getBridgeStatus(bridgeTx.id);
        if (status) {
          setActiveTx(status);
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(checkStatus);
            setIsLoading(false);
            
            if (status.status === 'completed') {
              onBridgeComplete?.(status);
              setAmount('');
              setQuote(null);
              // Auto-clear after 10 seconds
              setTimeout(() => setActiveTx(null), 10000);
            }
          }
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const swapNetworks = () => {
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
  };

  const isValidAmount = amount && parseFloat(amount) > 0;
  const canBridge = isValidAmount && quote && !isLoading;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cross-Chain Bridge</h2>
      </div>

      {/* From Network */}
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">From</label>
            <NetworkSwitcher
              currentNetwork={fromNetwork}
              onNetworkChange={setFromNetwork}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full text-2xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              {fromToken?.logoURI ? (
                <img
                  src={fromToken.logoURI}
                  alt={fromToken?.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold"
                style={{ display: fromToken?.logoURI ? 'none' : 'flex' }}
              >
                {fromToken?.symbol?.charAt(0) || 'E'}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {fromToken?.symbol || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center">
          <button
            onClick={swapNetworks}
            disabled={isLoading}
            className="p-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Network */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">To</label>
            <NetworkSwitcher
              currentNetwork={toNetwork}
              onNetworkChange={setToNetwork}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {quote?.toAmount || '0.0'}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              {toToken?.logoURI ? (
                <img
                  src={toToken.logoURI}
                  alt={toToken?.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold"
                style={{ display: toToken?.logoURI ? 'none' : 'flex' }}
              >
                {toToken?.symbol?.charAt(0) || 'O'}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {toToken?.symbol || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  1 {fromToken?.symbol} = {quote.rate} {toToken?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Bridge Fee</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {quote.fees} {fromToken?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Estimated Time</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ~{Math.round(quote.estimatedTime / 60)} min
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="text-red-700 dark:text-red-400 text-sm">{error}</div>
          </div>
        )}

        {/* Active Transaction */}
        {activeTx && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                activeTx.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                activeTx.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                activeTx.status === 'completed' ? 'bg-green-500' :
                'bg-red-500'
              }`}></div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Bridge {activeTx.status}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {activeTx.amount} {activeTx.fromToken} → {activeTx.toToken}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bridge Button */}
        <button
          onClick={handleBridge}
          disabled={!canBridge}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-2xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Processing Bridge...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Bridge {fromToken?.symbol} → {toToken?.symbol}
            </>
          )}
        </button>
      </div>
    </div>
  );
}