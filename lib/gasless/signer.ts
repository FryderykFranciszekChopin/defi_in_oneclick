import { startAuthentication } from '@simplewebauthn/browser';
import type { Hex } from 'viem';
import { encodeAbiParameters, parseAbiParameters, hexToBytes, bytesToHex } from 'viem';

interface PasskeySignatureData {
  authenticatorData: Hex;
  clientDataJSON: string;
  challengeIndex: number;
  typeIndex: number;
  userHandle: string;
  r: bigint;
  s: bigint;
}

export async function signWithPasskey(userOpHash: Hex, credentialId: string): Promise<Hex> {
  try {
    // Prepare the challenge - the userOpHash without 0x prefix
    const challenge = userOpHash.slice(2);
    
    // Create authentication options following WebAuthn spec
    const authenticationOptions = {
      challenge,
      allowCredentials: [{
        id: credentialId,
        type: 'public-key' as const,
        transports: ['internal', 'hybrid', 'usb'] as AuthenticatorTransport[],
      }],
      userVerification: 'required' as const,
      timeout: 60000, // 60 seconds
    };

    console.log('Starting WebAuthn authentication...');
    
    // Trigger passkey authentication
    const assertion = await startAuthentication({
      optionsJSON: authenticationOptions,
    });

    console.log('WebAuthn assertion received:', {
      id: assertion.id,
      clientDataJSON: assertion.response.clientDataJSON.substring(0, 100) + '...',
    });

    // Decode the response data
    const authenticatorData = base64ToHex(assertion.response.authenticatorData);
    const clientDataJSON = base64ToString(assertion.response.clientDataJSON);
    const signatureBase64 = assertion.response.signature;
    const userHandle = assertion.response.userHandle || '';

    // Find the challenge location in clientDataJSON
    const challengeIndex = clientDataJSON.indexOf('"challenge"');
    const typeIndex = clientDataJSON.indexOf('"type"');

    // Parse the DER-encoded signature
    const { r, s } = parseSignature(base64ToBytes(signatureBase64));

    // Encode the signature data for the smart contract
    const signatureData: PasskeySignatureData = {
      authenticatorData,
      clientDataJSON,
      challengeIndex,
      typeIndex,
      userHandle,
      r,
      s,
    };

    // Pack the signature according to the smart contract's expected format
    const encodedSignature = encodePasskeySignature(signatureData);
    
    console.log('Passkey signature created successfully');
    return encodedSignature;
  } catch (error: any) {
    console.error('Passkey signing failed:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('User cancelled the passkey authentication');
    }
    if (error.name === 'InvalidStateError') {
      throw new Error('No passkey found for this account');
    }
    if (error.name === 'SecurityError') {
      throw new Error('Security error: Please ensure you are on a secure origin (HTTPS)');
    }
    
    throw new Error(`Failed to sign with passkey: ${error.message || 'Unknown error'}`);
  }
}

function encodePasskeySignature(data: PasskeySignatureData): Hex {
  // Encode according to OneClickAccount contract's expected format
  const encoded = encodeAbiParameters(
    parseAbiParameters('bytes, string, uint256, uint256, string, uint256, uint256'),
    [
      data.authenticatorData,
      data.clientDataJSON,
      BigInt(data.challengeIndex),
      BigInt(data.typeIndex),
      data.userHandle,
      data.r,
      data.s,
    ]
  );
  
  return encoded;
}

function parseSignature(derSignature: Uint8Array): { r: bigint; s: bigint } {
  // DER signature format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  let offset = 0;
  
  // Check for DER sequence tag
  if (derSignature[offset++] !== 0x30) {
    throw new Error('Invalid DER signature format');
  }
  
  // Skip total length
  const totalLength = derSignature[offset++];
  if (totalLength > derSignature.length - 2) {
    throw new Error('Invalid DER signature length');
  }
  
  // Parse r
  if (derSignature[offset++] !== 0x02) {
    throw new Error('Invalid DER signature format (r)');
  }
  
  const rLength = derSignature[offset++];
  const rBytes = derSignature.slice(offset, offset + rLength);
  offset += rLength;
  
  // Parse s
  if (derSignature[offset++] !== 0x02) {
    throw new Error('Invalid DER signature format (s)');
  }
  
  const sLength = derSignature[offset++];
  const sBytes = derSignature.slice(offset, offset + sLength);
  
  // Convert to bigint
  const r = bytesToBigInt(rBytes);
  const s = bytesToBigInt(sBytes);
  
  return { r, s };
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

function base64ToHex(base64: string): Hex {
  const bytes = base64ToBytes(base64);
  return bytesToHex(bytes);
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64ToString(base64: string): string {
  return atob(base64);
}

// Fallback mock signature for testing without passkey
export function getMockSignature(): Hex {
  // This creates a properly formatted signature that will fail validation
  // but allows testing the flow
  const mockData: PasskeySignatureData = {
    authenticatorData: '0x' + '00'.repeat(37),
    clientDataJSON: JSON.stringify({
      type: 'webauthn.get',
      challenge: '00'.repeat(32),
      origin: 'http://localhost:3000',
    }),
    challengeIndex: 37,
    typeIndex: 8,
    userHandle: '',
    r: 1n,
    s: 1n,
  };
  
  return encodePasskeySignature(mockData);
}