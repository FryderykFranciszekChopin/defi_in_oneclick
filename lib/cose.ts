/**
 * COSE (CBOR Object Signing and Encryption) key parsing utilities
 * For extracting P-256 public keys from WebAuthn credentials
 */

// COSE key parameters
const COSE_KTY = 1;    // Key Type
const COSE_ALG = 3;    // Algorithm
const COSE_CRV = -1;   // Curve
const COSE_X = -2;     // X coordinate
const COSE_Y = -3;     // Y coordinate

// COSE values
const COSE_KTY_EC2 = 2;        // Elliptic Curve
const COSE_ALG_ES256 = -7;     // ECDSA with SHA-256
const COSE_CRV_P256 = 1;       // P-256 curve

/**
 * Parse a COSE public key and extract P-256 coordinates
 * @param coseKey The COSE key as a Uint8Array
 * @returns The x and y coordinates as hex strings
 */
export function parseCOSEPublicKey(coseKey: Uint8Array): { x: string; y: string } | null {
  try {
    // Parse CBOR manually (simplified for P-256 keys)
    // A proper implementation would use a full CBOR parser
    
    // Check if it's a map (major type 5)
    if ((coseKey[0] & 0xE0) !== 0xA0) {
      console.error('Invalid COSE key: not a CBOR map');
      return null;
    }
    
    // Parse the map
    const map = new Map<number, any>();
    let offset = 1; // Skip the map header
    
    // For P-256 keys, we expect specific fields
    // This is a simplified parser that looks for the x and y coordinates
    
    let x: Uint8Array | null = null;
    let y: Uint8Array | null = null;
    
    // Look for the x coordinate (-2) and y coordinate (-3)
    // In CBOR, negative numbers are encoded as 0x20 + abs(n) - 1
    // So -2 is 0x21 and -3 is 0x22
    
    for (let i = 0; i < coseKey.length - 33; i++) {
      // Look for x coordinate marker (0x21 followed by 0x58 0x20 for 32-byte bytestring)
      if (coseKey[i] === 0x21 && i + 34 < coseKey.length) {
        if (coseKey[i + 1] === 0x58 && coseKey[i + 2] === 0x20) {
          x = coseKey.slice(i + 3, i + 35);
        }
      }
      
      // Look for y coordinate marker (0x22 followed by 0x58 0x20 for 32-byte bytestring)
      if (coseKey[i] === 0x22 && i + 34 < coseKey.length) {
        if (coseKey[i + 1] === 0x58 && coseKey[i + 2] === 0x20) {
          y = coseKey.slice(i + 3, i + 35);
        }
      }
    }
    
    if (!x || !y) {
      console.error('Could not extract x and y coordinates from COSE key');
      return null;
    }
    
    // Convert to hex strings
    const xHex = Array.from(x).map(b => b.toString(16).padStart(2, '0')).join('');
    const yHex = Array.from(y).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { x: xHex, y: yHex };
  } catch (error) {
    console.error('Error parsing COSE public key:', error);
    return null;
  }
}

/**
 * Extract public key from WebAuthn credential response
 * @param publicKeyBase64 The base64-encoded public key from the credential response
 * @returns The public key as a hex string (x + y coordinates)
 */
export function extractPublicKeyFromCredential(publicKeyBase64: string): string | null {
  try {
    // Decode base64
    const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    
    // Parse COSE key
    const coordinates = parseCOSEPublicKey(publicKeyBuffer);
    
    if (!coordinates) {
      return null;
    }
    
    // Return as combined hex string with 0x prefix
    return '0x' + coordinates.x + coordinates.y;
  } catch (error) {
    console.error('Error extracting public key:', error);
    return null;
  }
}

/**
 * Validate that a hex string represents a valid P-256 public key
 * @param publicKeyHex The public key as a hex string (with or without 0x prefix)
 * @returns True if the key appears valid
 */
export function validateP256PublicKey(publicKeyHex: string): boolean {
  // Remove 0x prefix if present
  const hex = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
  
  // Check length (should be 64 bytes = 128 hex chars)
  if (hex.length !== 128) {
    return false;
  }
  
  // Check if it's valid hex
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    return false;
  }
  
  // Extract x and y coordinates
  const x = BigInt('0x' + hex.slice(0, 64));
  const y = BigInt('0x' + hex.slice(64, 128));
  
  // P-256 curve parameters
  const p = BigInt('0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF');
  const a = p - 3n;
  const b = BigInt('0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B');
  
  // Check if point is on curve: y² = x³ + ax + b (mod p)
  const left = (y * y) % p;
  const right = ((x * x * x) + (a * x) + b) % p;
  
  return left === right;
}