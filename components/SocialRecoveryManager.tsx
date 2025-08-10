'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';

interface Guardian {
  address: Address;
  name: string;
  email?: string;
}

interface RecoveryConfig {
  guardians: Guardian[];
  threshold: number;
  recoveryDelay: number; // in hours
}

export function SocialRecoveryManager() {
  const { address: userAddress } = useAccount();
  const [recoveryConfig, setRecoveryConfig] = useState<RecoveryConfig | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showSetupForm, setShowSetupForm] = useState(false);
  
  // Form state
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [threshold, setThreshold] = useState(2);
  const [recoveryDelay, setRecoveryDelay] = useState(48); // hours

  useEffect(() => {
    // Load recovery config from localStorage or API
    if (userAddress) {
      const stored = localStorage.getItem(`recovery_config_${userAddress}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRecoveryConfig(parsed);
        } catch (error) {
          console.error('Failed to load recovery config:', error);
        }
      }
    }
  }, [userAddress]);

  const addGuardian = () => {
    if (!newGuardianAddress || !newGuardianName) return;
    
    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(newGuardianAddress)) {
      alert('Invalid address format');
      return;
    }
    
    // Check for duplicates
    if (guardians.some(g => g.address.toLowerCase() === newGuardianAddress.toLowerCase())) {
      alert('Guardian already added');
      return;
    }
    
    setGuardians([
      ...guardians,
      {
        address: newGuardianAddress as Address,
        name: newGuardianName,
      }
    ]);
    
    setNewGuardianAddress('');
    setNewGuardianName('');
  };

  const removeGuardian = (address: Address) => {
    setGuardians(guardians.filter(g => g.address !== address));
  };

  const setupRecovery = async () => {
    if (!userAddress) return;
    if (guardians.length < threshold) {
      alert('Threshold cannot be greater than number of guardians');
      return;
    }
    
    setIsSettingUp(true);
    try {
      // Call API to setup recovery on-chain
      const response = await fetch('/api/recovery/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          guardians: guardians.map(g => g.address),
          threshold,
          recoveryDelay: recoveryDelay * 3600, // Convert to seconds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup recovery');
      }

      const config: RecoveryConfig = {
        guardians,
        threshold,
        recoveryDelay,
      };

      // Save to localStorage
      setRecoveryConfig(config);
      localStorage.setItem(
        `recovery_config_${userAddress}`,
        JSON.stringify(config)
      );

      // Send notifications to guardians (in production)
      await notifyGuardians(guardians, userAddress);

      setShowSetupForm(false);
      setGuardians([]);
      alert('Recovery setup successful! Your guardians have been notified.');
    } catch (error) {
      console.error('Failed to setup recovery:', error);
      alert('Failed to setup recovery');
    } finally {
      setIsSettingUp(false);
    }
  };

  const notifyGuardians = async (guardians: Guardian[], _accountAddress: string) => {
    // In production, send emails or notifications to guardians
    // For now, just log
    console.log('Notifying guardians:', guardians);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Social Recovery
        </h2>
        {!recoveryConfig && (
          <button
            onClick={() => setShowSetupForm(!showSetupForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {showSetupForm ? 'Cancel' : 'Setup Recovery'}
          </button>
        )}
      </div>

      {recoveryConfig ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Recovery Configured
            </h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Threshold:</span> {recoveryConfig.threshold} of {recoveryConfig.guardians.length} guardians
              </div>
              <div>
                <span className="font-medium">Recovery Delay:</span> {recoveryConfig.recoveryDelay} hours
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Guardians</h3>
            <div className="space-y-2">
              {recoveryConfig.guardians.map((guardian) => (
                <div
                  key={guardian.address}
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <div className="font-medium">{guardian.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {guardian.address.slice(0, 6)}...{guardian.address.slice(-4)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setRecoveryConfig(null);
              localStorage.removeItem(`recovery_config_${userAddress}`);
              setShowSetupForm(true);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Reset Recovery Settings
          </button>
        </div>
      ) : showSetupForm ? (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Add Guardians</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={newGuardianName}
                onChange={(e) => setNewGuardianName(e.target.value)}
                placeholder="Guardian name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newGuardianAddress}
                onChange={(e) => setNewGuardianAddress(e.target.value)}
                placeholder="Guardian address (0x...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addGuardian}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Guardian
              </button>
            </div>
          </div>

          {guardians.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Selected Guardians</h4>
              <div className="space-y-2">
                {guardians.map((guardian) => (
                  <div
                    key={guardian.address}
                    className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div>
                      <div className="font-medium">{guardian.name}</div>
                      <div className="text-xs text-gray-500">
                        {guardian.address.slice(0, 10)}...
                      </div>
                    </div>
                    <button
                      onClick={() => removeGuardian(guardian.address)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guardians.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Recovery Threshold
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  min="1"
                  max={guardians.length}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of guardians required to approve recovery
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Recovery Delay (hours)
                </label>
                <input
                  type="number"
                  value={recoveryDelay}
                  onChange={(e) => setRecoveryDelay(Number(e.target.value))}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time to wait after approval before recovery can be executed
                </p>
              </div>

              <button
                onClick={setupRecovery}
                disabled={isSettingUp || guardians.length < threshold}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isSettingUp ? 'Setting up...' : 'Setup Recovery'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-4">No recovery method configured</p>
          <p className="text-sm">
            Set up social recovery to protect your account in case you lose access to your passkey
          </p>
        </div>
      )}
    </div>
  );
}