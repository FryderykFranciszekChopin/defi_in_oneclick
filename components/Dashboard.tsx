'use client';

import { useState, useEffect } from 'react';
import { BridgeInterface } from './BridgeInterface';
import { NetworkSwitcher } from './NetworkSwitcher';
import { formatAddress } from '@/lib/utils';
import { signOut } from 'next-auth/react';
// import { useMultiChainAccount } from '@/hooks/useMultiChainAccount';
import { Skeleton } from './SkeletonLoader';
import { useTheme } from './ThemeProvider';
import { type Token } from '@/lib/tokens';
import { createMultiChainAccount } from '@/lib/smart-account/multichain';
import { NETWORKS, DEFAULT_NETWORK } from '@/lib/networks/config';
import type { Address } from 'viem';
import { useMultiChainBalances } from '@/hooks/useMultiChainBalances';

interface DashboardProps {
  account: any;
}

export function Dashboard({ account: initialAccount }: DashboardProps) {
  const { theme, toggleTheme, mounted } = useTheme();
  const [currentNetwork, setCurrentNetwork] = useState(DEFAULT_NETWORK);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [txHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bridge' | 'portfolio' | 'history'>('bridge');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Fetch multi-chain balances
  const { balances: multiChainBalances, isLoading: balancesLoading, refreshBalances } = useMultiChainBalances(
    initialAccount?.address as Address
  );
  
  // Aggregate all tokens from all chains
  useEffect(() => {
    if (multiChainBalances.length > 0) {
      const allTokens: Token[] = [];
      
      multiChainBalances.forEach(chainBalance => {
        chainBalance.tokens.forEach(token => {
          allTokens.push({
            ...token,
            networkName: chainBalance.networkName,
            networkId: chainBalance.networkId,
          });
        });
      });
      
      setTokens(allTokens);
      setIsLoading(false);
      setInitialLoadComplete(true);
    } else if (!balancesLoading) {
      // Set default tokens if no balances
      const networkConfig = NETWORKS[currentNetwork];
      if (networkConfig) {
        const defaultTokens = networkConfig.tokens.map(token => ({
          ...token,
          balance: '0.00',
          value: '0.00',
          chainId: networkConfig.chain.id,
          networkName: networkConfig.name,
          networkId: currentNetwork,
        }));
        setTokens(defaultTokens);
      }
      setIsLoading(false);
      setInitialLoadComplete(true);
    }
  }, [multiChainBalances, balancesLoading, currentNetwork]);

  const handleLogout = async () => {
    // Don't clear the passkey - keep it for next login on same device
    // Only clear the session
    await signOut({ 
      redirect: true,
      callbackUrl: '/'
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Always use the initial account address - no address switching!
  const displayAccount = initialAccount;
  
  // Validate that we have a proper account
  if (!initialAccount || !initialAccount.email || !initialAccount.address) {
    if (!isLoading) {
      handleLogout();
    }
    return null;
  }

  // Calculate total balance across all chains
  const totalBalance = multiChainBalances.reduce((sum, chain) => {
    return sum + parseFloat(chain.totalValue || '0');
  }, 0).toFixed(2);

  // Show loading screen while initial data is being fetched
  if (!initialLoadComplete || (isLoading && tokens.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            {/* Animated loading spinner */}
            <div className="w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
            </div>
            
            {/* Loading text */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Your Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Fetching balances from multiple networks...
            </p>
            
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 dark:from-blue-400/10 dark:to-purple-400/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 text-transparent bg-clip-text animate-gradient">
                OneClick DeFi
              </h1>
              <NetworkSwitcher
                currentNetwork={currentNetwork}
                onNetworkChange={setCurrentNetwork}
                disabled={false}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => copyToClipboard(displayAccount.address)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-800/30 dark:hover:to-green-800/30 transition-all cursor-pointer group"
                title="Click to copy wallet address"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">
                  {formatAddress(displayAccount.address)}
                </span>
                <svg 
                  className={`w-4 h-4 transition-all ${copySuccess ? 'text-green-500' : 'text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {copySuccess ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
              </button>

              {/* Mobile wallet address copy button */}
              <button
                onClick={() => copyToClipboard(displayAccount.address)}
                className="sm:hidden p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-all shadow-lg border border-emerald-200 dark:border-emerald-700"
                title="Copy wallet address"
              >
                <svg 
                  className={`w-5 h-5 transition-all ${copySuccess ? 'text-green-500' : 'text-emerald-600 dark:text-emerald-400'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {copySuccess ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
              
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-lg border border-gray-200 dark:border-gray-700"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? (
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                      />
                    </svg>
                  )}
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <nav className="flex space-x-1 bg-gradient-to-r from-gray-100/80 to-gray-50/80 dark:from-gray-800/80 dark:to-gray-900/80 p-1 rounded-2xl backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          {(['bridge', 'portfolio', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              {tab === 'bridge' && '🌉 '}
              {tab === 'portfolio' && '💼 '}
              {tab === 'history' && '📈 '}
              {tab === 'bridge' ? 'Cross-Chain Bridge' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Account Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Balance Card */}
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-6 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <h2 className="text-lg font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  Total Balance
                </h2>
                
                {isLoading ? (
                  <Skeleton width="100%" height={40} className="mb-2" />
                ) : (
                  <div className="text-4xl font-black text-white mb-2">
                    ${totalBalance}
                  </div>
                )}
                
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/30 rounded-full blur-2xl"></div>
            </div>

            {/* Token List */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-all">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                Your Tokens
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                  All Networks
                </span>
              </h3>
              <div className="space-y-3">
                {tokens?.map((token: any, index: number) => (
                  <div key={`${token.networkId}-${token.symbol}-${index}`} className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 rounded-2xl transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform overflow-hidden bg-white dark:bg-gray-800">
                        {token.logoURI ? (
                          <img 
                            src={token.logoURI} 
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to first letter if image fails
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.className = 'w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md group-hover:scale-110 transition-transform';
                                parent.innerHTML = token.symbol[0];
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {token.symbol[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{token.symbol}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {token.name} • {(token as any).networkName || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{token.balance}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">${token.value || '0.00'}</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No tokens yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start swapping to see your tokens</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - Main Interface */}
          <div className="lg:col-span-2">
            {activeTab === 'bridge' && displayAccount.address && initialAccount.email && (
              <BridgeInterface 
                userAddress={displayAccount.address as Address}
                userEmail={initialAccount.email}
                onBridgeComplete={(tx) => {
                  console.log('Bridge completed:', tx);
                  // Refresh balances after bridge completes
                  setTimeout(() => {
                    refreshBalances();
                  }, 3000); // Wait 3 seconds for transaction to be confirmed
                }}
              />
            )}

            {activeTab === 'portfolio' && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Portfolio Overview</h2>
                
                {/* Wallet Info Section */}
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Multi-Chain Wallets</h3>
                  
                  <div className="space-y-4">
                    {multiChainBalances.length > 0 ? (
                      multiChainBalances.map((chainBalance) => (
                        <div key={chainBalance.networkId} className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                chainBalance.networkId === 'sepolia' ? 'bg-blue-500' : 'bg-orange-500'
                              }`}></div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {chainBalance.networkName}
                              </h4>
                            </div>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              ${chainBalance.totalValue}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                              {displayAccount.address}
                            </p>
                            <button
                              onClick={() => copyToClipboard(displayAccount.address)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-2"
                              title="Copy address"
                            >
                              <svg className={`w-3.5 h-3.5 ${copySuccess ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {copySuccess ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                )}
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Wallet Address</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{displayAccount.address}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(displayAccount.address)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy address"
                        >
                          <svg className={`w-4 h-4 ${copySuccess ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {copySuccess ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            )}
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`https://sepolia-faucet.pk910.de/?address=${displayAccount.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all hover:scale-[1.02]"
                      >
                        🚰 Get Test ETH
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <a
                        href={`https://sepolia.etherscan.io/address/${displayAccount.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all hover:scale-[1.02]"
                      >
                        📊 View on Explorer
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  {tokens && tokens.length > 0 ? (
                    <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">Portfolio visualization will appear here</span>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No portfolio data</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add tokens to see your portfolio</p>
                    </div>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">${totalBalance}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assets</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{tokens?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Transaction History</h2>
                <div className="space-y-4">
                  {txHistory.length > 0 ? (
                    txHistory.map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'swap' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {tx.type === 'swap' ? '🔄' : '📤'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{tx.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{tx.time}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">{tx.amount}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{tx.status}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Your transaction history will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Copy Success Toast */}
      {copySuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Wallet address copied!</span>
          </div>
        </div>
      )}

      {/* Get Test ETH Button */}
      <div className="fixed bottom-20 right-6">
        <a
          href={`https://sepolia-faucet.pk910.de/?address=${displayAccount.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-auto px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-full shadow-lg text-sm font-medium transition-all hover:scale-105 whitespace-nowrap"
        >
          🚰 Get Test ETH
        </a>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 transition-all">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  );
}