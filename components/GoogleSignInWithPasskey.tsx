'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { createPasskey } from '@/lib/passkey';
import { createSmartAccount } from '@/lib/smart-account/factory';
import { deploySmartAccount } from '@/lib/smart-account/account';
import { storePasskey, getStoredPasskey, getNextAccountIndex } from '@/lib/passkey-client';
import { validateAndCleanPasskey } from '@/lib/cleanup-utils';

interface GoogleSignInWithPasskeyProps {
  onSuccess: (account: any) => void;
}

export function GoogleSignInWithPasskey({ onSuccess }: GoogleSignInWithPasskeyProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'google' | 'passkey' | 'loading'>('google');

  useEffect(() => {
    const checkAndProceed = async () => {
      // If user is signed in with Google
      if (session?.user?.email && step !== 'loading') {
        setStep('loading');
        
        // First, validate and clean any corrupted data
        const isDataValid = validateAndCleanPasskey();
        if (!isDataValid) {
          // Data was corrupted and cleared, redirect to passkey creation
          setStep('passkey');
          return;
        }
        
        // Check if user already has a passkey stored locally
        const existingPasskey = getStoredPasskey();
        
        if (existingPasskey && existingPasskey.email === session.user.email) {
          // User has passkey locally, verify it's still valid
          try {
            await handleExistingPasskey(existingPasskey);
          } catch (error) {
            // Passkey verification failed, need to re-authenticate
            console.error('Passkey verification failed:', error);
            setStep('passkey');
          }
        } else if (session.user.smartAccountAddress && existingPasskey) {
          // Has passkey but for different email - need re-authentication
          setStep('google');
          setError('Please sign in with the correct Google account for this passkey');
        } else if (session.user.smartAccountAddress) {
          // User has smart account in DB but no local passkey
          // This could be: 1) Different device, 2) Cleared cookies/storage
          setStep('passkey');
        } else {
          // New user, need to create passkey
          setStep('passkey');
        }
      }
    };

    checkAndProceed();
  }, [session]);

  const handleExistingPasskey = async (passkey: any) => {
    if (!session?.user?.email) return;
    
    console.log('handleExistingPasskey - passkey data:', passkey); // Debug log
    
    // Check if publicKey is valid
    if (!passkey.publicKey || passkey.publicKey === '' || passkey.publicKey === '0x') {
      console.error('Invalid publicKey in stored passkey:', passkey.publicKey);
      console.log('Clearing corrupted passkey data and starting fresh...');
      
      // Clear corrupted data
      localStorage.removeItem('oneclick_defi_passkey');
      localStorage.removeItem('smart_account_address');
      
      // Redirect to passkey creation
      throw new Error('Invalid publicKey in stored passkey - cleared corrupted data');
    }
    
    try {
      const accountIndex = passkey.accountIndex || 0;

      // Create or restore smart account
      const smartAccount = await createSmartAccount({
        email: session.user.email,
        publicKey: passkey.publicKey,
        chainId: 11155111, // Sepolia testnet
      }, accountIndex);
      
      // Check deployment status and deploy if needed
      if (!smartAccount.isDeployed) {
        console.log('Deploying smart account on XLayer testnet...');
        const deployResult = await deploySmartAccount(
          session.user.email,
          passkey.publicKey
        );
        
        if (deployResult.success) {
          console.log('Smart account deployed successfully:', deployResult.txHash);
          smartAccount.isDeployed = true;
        }
      }

      // Success - proceed to dashboard
      onSuccess({
        ...smartAccount,
        email: session.user.email,
        address: smartAccount.address,
        passkeyId: passkey.id,
        accountIndex,
      });
    } catch (err: any) {
      console.error('Failed to use existing passkey:', err);
      setError('Failed to load existing account. Please try again.');
      setStep('passkey'); // Show passkey creation if existing one fails
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyCreation = async () => {
    if (!session?.user?.email) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Check if this is an existing user who needs to re-authenticate
      const isExistingUser = !!session.user.smartAccountAddress;
      
      if (isExistingUser) {
        // Try to authenticate with existing passkey
        const { authenticateWithPasskey } = await import('@/lib/passkey');
        const passkeyData = await authenticateWithPasskey(session.user.email);
        
        if (passkeyData) {
          // Re-authentication successful
          const accountIndex = session.user.accountIndex || 0;
          
          // Store passkey locally
          storePasskey({
            ...passkeyData,
            accountIndex,
            createdAt: new Date().toISOString(),
          });
          
          // Restore smart account access
          const smartAccount = await createSmartAccount({
            email: session.user.email,
            publicKey: passkeyData.publicKey,
            chainId: 11155111, // Sepolia testnet
          }, accountIndex);
          
          // Check deployment status
          if (!smartAccount.isDeployed) {
            console.log('Deploying smart account on XLayer testnet...');
            const deployResult = await deploySmartAccount(
              session.user.email,
              passkeyData.publicKey
            );
            
            if (deployResult.success) {
              console.log('Smart account deployed successfully:', deployResult.txHash);
              smartAccount.isDeployed = true;
            }
          }
          
          // Success!
          onSuccess({
            ...smartAccount,
            email: session.user.email,
            address: smartAccount.address,
            passkeyId: passkeyData.id,
            accountIndex,
          });
          return;
        }
      }
      
      // New user or fallback to creating new passkey
      const passkeyData = await createPasskey(session.user.email);
      const accountIndex = isExistingUser ? (session.user.accountIndex || 0) : getNextAccountIndex(session.user.email);
      
      // Store passkey locally
      storePasskey({
        ...passkeyData,
        accountIndex,
        createdAt: new Date().toISOString(),
      });

      // Create smart account
      const smartAccount = await createSmartAccount({
        email: session.user.email,
        publicKey: passkeyData.publicKey,
        chainId: 11155111, // Sepolia testnet
      }, accountIndex);

      // Deploy the smart account on-chain if not already deployed
      if (!smartAccount.isDeployed) {
        console.log('Deploying smart account on XLayer testnet...');
        const deployResult = await deploySmartAccount(
          session.user.email,
          passkeyData.publicKey
        );
        
        if (deployResult.success) {
          console.log('Smart account deployed successfully:', deployResult.txHash);
          smartAccount.isDeployed = true;
        } else {
          console.warn('Smart account deployment pending - will deploy on first transaction');
        }
      }

      // Only update database for new users
      if (!isExistingUser) {
        await fetch('/api/user/update-smart-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smartAccountAddress: smartAccount.address,
            publicKey: passkeyData.publicKey,
            accountIndex,
          }),
        });
      }

      // Success!
      onSuccess({
        ...smartAccount,
        email: session.user.email,
        address: smartAccount.address,
        passkeyId: passkeyData.id,
        accountIndex,
      });
    } catch (err: any) {
      console.error('Passkey operation failed:', err);
      
      let errorMessage = 'Failed to authenticate. Please try again.';
      
      if (err.message.includes('cancelled') || err.message.includes('denied')) {
        errorMessage = 'Authentication was cancelled. Please try again and approve the prompt.';
      } else if (err.message.includes('not support')) {
        errorMessage = 'Your device does not support security keys. Please use a device with biometric authentication.';
      } else if (err.message.includes('already exists')) {
        errorMessage = 'A security key already exists. Please use your existing key to authenticate.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Step 1: Google Sign In (only show if not signed in)
  if (!session && step === 'google') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to OneClick DeFi
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in with Google to get started
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-md"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Passkey Creation (only show if needed)
  if (step === 'passkey' && session?.user) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {session.user.smartAccountAddress ? 'Authenticate to Access Your Wallet' : 'Secure Your Wallet'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Signed in as <strong>{session.user.email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {session.user.smartAccountAddress 
              ? 'Use your security key to access your existing wallet on this device'
              : 'Create a security key to protect your wallet'}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🔐 Why Security Keys?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Even if your Google account is compromised, your wallet stays safe</li>
            <li>• Only you can approve transactions with your biometrics</li>
            <li>• No passwords or seed phrases to remember</li>
          </ul>
        </div>

        <button
          onClick={handlePasskeyCreation}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating Security Key...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{session.user.smartAccountAddress ? 'Authenticate with Security Key' : 'Create Security Key'}</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Loading state
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Setting up your secure wallet...</p>
    </div>
  );
}