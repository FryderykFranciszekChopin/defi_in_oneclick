'use client';

import { useState } from 'react';
// import { parseUnits } from 'viem';
// Mock implementations for demo (commented out for now)
/*
const XLAYER_TOKENS = [
  { symbol: 'OKB', address: '0x0000000000000000000000000000000000000000', decimals: 18, name: 'OKB' },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, name: 'USD Coin' },
];
*/

interface AdvancedSwapInterfaceProps {
  account: any;
}

export function AdvancedSwapInterface({ account: _ }: AdvancedSwapInterfaceProps) {
  const [sessionKeyEnabled, setSessionKeyEnabled] = useState(false);
  const [crossChainMode, setCrossChainMode] = useState(false);
  const [mevProtection, setMevProtection] = useState(true);
  const [fromChain, setFromChain] = useState(196); // XLayer
  const [toChain, setToChain] = useState(196);
  const [isCreatingSessionKey, setIsCreatingSessionKey] = useState(false);

  // Mock objects removed for demo

  const chains = [
    { id: 196, name: 'X Layer' },
    { id: 1, name: 'Ethereum' },
    { id: 56, name: 'BSC' },
    { id: 137, name: 'Polygon' },
    { id: 42161, name: 'Arbitrum' },
  ];

  const handleCreateSessionKey = async () => {
    setIsCreatingSessionKey(true);
    try {
      // Mock session key creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert(`Session key created! Valid for 24 hours with $1000 limit.`);
      setSessionKeyEnabled(true);
    } catch (error) {
      console.error('Failed to create session key:', error);
      alert('Failed to create session key');
    } finally {
      setIsCreatingSessionKey(false);
    }
  };

  const getMEVRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Advanced Swap</h2>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            Pro Mode
          </span>
        </div>
      </div>

      {/* Advanced Features Toggle */}
      <div className="mb-6 space-y-3">
        {/* Session Keys */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={sessionKeyEnabled}
              onChange={(e) => {
                if (e.target.checked && !sessionKeyEnabled) {
                  handleCreateSessionKey();
                } else {
                  setSessionKeyEnabled(e.target.checked);
                }
              }}
              className="w-4 h-4 text-blue-600"
              disabled={isCreatingSessionKey}
            />
            <div>
              <label className="font-medium text-sm">Session Keys</label>
              <p className="text-xs text-gray-600">Auto-approve swaps up to daily limit</p>
            </div>
          </div>
          {sessionKeyEnabled && (
            <span className="text-xs text-green-600">Active (24h)</span>
          )}
        </div>

        {/* Cross-chain Mode */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={crossChainMode}
              onChange={(e) => setCrossChainMode(e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <div>
              <label className="font-medium text-sm">Cross-Chain Swap</label>
              <p className="text-xs text-gray-600">Swap across different blockchains</p>
            </div>
          </div>
        </div>

        {/* MEV Protection */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={mevProtection}
              onChange={(e) => setMevProtection(e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <div>
              <label className="font-medium text-sm">MEV Protection</label>
              <p className="text-xs text-gray-600">Prevent sandwich attacks</p>
            </div>
          </div>
          {mevProtection && (
            <span className="text-xs text-green-600">Protected</span>
          )}
        </div>
      </div>

      {/* Chain Selection (if cross-chain enabled) */}
      {crossChainMode && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Chain
            </label>
            <select
              value={fromChain}
              onChange={(e) => setFromChain(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Chain
            </label>
            <select
              value={toChain}
              onChange={(e) => setToChain(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Advanced Stats */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-sm mb-2">Advanced Analytics</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">MEV Risk:</span>
            <span className={`ml-2 font-medium ${getMEVRiskColor('low')}`}>
              Low
            </span>
          </div>
          <div>
            <span className="text-gray-600">Route Efficiency:</span>
            <span className="ml-2 font-medium text-green-600">98.5%</span>
          </div>
          <div>
            <span className="text-gray-600">Execution Mode:</span>
            <span className="ml-2 font-medium">
              {mevProtection ? 'Private' : 'Public'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Session Key:</span>
            <span className="ml-2 font-medium">
              {sessionKeyEnabled ? 'Active' : 'Manual'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Advanced features showcase • Session keys reduce signing • MEV protection active
      </div>
    </div>
  );
}