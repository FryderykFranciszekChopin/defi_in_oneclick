import { 
  createPublicClient, 
  http, 
  encodeFunctionData, 
  getContractAddress, 
  keccak256, 
  encodeAbiParameters,
  parseAbiParameters,
  toHex,
  type Hex
} from 'viem';
import type { SmartAccountConfig, SmartAccount } from './types';
import { env } from '../env';

// Contract addresses (deployed to Sepolia testnet)
export const FACTORY_ADDRESS = '0xB8D779eeEF173c6dBC3a28f0Dec73e48cBE6411C' as const; // Deployed on Sepolia testnet
export const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;

export const sepolia = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://eth-sepolia.public.blastapi.io'] },
    public: { http: ['https://eth-sepolia.public.blastapi.io'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
} as const;

export async function createSmartAccount(
  config: SmartAccountConfig, 
  accountIndex?: number
): Promise<SmartAccount> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  // Calculate salt from email, public key, and optional account index
  const salt = calculateSalt(config.email, config.publicKey, accountIndex);
  
  // Calculate deterministic address using CREATE2
  const address = await calculateSmartAccountAddress(config.publicKey, salt);

  // Check if already deployed
  let isDeployed = false;
  try {
    const code = await client.getBytecode({ address });
    isDeployed = code !== undefined && code !== '0x' && code.length > 2;
    
    if (isDeployed) {
      console.log('Smart account already deployed at:', address);
    } else {
      console.log('Smart account not yet deployed. Will deploy on first transaction.');
    }
  } catch (error) {
    console.warn('Failed to check deployment status:', error);
    isDeployed = false;
  }

  // Get current nonce if deployed
  let nonce = 0n;
  if (isDeployed) {
    try {
      // Call entryPoint.getNonce(address, 0) for the account
      const nonceData = await client.readContract({
        address: ENTRYPOINT_ADDRESS,
        abi: [
          {
            name: 'getNonce',
            type: 'function',
            inputs: [
              { name: 'sender', type: 'address' },
              { name: 'key', type: 'uint192' },
            ],
            outputs: [{ name: 'nonce', type: 'uint256' }],
          },
        ],
        functionName: 'getNonce',
        args: [address, 0n],
      }) as bigint;
      
      nonce = nonceData;
      console.log('Current account nonce:', nonce);
    } catch (error) {
      console.warn('Failed to get nonce:', error);
    }
  }

  return {
    address,
    publicKey: config.publicKey,
    email: config.email,
    isDeployed,
    nonce,
  };
}

export function calculateSalt(email: string, publicKey: string, nonce?: number): Hex {
  // Salt generation with optional nonce for multiple accounts
  const nonceValue = nonce || 0; // Default to 0 for first account
  const data = encodeAbiParameters(
    parseAbiParameters('string, bytes, uint256'),
    [email, publicKey as Hex, BigInt(nonceValue)]
  );
  return keccak256(data);
}

export async function calculateSmartAccountAddress(
  publicKey: string,
  salt: Hex
): Promise<Hex> {
  // Ensure publicKey is properly formatted as hex
  let publicKeyHex: Hex;
  
  if (publicKey.startsWith('0x')) {
    // Already hex encoded
    publicKeyHex = publicKey as Hex;
  } else {
    // Might be base64 or other format, convert to hex
    try {
      // If it's base64 JSON, decode it
      const decoded = atob(publicKey);
      if (decoded.startsWith('{')) {
        // It's JSON, extract x and y coordinates
        const keyData = JSON.parse(decoded);
        const x = keyData.x || [];
        const y = keyData.y || [];
        publicKeyHex = ('0x' + 
          x.map((b: number) => b.toString(16).padStart(2, '0')).join('') +
          y.map((b: number) => b.toString(16).padStart(2, '0')).join('')) as Hex;
      } else {
        // Direct conversion
        publicKeyHex = ('0x' + Buffer.from(publicKey, 'base64').toString('hex')) as Hex;
      }
    } catch (e) {
      console.error('Failed to parse public key:', e);
      // Fallback - generate deterministic but invalid key
      publicKeyHex = keccak256(toHex(publicKey)) as Hex;
    }
  }

  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  // Factory is deployed, no need for mock address fallback

  try {
    // Call factory.getAddress(publicKey, salt)
    const address = await client.readContract({
      address: FACTORY_ADDRESS,
      abi: [
        {
          name: 'getAddress',
          type: 'function',
          inputs: [
            { name: 'publicKey', type: 'bytes' },
            { name: 'salt', type: 'bytes32' },
          ],
          outputs: [{ name: '', type: 'address' }],
        },
      ],
      functionName: 'getAddress',
      args: [publicKeyHex, salt],
    }) as Hex;
    
    return address;
  } catch (error) {
    console.error('Failed to calculate address:', error);
    // Fallback to mock
    const mockAddress = keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes, bytes32'),
        [publicKeyHex, salt]
      )
    ).slice(0, 42) as Hex;
    return mockAddress;
  }
}

