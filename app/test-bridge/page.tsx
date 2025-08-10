'use client';

import { useState } from 'react';
import { ensureUserWallet, getUserWalletAccess } from '@/lib/wallet/simple-key-manager';
import { crossChainBridge } from '@/lib/bridge/cross-chain';

export default function TestBridgePage() {
  const [email, setEmail] = useState('test@example.com');
  const [wallet, setWallet] = useState<any>(null);
  const [walletAccess, setWalletAccess] = useState<any>(null);
  const [bridgeResult, setBridgeResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const createWallet = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🔐 Creating wallet for:', email);
      const userWallet = await ensureUserWallet(email);
      setWallet(userWallet);
      
      console.log('✅ Wallet created:', userWallet);
      
      // Test wallet access
      const access = await getUserWalletAccess(email);
      setWalletAccess(access);
      
      console.log('🔑 Wallet access:', access);
      
    } catch (err) {
      console.error('❌ Wallet creation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testBridge = async () => {
    if (!wallet || !walletAccess) {
      setError('Please create wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('🌉 Testing bridge transaction...');
      
      const bridgeTx = await crossChainBridge.executeBridge(
        'sepolia',     // from network
        'xlayer',      // to network  
        'ETH',         // from token
        'OKB',         // to token
        '0.001',       // amount (very small for testing)
        wallet.address, // recipient
        email          // user email
      );
      
      setBridgeResult(bridgeTx);
      console.log('✅ Bridge transaction created:', bridgeTx);
      
    } catch (err) {
      console.error('❌ Bridge test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testOKBBridge = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🔥 Testing REAL OKB burn...');
      
      // Test real OKB burning from Sepolia to X Layer
      const bridgeTx = await crossChainBridge.executeBridge(
        'sepolia',     // from network
        'xlayer',      // to network  
        'OKB',         // from token (real OKB)
        'OKB',         // to token
        '0.1',         // amount - test with 0.1 OKB
        '0x9f0815a0b5ffb7e7178858cd62156487ba991414', // recipient (smart account)
        'kimyw3007@gmail.com'  // user email
      );
      
      setBridgeResult(bridgeTx);
      console.log('✅ REAL OKB bridge transaction created:', bridgeTx);
      
    } catch (err) {
      console.error('❌ Real OKB bridge test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">🧪 Bridge System Test</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800">❌ Error: {error}</p>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Test Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="test@example.com"
              />
            </div>

            {/* Create Wallet */}
            <div>
              <button
                onClick={createWallet}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '⏳ Creating...' : '🔐 Create Wallet'}
              </button>
            </div>

            {/* Wallet Info */}
            {wallet && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">✅ Wallet Created</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Email:</strong> {wallet.email}</p>
                  <p><strong>Address:</strong> {wallet.address}</p>
                  <p><strong>Created:</strong> {wallet.createdAt}</p>
                  <p><strong>Networks:</strong> Sepolia ({wallet.chainAccounts['11155111']}), XLayer ({wallet.chainAccounts['196']})</p>
                </div>
              </div>
            )}

            {/* Wallet Access Info */}
            {walletAccess && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">🔑 Wallet Access</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Address:</strong> {walletAccess.address}</p>
                  <p><strong>Private Key:</strong> {walletAccess.privateKey.slice(0, 10)}...{walletAccess.privateKey.slice(-4)}</p>
                </div>
              </div>
            )}

            {/* Test Bridge */}
            {walletAccess && (
              <div className="space-y-4">
                <button
                  onClick={testBridge}
                  disabled={isLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? '⏳ Testing...' : '🌉 Test ETH Bridge'}
                </button>
                
                <button
                  onClick={testOKBBridge}
                  disabled={isLoading}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 ml-4"
                >
                  {isLoading ? '⏳ Testing...' : '🔥 Test OKB Real Burn'}
                </button>
                
                <p className="text-sm text-gray-600 mt-2">
                  ⚠️ OKB test will attempt real token burning with UserOperation
                </p>
              </div>
            )}

            {/* Bridge Result */}
            {bridgeResult && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">🌉 Bridge Transaction</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {bridgeResult.id}</p>
                  <p><strong>Status:</strong> {bridgeResult.status}</p>
                  <p><strong>From:</strong> {bridgeResult.fromNetwork} ({bridgeResult.fromToken})</p>
                  <p><strong>To:</strong> {bridgeResult.toNetwork} ({bridgeResult.toToken})</p>
                  <p><strong>Amount:</strong> {bridgeResult.amount}</p>
                  <p><strong>Recipient:</strong> {bridgeResult.recipient}</p>
                  {bridgeResult.txHash && <p><strong>TX Hash:</strong> {bridgeResult.txHash}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-lg font-semibold mb-2">📋 Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Enter a test email address</li>
              <li>Click "Create Wallet" to generate encrypted wallet</li>
              <li>Wallet address will be shown - fund it with testnet tokens if needed</li>
              <li>Click "Test Bridge" for simulation or "Test OKB Real Burn" for real bridge</li>
              <li>Check browser console for detailed logs</li>
            </ol>
            
            <div className="mt-4">
              <h4 className="font-medium">🚰 Testnet Faucets:</h4>
              <ul className="text-sm space-y-1 mt-1">
                <li>• Sepolia: <a href="https://sepoliafaucet.com" target="_blank" className="text-blue-600">sepoliafaucet.com</a></li>
                <li>• XLayer: <a href="https://www.okx.com/xlayer/faucet" target="_blank" className="text-blue-600">okx.com/xlayer/faucet</a></li>
              </ul>
            </div>

            <div className="mt-4 bg-green-100 border border-green-300 rounded p-3">
              <h4 className="font-medium text-green-800">🎉 REAL BRIDGE READY!</h4>
              <ul className="text-sm text-green-700 space-y-1 mt-1">
                <li>• OKB Token Contract: 0x0BC13595f7DABbF1D00fC5CAa670D2374BD4AA9a</li>
                <li>• Smart Account Balance: 5 OKB</li>
                <li>• OKX Cross-Chain API: Configured</li>
                <li>• Ready for Sepolia OKB → X Layer OKB</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}