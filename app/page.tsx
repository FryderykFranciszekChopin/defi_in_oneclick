'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { GoogleSignInWithPasskey } from '@/components/GoogleSignInWithPasskey';
import { Dashboard } from '@/components/Dashboard';
import { CRTGlitchText } from '@/components/CRTGlitchText';
import { PolygonGlobe } from '@/components/PolygonGlobeWrapper';
import { getStoredPasskey } from '@/lib/passkey-client';

export default function Home() {
  const { data: session, status } = useSession();
  const [account, setAccount] = useState<any>(null);
  // const [isLoading, setIsLoading] = useState(false);
  const [tapTrigger, setTapTrigger] = useState(false);
  // const [isMobile, setIsMobile] = useState(false);
  // const [forceShowBackground, setForceShowBackground] = useState(false);

  // Check if user has completed the full setup (Google + Passkey)
  useEffect(() => {
    if (session?.user?.email) {
      const passkey = getStoredPasskey();
      // Only proceed to dashboard if user has both Google login AND passkey
      if (passkey && passkey.email === session.user.email && session.user.smartAccountAddress) {
        setAccount({
          email: session.user.email,
          address: session.user.smartAccountAddress,
          publicKey: session.user.publicKey,
          accountIndex: session.user.accountIndex || 0,
          passkeyId: passkey.id,
        });
      }
    }
  }, [session]);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      // const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
      //                      window.innerWidth < 768;
      // setIsMobile(false); // Always show 3D background
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const handleTitleClick = () => {
    setTapTrigger(!tapTrigger);
  };
  
  // const handleAccountCreated = (newAccount: any) => {
  //   if (newAccount && newAccount.email && newAccount.address) {
  //     setAccount(newAccount);
  //   }
  // };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show dashboard only if user has both Google login AND passkey
  if (session && account && account.passkeyId) {
    return <Dashboard account={account} />;
  }

  return (
    <div className="min-h-screen bg-mesh transition-colors duration-300 relative">
      {/* Polygon Globe Background - Always display */}
      <PolygonGlobe className="opacity-60 dark:opacity-40" />
      
      {/* Hero Section */}
      <section className="pt-16 sm:pt-20 pb-24 sm:pb-32 px-4 relative overflow-hidden" style={{position: 'relative', zIndex: 10}}>
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight cursor-pointer select-none" onClick={handleTitleClick}>
            DeFi in{' '}
            <CRTGlitchText 
              className="gradient-text font-black"
              onTapTrigger={tapTrigger}
            >
              <span>One Click</span>
            </CRTGlitchText>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-medium px-4">
            Start using DeFi with just your email. No wallet setup, no gas fees, no complexity.
          </p>

          {/* Google Sign In with Passkey */}
          <div className="max-w-md mx-auto">
            <GoogleSignInWithPasskey 
              onSuccess={(newAccount) => {
                setAccount(newAccount);
              }}
            />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-16 sm:mt-20 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 card-shadow card-shadow-hover border border-gray-200 dark:border-gray-700">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-xl flex items-center justify-center mb-5 mx-auto shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white text-glow">Secure Passkey Login</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">Use your device's biometrics. No passwords to remember.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 card-shadow card-shadow-hover border border-gray-200 dark:border-gray-700">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-xl flex items-center justify-center mb-5 mx-auto shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white text-glow">Zero Gas Fees</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">All transactions are sponsored. Trade without paying gas.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 card-shadow card-shadow-hover border border-gray-200 dark:border-gray-700">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 rounded-xl flex items-center justify-center mb-5 mx-auto shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white text-glow">60+ Chains</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">Access the best rates across all major blockchains.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 relative overflow-hidden" style={{position: 'relative', zIndex: 10}}>
        {/* Smooth gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/10 dark:via-gray-800/30 to-purple-50/20 dark:to-gray-900/50"></div>
        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200/10 dark:bg-blue-600/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/10 dark:bg-purple-600/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center mb-12 sm:mb-16 text-gray-900 dark:text-white text-glow">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-3xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-xl transform rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 group-hover:shadow-blue-500/25">
                1
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white text-glow">Enter Your Email</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Just type your email address. That's it.</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 text-white rounded-3xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-xl transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 group-hover:shadow-purple-500/25">
                2
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white text-glow">Create Passkey</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Use Touch ID or Face ID to secure your account.</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 text-white rounded-3xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-xl transform rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 group-hover:shadow-green-500/25">
                3
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white text-glow">Start Trading</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Swap tokens across 60+ chains with zero gas fees.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Copyright Footer */}
      <footer className="py-8 px-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm" style={{position: 'relative', zIndex: 10}}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            © 2025 OneClick DeFi. Built by{' '}
            <span className="font-semibold text-gray-800 dark:text-white">holostudio</span>
          </p>
        </div>
      </footer>
    </div>
  );
}