'use client';

import { useState } from 'react';
import { NETWORKS, getSupportedNetworks } from '@/lib/networks/config';

interface NetworkSwitcherProps {
  currentNetwork: string;
  onNetworkChange: (networkId: string) => void;
  disabled?: boolean;
}

export function NetworkSwitcher({ currentNetwork, onNetworkChange, disabled }: NetworkSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const networks = getSupportedNetworks();
  const current = NETWORKS[currentNetwork];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getNetworkColor(currentNetwork)}`}></div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {current?.chain.name || 'Unknown Network'}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                Select Network
              </div>
              {networks.map((network) => {
                const networkId = Object.keys(NETWORKS).find(
                  key => NETWORKS[key]?.chain.id === network.chain.id
                ) || '';
                
                return (
                  <button
                    key={networkId}
                    onClick={() => {
                      onNetworkChange(networkId);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      networkId === currentNetwork 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : ''
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${getNetworkColor(networkId)}`}></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {network.chain.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {network.tokens.find(t => t.isNative)?.symbol || 'N/A'} • Chain {network.chain.id}
                      </div>
                    </div>
                    {networkId === currentNetwork && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getNetworkColor(networkId: string): string {
  const colors = {
    sepolia: 'bg-blue-500',
    xlayer: 'bg-orange-500',
  };
  return colors[networkId as keyof typeof colors] || 'bg-gray-500';
}