export function generateInitCode(account: SmartAccount): Hex {
  if (account.isDeployed) {
    return '0x';
  }

  const salt = calculateSalt(account.email, account.publicKey);
  
  // Ensure publicKey is properly formatted as hex
  let publicKeyHex: Hex;
  
  if (account.publicKey.startsWith('0x')) {
    publicKeyHex = account.publicKey as Hex;
  } else {
    try {
      const decoded = atob(account.publicKey);
      if (decoded.startsWith('{')) {
        const keyData = JSON.parse(decoded);
        const x = keyData.x || [];
        const y = keyData.y || [];
        publicKeyHex = ('0x' + 
          x.map((b: number) => b.toString(16).padStart(2, '0')).join('') +
          y.map((b: number) => b.toString(16).padStart(2, '0')).join('')) as Hex;
      } else {
        publicKeyHex = ('0x' + Buffer.from(account.publicKey, 'base64').toString('hex')) as Hex;
      }
    } catch (e) {
      publicKeyHex = keccak256(toHex(account.publicKey)) as Hex;
    }
  }
  
  // Encode createAccount function call for new factory interface
  const initCalldata = encodeFunctionData({
    abi: [
      {
        name: 'createAccount',
        type: 'function',
        inputs: [
          { name: 'publicKey', type: 'bytes' },
          { name: 'salt', type: 'bytes32' },
        ],
        outputs: [{ name: 'account', type: 'address' }],
      },
    ],
    functionName: 'createAccount',
    args: [publicKeyHex, salt],
  });

  // InitCode format: factory address + calldata
  return (FACTORY_ADDRESS + initCalldata.slice(2)) as Hex;
}

export async function getAccountBalance(address: Hex): Promise<bigint> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  try {
    const balance = await client.getBalance({ address });
    return balance;
  } catch (error) {
    console.error('Failed to get balance:', error);
    return 0n;
  }
}

export async function estimateDeploymentCost(): Promise<{
  estimatedGas: bigint;
  gasPrice: bigint;
  totalCost: bigint;
}> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  try {
    const gasPrice = await client.getGasPrice();
    // Typical smart account deployment gas
    const estimatedGas = 300000n;
    const totalCost = estimatedGas * gasPrice;

    return {
      estimatedGas,
      gasPrice,
      totalCost,
    };
  } catch (error) {
    console.error('Failed to estimate deployment cost:', error);
    return {
      estimatedGas: 300000n,
      gasPrice: 1000000000n, // 1 gwei fallback
      totalCost: 300000000000000n,
    };
  }
}

export async function checkEntryPointDeployment(): Promise<boolean> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  try {
    const code = await client.getBytecode({ address: ENTRYPOINT_ADDRESS });
    const isDeployed = code !== undefined && code !== '0x' && code.length > 2;
    
    if (!isDeployed) {
      console.error('EntryPoint not deployed on XLayer!');
    }
    
    return isDeployed;
  } catch (error) {
    console.error('Failed to check EntryPoint deployment:', error);
    return false;
  }
}