'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther, type Address, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

interface SessionKey {
  address: Address;
  privateKey: Hex;
  validUntil: number;
  spendingLimit: bigint;
  spentAmount: bigint;
  allowedTargets: Address[];
  allowedFunctions: string[];
  createdAt: number;
}

export function SessionKeyManager() {
  const { address: userAddress } = useAccount();
  const [sessionKeys, setSessionKeys] = useState<SessionKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [validityHours, setValidityHours] = useState(24);
  const [spendingLimit, setSpendingLimit] = useState('0.1');
  const [allowedTarget, setAllowedTarget] = useState('');

  useEffect(() => {
    // Load session keys from localStorage
    if (userAddress) {
      const stored = localStorage.getItem(`session_keys_${userAddress}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSessionKeys(parsed.map((key: any) => ({
            ...key,
            spendingLimit: BigInt(key.spendingLimit),
            spentAmount: BigInt(key.spentAmount || 0),
          })));
        } catch (error) {
          console.error('Failed to load session keys:', error);
        }
      }
    }
  }, [userAddress]);

  const createSessionKey = async () => {
    if (!userAddress) return;
    
    setIsCreating(true);
    try {
      // Generate a new session key
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      
      const validUntil = Math.floor(Date.now() / 1000) + (validityHours * 3600);
      const limit = parseEther(spendingLimit);
      
      const newSessionKey: SessionKey = {
        address: account.address,
        privateKey,
        validUntil,
        spendingLimit: limit,
        spentAmount: 0n,
        allowedTargets: allowedTarget ? [allowedTarget as Address] : [],
        allowedFunctions: [], // Could be expanded to include specific function selectors
        createdAt: Math.floor(Date.now() / 1000),
      };

      // Register with smart contract
      const response = await fetch('/api/session-key/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          sessionKeyAddress: account.address,
          validUntil,
          spendingLimit: limit.toString(),
          allowedTargets: newSessionKey.allowedTargets,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register session key');
      }

      // Save to localStorage
      const updatedKeys = [...sessionKeys, newSessionKey];
      setSessionKeys(updatedKeys);
      localStorage.setItem(
        `session_keys_${userAddress}`,
        JSON.stringify(updatedKeys.map(key => ({
          ...key,
          spendingLimit: key.spendingLimit.toString(),
          spentAmount: key.spentAmount.toString(),
        })))
      );

      setShowCreateForm(false);
      setSpendingLimit('0.1');
      setValidityHours(24);
      setAllowedTarget('');
    } catch (error) {
      console.error('Failed to create session key:', error);
      alert('Failed to create session key');
    } finally {
      setIsCreating(false);
    }
  };

  const revokeSessionKey = async (keyAddress: Address) => {
    if (!userAddress) return;
    
    try {
      const response = await fetch('/api/session-key/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          sessionKeyAddress: keyAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session key');
      }

      // Remove from localStorage
      const updatedKeys = sessionKeys.filter(key => key.address !== keyAddress);
      setSessionKeys(updatedKeys);
      localStorage.setItem(
        `session_keys_${userAddress}`,
        JSON.stringify(updatedKeys.map(key => ({
          ...key,
          spendingLimit: key.spendingLimit.toString(),
          spentAmount: key.spentAmount.toString(),
        })))
      );
    } catch (error) {
      console.error('Failed to revoke session key:', error);
      alert('Failed to revoke session key');
    }
  };

  const isExpired = (validUntil: number) => {
    return validUntil < Math.floor(Date.now() / 1000);
  };

  const formatTimeRemaining = (validUntil: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = validUntil - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Session Keys
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create New'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Create Session Key</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Validity Period (hours)
              </label>
              <input
                type="number"
                value={validityHours}
                onChange={(e) => setValidityHours(Number(e.target.value))}
                min="1"
                max="168"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Spending Limit (ETH)
              </label>
              <input
                type="text"
                value={spendingLimit}
                onChange={(e) => setSpendingLimit(e.target.value)}
                placeholder="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Allowed Target Contract (optional)
              </label>
              <input
                type="text"
                value={allowedTarget}
                onChange={(e) => setAllowedTarget(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={createSessionKey}
              disabled={isCreating}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Session Key'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sessionKeys.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No session keys created yet
          </p>
        ) : (
          sessionKeys.map((key) => (
            <div
              key={key.address}
              className={`p-4 border rounded-lg ${
                isExpired(key.validUntil)
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-mono text-sm mb-2">
                    {key.address.slice(0, 6)}...{key.address.slice(-4)}
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>
                      Status: {isExpired(key.validUntil) ? (
                        <span className="text-red-500">Expired</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </div>
                    <div>{formatTimeRemaining(key.validUntil)}</div>
                    <div>
                      Spent: {formatEther(key.spentAmount)} / {formatEther(key.spendingLimit)} ETH
                    </div>
                    {key.allowedTargets.length > 0 && (
                      <div>
                        Target: {key.allowedTargets[0]?.slice(0, 6)}...{key.allowedTargets[0]?.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => revokeSessionKey(key.address)}
                  className="ml-4 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}