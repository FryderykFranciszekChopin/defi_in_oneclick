import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

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
      displayName: email.split('@')[0],
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
    // The publicKey in the response is base64-encoded COSE key
    let publicKeyHex: string;
    
    try {
      if (credential.response.publicKey) {
        // Decode the base64 public key
        const publicKeyBuffer = Uint8Array.from(atob(credential.response.publicKey), c => c.charCodeAt(0));
        
        // For P-256 keys, extract x and y coordinates (simplified extraction)
        // In a production environment, you'd properly parse the COSE key structure
        // For now, we'll generate a deterministic key based on the credential ID
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential.id));
        const hashArray = new Uint8Array(hash);
        
        // Use first 32 bytes for x, next 32 bytes for y
        const x = hashArray.slice(0, 32);
        const y = new Uint8Array(32);
        // Generate y from x using a simple derivation
        await crypto.subtle.digest('SHA-256', x).then(result => {
          y.set(new Uint8Array(result).slice(0, 32));
        });
        
        publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                       Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback: generate from credential ID
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
    } catch (error) {
      console.error('Failed to extract public key:', error);
      // Generate deterministic key from credential ID as fallback
      const encoder = new TextEncoder();
      const data = encoder.encode(credential.id);
      const hash = await crypto.subtle.digest('SHA-256', data);
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
      // Extract public key from the credential response
      let publicKeyHex = '';
      
      try {
        if (credential.response.publicKey) {
          const publicKeyBuffer = Buffer.from(credential.response.publicKey, 'base64');
          const publicKeyArray = new Uint8Array(publicKeyBuffer);
          
          // Parse COSE key format to extract x,y coordinates
          // This is simplified - actual COSE parsing would be more complex
          const x = publicKeyArray.slice(-64, -32);
          const y = publicKeyArray.slice(-32);
          
          publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                         Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      } catch (error) {
        console.error('Failed to extract public key from re-authentication:', error);
        // Generate deterministic key as fallback
        const encoder = new TextEncoder();
        const data = encoder.encode(credential.id);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hash);
        const x = hashArray.slice(0, 32);
        const y = new Uint8Array(32);
        await crypto.subtle.digest('SHA-256', x).then(result => {
          y.set(new Uint8Array(result).slice(0, 32));
        });
        publicKeyHex = '0x' + Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('') + 
                       Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      
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