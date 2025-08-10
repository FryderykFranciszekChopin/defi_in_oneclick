/**
 * Multi-chain Smart Account Management
 * Manages smart accounts across multiple networks (Sepolia + XLayer)
 */

import {
  createPublicClient,
  http,
  type Hex,
  type Address,
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import { NETWORKS, getNetwork, type NetworkConfig } from '../networks/config';
import type { SmartAccount, UserOperation } from './types';

export interface MultiChainAccount {
  email: string;
  publicKey: string;
  accounts: Record<string, SmartAccount>; // networkId -> SmartAccount
  activeNetwork: string;
}

// Contract ABIs
const FACTORY_ABI = [
  {
    name: 'createAccount',
    type: 'function',
    inputs: [
      { name: 'publicKey', type: 'bytes' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ name: 'account', type: 'address' }],
  },
  {
    name: 'getAddress',
    type: 'function',
    inputs: [
      { name: 'publicKey', type: 'bytes' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/**
 * Calculate deterministic salt for account creation
 */
export function calculateSalt(email: string, publicKey: string, accountIndex = 0): Hex {
  const data = encodeAbiParameters(
    parseAbiParameters('string, bytes, uint256'),
    [email, publicKey as Hex, BigInt(accountIndex)]
  );
  return keccak256(data);
}

/**
 * Calculate smart account address for a specific network
 */
export async function calculateSmartAccountAddress(
  networkId: string,
  publicKey: string,
  salt: Hex
): Promise<Address> {
  const network = getNetwork(networkId);
  const client = createPublicClient({
    chain: network.chain,
    transport: http(),
  });

  try {
    const address = await client.readContract({
      address: network.factoryAddress as Address,
      abi: FACTORY_ABI,
      functionName: 'getAddress',
      args: [publicKey as Hex, salt],
    });
    
    console.log(`Calculated address for ${networkId}:`, address);
    return address as Address;
  } catch (error) {
    console.error(`Failed to calculate address for ${networkId}:`, error);
    
    // Fallback to deterministic calculation
    const initCodeHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes'),
        [publicKey as Hex]
      )
    );
    
    const addressBytes = keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes1, address, bytes32, bytes32'),
        ['0xff' as Hex, network.factoryAddress as Address, salt, initCodeHash]
      )
    );
    
    const address = ('0x' + addressBytes.slice(-40)) as Address;
    console.log(`Calculated address locally for ${networkId}:`, address);
    return address;
  }
}

/**
 * Check if smart account is deployed on a network
 */
export async function isAccountDeployed(networkId: string, address: Address): Promise<boolean> {
  const network = getNetwork(networkId);
  const client = createPublicClient({
    chain: network.chain,
    transport: http(),
  });

  try {
    const code = await client.getBytecode({ address });
    return code !== undefined && code !== '0x' && code.length > 2;
  } catch (error) {
    console.error(`Failed to check deployment for ${networkId}:`, error);
    return false;
  }
}

/**
 * Get account balance on a specific network
 */
export async function getAccountBalance(networkId: string, address: Address): Promise<bigint> {
  const network = getNetwork(networkId);
  const client = createPublicClient({
    chain: network.chain,
    transport: http(),
  });

  try {
    return await client.getBalance({ address });
  } catch (error) {
    console.error(`Failed to get balance for ${networkId}:`, error);
    return 0n;
  }
}

/**
 * Create multi-chain smart account
 */
export async function createMultiChainAccount(
  email: string,
  publicKey: string,
  accountIndex = 0
): Promise<MultiChainAccount> {
  const salt = calculateSalt(email, publicKey, accountIndex);
  const accounts: Record<string, SmartAccount> = {};

  // Create accounts for all supported networks
  for (const [networkId, networkConfig] of Object.entries(NETWORKS)) {
    try {
      const address = await calculateSmartAccountAddress(networkId, publicKey, salt);
      const isDeployed = await isAccountDeployed(networkId, address);
      const balance = await getAccountBalance(networkId, address);

      accounts[networkId] = {
        address,
        publicKey,
        email,
        isDeployed,
        nonce: 0n,
        balance: balance.toString(),
        chainId: networkConfig.chain.id,
      };

      console.log(`✅ ${networkId}: ${address} (deployed: ${isDeployed}, balance: ${balance})`);
    } catch (error) {
      console.error(`❌ Failed to create account for ${networkId}:`, error);
    }
  }

  return {
    email,
    publicKey,
    accounts,
    activeNetwork: 'sepolia', // Default to Sepolia
  };
}

/**
 * Switch active network
 */
export function switchNetwork(
  multiAccount: MultiChainAccount,
  networkId: string
): MultiChainAccount {
  if (!NETWORKS[networkId]) {
    throw new Error(`Unsupported network: ${networkId}`);
  }

  return {
    ...multiAccount,
    activeNetwork: networkId,
  };
}

/**
 * Get active account
 */
export function getActiveAccount(multiAccount: MultiChainAccount): SmartAccount | null {
  return multiAccount.accounts[multiAccount.activeNetwork] || null;
}

/**
 * Refresh balances for all networks
 */
export async function refreshAllBalances(
  multiAccount: MultiChainAccount
): Promise<MultiChainAccount> {
  const updatedAccounts = { ...multiAccount.accounts };

  for (const [networkId, account] of Object.entries(updatedAccounts)) {
    try {
      const balance = await getAccountBalance(networkId, account.address as Address);
      updatedAccounts[networkId] = {
        ...account,
        balance: balance.toString(),
      };
    } catch (error) {
      console.error(`Failed to refresh balance for ${networkId}:`, error);
    }
  }

  return {
    ...multiAccount,
    accounts: updatedAccounts,
  };
}

/**
 * Alias for refreshAllBalances (for compatibility)
 */
export const getMultiChainBalance = refreshAllBalances;

/**
 * Deploy account on specific network if not already deployed
 */
export async function deployAccountOnNetwork(
  networkId: string,
  email: string,
  publicKey: string,
  accountIndex = 0
): Promise<{ success: boolean; txHash?: string; address: Address }> {
  const network = getNetwork(networkId);
  const salt = calculateSalt(email, publicKey, accountIndex);
  const address = await calculateSmartAccountAddress(networkId, publicKey, salt);

  // Check if already deployed
  if (await isAccountDeployed(networkId, address)) {
    console.log(`Account already deployed on ${networkId}:`, address);
    return { success: true, address };
  }

  // For now, return success (actual deployment would happen on first transaction)
  console.log(`Account will deploy on first transaction for ${networkId}:`, address);
  return { success: true, address };
}

export default {
  createMultiChainAccount,
  switchNetwork,
  getActiveAccount,
  refreshAllBalances,
  deployAccountOnNetwork,
  calculateSalt,
  isAccountDeployed,
  getAccountBalance,
};