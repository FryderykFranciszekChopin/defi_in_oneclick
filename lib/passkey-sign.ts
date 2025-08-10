import { Hex } from 'viem';
import { getStoredPasskey } from './passkey-client';

/**
 * Sign a transaction with passkey
 * This ensures only the passkey owner can approve transactions
 */
export async function signWithPasskey(message: string): Promise<{ signature: Hex; authenticatorData: string }> {
  const passkeyData = getStoredPasskey();
  
  if (!passkeyData) {
    throw new Error('No passkey found. Please set up your security key first.');
  }

  try {
    // Convert message to buffer
    const encoder = new TextEncoder();
    const challenge = encoder.encode(message);
    
    // Create assertion options
    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: Uint8Array.from(atob(passkeyData.id), c => c.charCodeAt(0)),
        type: 'public-key',
      }],
      userVerification: 'required', // Force biometric/PIN verification
      timeout: 60000,
    };

    // Request signature from passkey
    const credential = await navigator.credentials.get({
      publicKey: assertionOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Authentication failed');
    }

    const response = credential.response as AuthenticatorAssertionResponse;
    
    // Extract signature from response
    const signature = new Uint8Array(response.signature);
    const authenticatorData = new Uint8Array(response.authenticatorData);
    
    // Convert to hex
    const signatureHex = ('0x' + Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')) as Hex;
    const authDataHex = Array.from(authenticatorData).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      signature: signatureHex,
      authenticatorData: authDataHex,
    };
  } catch (error: any) {
    console.error('Passkey signing failed:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Transaction signing was cancelled. Please approve the transaction with your security key.');
    }
    
    if (error.name === 'InvalidStateError') {
      throw new Error('Security key not found. Please ensure your device is connected.');
    }
    
    throw new Error('Failed to sign transaction. Please try again.');
  }
}

/**
 * Verify user with passkey before sensitive operations
 */
export async function verifyPasskey(): Promise<boolean> {
  try {
    const message = `Verify access at ${new Date().toISOString()}`;
    await signWithPasskey(message);
    return true;
  } catch (error) {
    console.error('Passkey verification failed:', error);
    return false;
  }
}