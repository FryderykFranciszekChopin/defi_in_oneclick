import { createHash } from 'crypto';
import { Hex, keccak256, encodeAbiParameters, parseAbiParameters, toHex } from 'viem';

/**
 * Generate a deterministic key pair from email
 * This creates a consistent public key for the same email
 */
export async function generateKeyPairFromEmail(email: string): Promise<{ publicKey: Hex }> {
  // Create a deterministic seed from email
  const seed = createHash('sha256').update(email).digest();
  
  // For simplicity, we'll use the seed as the public key
  // In production, you'd use proper elliptic curve cryptography
  const publicKey = ('0x' + seed.toString('hex')) as Hex;
  
  return { publicKey };
}

/**
 * Generate smart account address from email (consistent with factory.ts)
 */
export async function generateSmartAccountAddress(email: string, accountIndex = 0): Promise<Hex> {
  const { publicKey } = await generateKeyPairFromEmail(email);
  
  // Use same salt calculation as factory.ts
  const data = encodeAbiParameters(
    parseAbiParameters('string, bytes, uint256'),
    [email, publicKey, BigInt(accountIndex)]
  );
  const salt = keccak256(data);
  
  // Generate deterministic address using same logic as calculateSmartAccountAddress
  const mockAddress = keccak256(
    encodeAbiParameters(
      parseAbiParameters('bytes, bytes32'),
      [publicKey, salt]
    )
  ).slice(0, 42) as Hex;
  
  return mockAddress;
}