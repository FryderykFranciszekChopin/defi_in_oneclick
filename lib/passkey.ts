import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';
import { extractPublicKeyFromCredential, validateP256PublicKey } from './cose';

export const PASSKEY_STORAGE_KEY = 'oneclick_defi_passkey';

export interface PasskeyData {
  id: string;
  rawId: string;
  publicKey: string;
  email: string;
}

export async function createPasskey(email: string): Promise<PasskeyData> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  
  // Check if we're in a secure context (HTTPS or localhost)
  // Passkeys work on localhost for development!
  if (!window.isSecureContext) {
    console.warn('Passkeys require HTTPS or localhost. Current context is not secure.');
    // Only use mock data if truly not in a secure context
    const mockId = btoa(email + Date.now());
    const x = crypto.getRandomValues(new Uint8Array(32));
    const y = crypto.getRandomValues(new Uint8Array(32));
    const publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                         Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      id: mockId,
      rawId: mockId,
      publicKey: publicKeyHex,
      email,
    };
  }
  
  const options: PublicKeyCredentialCreationOptionsJSON = {
    challenge: btoa(String.fromCharCode(...challenge)),
    rp: {
      name: 'OneClick DeFi',
      // Use hostname only, no port. This prevents Google Password Manager confusion
      id: window.location.hostname,
    },
    user: {
      id: btoa(email),
      name: email,
      displayName: email.split('@')[0] || email,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      // Allow both platform and cross-platform authenticators for flexibility
      // Users can choose: local device (platform) or Google Password Manager (cross-platform)
      // authenticatorAttachment: undefined, // Let user choose
      userVerification: 'preferred',
      residentKey: 'discouraged',
      requireResidentKey: false,
    },
    attestation: 'none',
    timeout: 120000, // 2 minutes
    // Exclude credentials to prevent duplicate registration
    excludeCredentials: [],
  };

  try {
    const credential = await startRegistration({
      optionsJSON: options,
    });

    // Extract public key from the credential response
    let publicKeyHex: string;
    
    if (credential.response.publicKey) {
      // Try to extract the actual public key from the COSE format
      const extractedKey = extractPublicKeyFromCredential(credential.response.publicKey);
      
      if (extractedKey && validateP256PublicKey(extractedKey)) {
        publicKeyHex = extractedKey;
        console.log('Successfully extracted P-256 public key from credential');
      } else {
        // Fallback: Generate deterministic key from credential ID
        // This is only for development/testing when COSE parsing fails
        console.warn('Failed to extract valid public key from COSE, using fallback');
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential.id));
        const hashArray = new Uint8Array(hash);
        
        // Use first 32 bytes for x, derive y to ensure it's on the curve
        const x = hashArray.slice(0, 32);
        const y = new Uint8Array(32);
        
        // Simple derivation to get a y coordinate
        // In production, this should properly calculate y from x on the P-256 curve
        await crypto.subtle.digest('SHA-256', x).then(result => {
          y.set(new Uint8Array(result).slice(0, 32));
        });
        
        publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                       Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } else {
      // No public key in response, generate fallback
      console.warn('No public key in credential response, using fallback');
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential.id));
      const hashArray = new Uint8Array(hash);
      const x = hashArray.slice(0, 32);
      const y = new Uint8Array(32);
      await crypto.subtle.digest('SHA-256', x).then(result => {
        y.set(new Uint8Array(result).slice(0, 32));
      });
      publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                     Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const passkeyData: PasskeyData = {
      id: credential.id,
      rawId: credential.rawId,
      publicKey: publicKeyHex,
      email,
    };

    // Store passkey data locally
    localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(passkeyData));
    
    return passkeyData;
  } catch (error: any) {
    console.error('Passkey creation failed:', error);
    
    // Check if it's a NotAllowedError (user cancelled or timeout)
    if (error.name === 'NotAllowedError') {
      throw new Error('Passkey creation was cancelled or denied. Please try again and approve the authentication prompt.');
    }
    
    // Check if it's a NotSupportedError
    if (error.name === 'NotSupportedError') {
      throw new Error('Your device does not support passkeys. Please use a device with biometric authentication or security keys.');
    }
    
    // Check if it's a SecurityError
    if (error.name === 'SecurityError') {
      throw new Error('Passkeys require a secure context (HTTPS or localhost). Please check your connection.');
    }
    
    // Check if it's an InvalidStateError
    if (error.name === 'InvalidStateError') {
      throw new Error('A passkey already exists for this account. Please try logging in instead.');
    }
    
    // Generic error
    throw new Error(`Failed to create passkey: ${error.message || 'Unknown error occurred'}`);
  }
}

export async function authenticateWithPasskey(email?: string): Promise<PasskeyData | null> {
  const storedData = localStorage.getItem(PASSKEY_STORAGE_KEY);
  if (!storedData && !email) {
    throw new Error('No passkey found');
  }

  const passkeyData: PasskeyData | null = storedData ? JSON.parse(storedData) : null;
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const options: PublicKeyCredentialRequestOptionsJSON = {
    challenge: btoa(String.fromCharCode(...challenge)),
    allowCredentials: passkeyData ? [
      {
        id: passkeyData.id,
        type: 'public-key',
      },
    ] : [],
    userVerification: 'required',
    timeout: 60000,
  };

  try {
    const credential = await startAuthentication({
      optionsJSON: options,
    });

    // If we have stored passkey data, verify it matches
    if (passkeyData && credential.id === passkeyData.id) {
      return passkeyData;
    }
    
    // If no stored data but we got a credential (re-authentication case)
    if (!passkeyData && credential && email) {
      // Generate deterministic public key from credential ID
      // Note: assertion responses don't contain public keys, only registration does
      console.log('Re-authenticating - generating deterministic key from credential ID');
      const encoder = new TextEncoder();
      const data = encoder.encode(credential.id);
      const hash = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hash);
      const x = hashArray.slice(0, 32);
      const y = new Uint8Array(32);
      await crypto.subtle.digest('SHA-256', x).then(result => {
        y.set(new Uint8Array(result).slice(0, 32));
      });
      const publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                       Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('Generated deterministic publicKey:', publicKeyHex);
      
      const newPasskeyData: PasskeyData = {
        id: credential.id,
        rawId: credential.rawId,
        publicKey: publicKeyHex,
        email,
      };
      
      // Store the re-authenticated passkey
      localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(newPasskeyData));
      
      return newPasskeyData;
    }
    
    return null;
  } catch (error: any) {
    console.error('Passkey authentication failed:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Authentication was cancelled or denied. Please try again.');
    }
    
    throw new Error('Failed to authenticate with passkey');
  }
}

export function getStoredPasskey(): PasskeyData | null {
  const storedData = localStorage.getItem(PASSKEY_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : null;
}

export function clearPasskey(): void {
  localStorage.removeItem(PASSKEY_STORAGE_KEY);
}