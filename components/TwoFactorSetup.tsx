'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import { parseEther } from 'viem';

interface TwoFactorConfig {
  enabled: boolean;
  threshold: string; // ETH amount as string
  secret?: string; // Only stored temporarily during setup
}

export function TwoFactorSetup() {
  const { address: userAddress } = useAccount();
  const [config, setConfig] = useState<TwoFactorConfig | null>(null);
  // const [, setIsSettingUp] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [threshold, setThreshold] = useState('1.0');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Load 2FA config from localStorage
    if (userAddress) {
      const stored = localStorage.getItem(`2fa_config_${userAddress}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConfig(parsed);
        } catch (error) {
          console.error('Failed to load 2FA config:', error);
        }
      }
    }
  }, [userAddress]);

  const generateSecret = async () => {
    // Generate a new secret
    const secretObj = speakeasy.generateSecret({
      name: `OneClick DeFi (${userAddress?.slice(0, 6)}...${userAddress?.slice(-4)})`,
      issuer: 'OneClick DeFi',
      length: 32,
    });

    setSecret(secretObj.base32);

    // Generate QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secretObj.base32,
      label: `OneClick DeFi`,
      issuer: 'OneClick DeFi',
      encoding: 'base32',
    });

    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    setQrCodeUrl(qrDataUrl);
    setShowSetup(true);
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: verificationCode,
        window: 2,
      });

      if (!verified) {
        alert('Invalid verification code. Please try again.');
        return;
      }

      // Hash the secret for storage on-chain
      const encoder = new TextEncoder();
      const data = encoder.encode(secret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Call API to enable 2FA on-chain
      const response = await fetch('/api/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          secretHash: hashHex,
          threshold: parseEther(threshold).toString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enable 2FA');
      }

      // Save config to localStorage (without the secret!)
      const newConfig: TwoFactorConfig = {
        enabled: true,
        threshold,
      };
      
      setConfig(newConfig);
      localStorage.setItem(`2fa_config_${userAddress}`, JSON.stringify(newConfig));
      
      // Store secret securely (in production, this would be handled differently)
      // For demo purposes, we'll encrypt it with a user-specific key
      const encryptedSecret = btoa(secret); // Simple encoding for demo
      localStorage.setItem(`2fa_secret_${userAddress}`, encryptedSecret);

      setShowSetup(false);
      setQrCodeUrl('');
      setSecret('');
      setVerificationCode('');
      
      alert('2FA has been successfully enabled!');
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      alert('Failed to enable 2FA');
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = async () => {
    const code = prompt('Enter your 2FA code to disable:');
    if (!code || code.length !== 6) return;

    try {
      // Get stored secret
      const encryptedSecret = localStorage.getItem(`2fa_secret_${userAddress}`);
      if (!encryptedSecret) {
        alert('2FA secret not found');
        return;
      }
      
      const storedSecret = atob(encryptedSecret);
      
      // Verify the code
      const verified = speakeasy.totp.verify({
        secret: storedSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (!verified) {
        alert('Invalid 2FA code');
        return;
      }

      // Call API to disable 2FA on-chain
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          totpCode: code,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      // Remove from localStorage
      localStorage.removeItem(`2fa_config_${userAddress}`);
      localStorage.removeItem(`2fa_secret_${userAddress}`);
      setConfig(null);
      
      alert('2FA has been disabled');
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      alert('Failed to disable 2FA');
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Two-Factor Authentication
        </h2>
        {config?.enabled && (
          <button
            onClick={disable2FA}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Disable 2FA
          </button>
        )}
      </div>

      {config?.enabled ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              2FA Enabled
            </h3>
            <p className="text-sm">
              Two-factor authentication is active for transactions over {config.threshold} ETH
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Important
            </h3>
            <p className="text-sm">
              Make sure you have your authenticator app set up with the correct code.
              You will need it for high-value transactions.
            </p>
          </div>
        </div>
      ) : showSetup ? (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto mb-4" />
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Manual entry code:
              </p>
              <p className="font-mono text-xs break-all">{secret}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Transaction Threshold (ETH)
            </label>
            <input
              type="text"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="1.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              2FA will be required for transactions above this amount
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowSetup(false);
                setQrCodeUrl('');
                setSecret('');
                setVerificationCode('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={verifyAndEnable}
              disabled={isVerifying || !verificationCode}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add an extra layer of security to your account
          </p>
          <button
            onClick={generateSecret}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Setup 2FA
          </button>
        </div>
      )}
    </div>
  );
}