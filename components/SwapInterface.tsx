'use client';

import { useState } from 'react';
import { formatUnits, parseUnits, type Hex } from 'viem';
import { useAccount } from '@/hooks/useAccount';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { createSwapUserOp } from '@/lib/smart-account/operations';
import { executeGaslessOperation, waitForTransaction } from '@/lib/gasless/execute';
import { getStoredPasskey } from '@/lib/passkey-client';
import type { Token } from '@/types';

// XLayer tokens with CDN-hosted logos
const XLAYER_TOKENS: Token[] = [
  { 
    symbol: 'OKB', 
    address: '0x0000000000000000000000000000000000000000', 
    decimals: 18, 
    name: 'OKB', 
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0x75231F58b43240C9718Dd58B4967c5114342a86c/logo.png', 
    chainId: '196' 
  },
  { 
    symbol: 'USDT', 
    address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d', 
    decimals: 6, 
    name: 'Tether USD', 
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png', 
    chainId: '196' 
  },
  { 
    symbol: 'USDC', 
    address: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035', 
    decimals: 6, 
    name: 'USD Coin', 
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png', 
    chainId: '196' 
  },
  { 
    symbol: 'WETH', 
    address: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c', 
    decimals: 18, 
    name: 'Wrapped Ether', 
    logoURI: 'https://cdn.jsdelivr.net/gh/Uniswap/assets@master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png', 
    chainId: '196' 
  },
];

interface SwapInterfaceProps {
  account: any;
}

export function SwapInterface({ account: initialAccount }: SwapInterfaceProps) {
  const { account, refreshBalance } = useAccount();
  const { trackUserOperation } = useTransactionHistory(account?.address);
  const [fromToken, setFromToken] = useState<Token | undefined>(XLAYER_TOKENS[1]); // USDT
  const [toToken, setToToken] = useState<Token | undefined>(XLAYER_TOKENS[0]); // OKB
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const displayAccount = account || initialAccount;

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0 || !fromToken || !toToken) return;

    setError(null);
    try {
      const response = await fetch('/api/okx/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: '196', // XLayer
          fromTokenAddress: fromToken.address,
          toTokenAddress: toToken.address,
          amount: parseUnits(amount, fromToken.decimals).toString(),
          slippage: '0.5', // 0.5%
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get quote');
      }

      const data = await response.json();
      
      if (data.code !== '0' || !data.data?.[0]) {
        throw new Error(data.msg || 'No quote available');
      }

      setQuote(data.data[0]);
    } catch (error: any) {
      console.error('Failed to get quote:', error);
      setError(error.message || 'Failed to get quote');
    }
  };

  const handleSwap = async () => {
    if (!quote || !displayAccount || !fromToken || !toToken) return;

    const passkey = getStoredPasskey();
    if (!passkey) {
      setError('No passkey found. Please login again.');
      return;
    }

    setIsSwapping(true);
    setError(null);
    
    try {
      // Create UserOperation for swap
      const userOp = createSwapUserOp(
        displayAccount,
        {
          fromToken: fromToken.address as Hex,
          toToken: toToken.address as Hex,
          amount: parseUnits(amount, fromToken.decimals),
          minAmount: BigInt(quote.toTokenAmount),
          recipient: displayAccount.address,
          data: quote.data as Hex,
        },
        BigInt(displayAccount.nonce || 0)
      );

      console.log('Executing gasless swap...');
      
      // Execute gasless operation
      const opHash = await executeGaslessOperation({
        account: displayAccount,
        userOp,
        passkeyId: passkey.id,
      });

      // Track the transaction
      await trackUserOperation(opHash, {
        type: 'swap',
        tokenIn: {
          symbol: fromToken.symbol,
          amount: amount,
        },
        tokenOut: {
          symbol: toToken.symbol,
          amount: formatUnits(BigInt(quote.toTokenAmount), toToken.decimals),
        },
      });

      // Show success message
      alert(`Swap submitted! Transaction: ${opHash}`);
      
      // Wait for confirmation
      console.log('Waiting for confirmation...');
      const receipt = await waitForTransaction(opHash);
      
      if (receipt.success) {
        alert('Swap completed successfully!');
        setAmount('');
        setQuote(null);
        
        // Refresh balance
        await refreshBalance();
      } else {
        throw new Error('Swap failed on-chain');
      }
    } catch (error: any) {
      console.error('Swap failed:', error);
      setError(error.message || 'Swap failed. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* From Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          You Pay
        </label>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="flex gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setQuote(null);
              }}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              disabled={isSwapping}
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              {fromToken && (
                <img src={fromToken.logoURI} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
              )}
              <select
                value={fromToken?.symbol}
                onChange={(e) => {
                  setFromToken(XLAYER_TOKENS.find(t => t.symbol === e.target.value));
                  setQuote(null);
                }}
                className="bg-transparent text-gray-900 dark:text-white font-medium outline-none cursor-pointer"
                disabled={isSwapping}
              >
                {XLAYER_TOKENS.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center -my-2">
        <button
          onClick={() => {
            setFromToken(toToken);
            setToToken(fromToken);
            setQuote(null);
          }}
          className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:scale-110 shadow-lg"
          disabled={isSwapping}
          aria-label="Swap tokens"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          You Receive
        </label>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <input
              type="text"
              value={quote ? formatUnits(BigInt(quote.toTokenAmount), toToken?.decimals || 18) : ''}
              readOnly
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              {toToken && (
                <img src={toToken.logoURI} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
              )}
              <select
                value={toToken?.symbol}
                onChange={(e) => {
                  setToToken(XLAYER_TOKENS.find(t => t.symbol === e.target.value));
                  setQuote(null);
                }}
                className="bg-transparent text-gray-900 dark:text-white font-medium outline-none cursor-pointer"
                disabled={isSwapping}
              >
                {XLAYER_TOKENS.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Info */}
      {quote && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                1 {fromToken?.symbol} = {(parseFloat(formatUnits(BigInt(quote.toTokenAmount), toToken?.decimals || 18)) / parseFloat(amount)).toFixed(4)} {toToken?.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Router</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{quote.routerName || 'OKX DEX'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network Fee</span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                $0.00 (Sponsored)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!quote ? (
          <button
            onClick={handleGetQuote}
            disabled={!amount || parseFloat(amount) <= 0 || isSwapping}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            Get Quote
          </button>
        ) : (
          <>
            <button
              onClick={handleSwap}
              disabled={isSwapping}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-2xl font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg"
            >
              {isSwapping ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Swapping...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Swap Now
                </>
              )}
            </button>
            <button
              onClick={() => {
                setQuote(null);
                setAmount('');
              }}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium py-2 transition-colors"
              disabled={isSwapping}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Features */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Best Rates</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Zero Gas Fees</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>60+ Chains</span>
        </div>
      </div>
    </div>
  );
}