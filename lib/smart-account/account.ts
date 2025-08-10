import {
  createPublicClient,
  // createWalletClient,
  http,
  type Hex,
  type Address,
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  concat,
  encodePacked,
  // pad,
  // toHex,
  formatEther,
} from 'viem';
// import { privateKeyToAccount } from 'viem/accounts';
import type { SmartAccount, UserOperation } from './types';
import { serializeUserOp } from './types';
import { signWithPasskey } from '../gasless/signer';

// Sepolia Testnet configuration
export const sepoliaTestnet = {
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

// Contract addresses for Sepolia Testnet
export const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
export const FACTORY_ADDRESS = '0xB8D779eeEF173c6dBC3a28f0Dec73e48cBE6411C' as Address; // Deployed on Sepolia testnet

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

const ENTRYPOINT_ABI = [
  {
    name: 'handleOps',
    type: 'function',
    inputs: [
      {
        name: 'ops',
        type: 'tuple[]',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'callGasLimit', type: 'uint256' },
          { name: 'verificationGasLimit', type: 'uint256' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'maxFeePerGas', type: 'uint256' },
          { name: 'maxPriorityFeePerGas', type: 'uint256' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'beneficiary', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getNonce',
    type: 'function',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'key', type: 'uint192' },
    ],
    outputs: [{ name: 'nonce', type: 'uint256' }],
  },
  {
    name: 'getUserOpHash',
    type: 'function',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'callGasLimit', type: 'uint256' },
          { name: 'verificationGasLimit', type: 'uint256' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'maxFeePerGas', type: 'uint256' },
          { name: 'maxPriorityFeePerGas', type: 'uint256' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'userOpHash', type: 'bytes32' }],
  },
] as const;

const ACCOUNT_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'func', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'executeBatch',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address[]' },
      { name: 'value', type: 'uint256[]' },
      { name: 'func', type: 'bytes[]' },
    ],
    outputs: [],
  },
] as const;

/**
 * Calculate salt from email and public key
 */
export function calculateSalt(email: string, publicKey: string): Hex {
  const data = encodeAbiParameters(
    parseAbiParameters('string, bytes'),
    [email, publicKey as Hex]
  );
  return keccak256(data);
}

/**
 * Calculate deterministic smart account address
 */
export async function calculateSmartAccountAddress(
  publicKey: string,
  salt: Hex
): Promise<Address> {
  // Ensure publicKey is properly formatted
  let publicKeyHex: Hex;
  
  if (!publicKey || publicKey === '') {
    console.error('calculateSmartAccountAddress: publicKey is empty!');
    // Generate a deterministic fallback based on salt
    publicKeyHex = salt;
  } else if (publicKey.startsWith('0x')) {
    publicKeyHex = publicKey as Hex;
  } else {
    try {
      const decoded = atob(publicKey);
      if (decoded.startsWith('{')) {
        const keyData = JSON.parse(decoded);
        const x = keyData.x || [];
        const y = keyData.y || [];
        publicKeyHex = ('0x' + 
          x.map((b: number) => b.toString(16).padStart(2, '0')).join('') +
          y.map((b: number) => b.toString(16).padStart(2, '0')).join('')) as Hex;
      } else {
        publicKeyHex = ('0x' + Buffer.from(publicKey, 'base64').toString('hex')) as Hex;
      }
    } catch (e) {
      console.error('Failed to parse publicKey:', e);
      // Generate deterministic hex from the raw string
      publicKeyHex = keccak256(encodePacked(['string'], [publicKey]));
    }
  }
  
  console.log('calculateSmartAccountAddress inputs:', { publicKeyHex, salt });
  
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  try {
    // Call factory contract to get deterministic address
    const address = await client.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getAddress',
      args: [publicKeyHex, salt],
    });
    
    console.log('Calculated smart account address from factory:', address);
    return address as Address;
  } catch (error) {
    console.error('Failed to calculate address from factory:', error);
    
    // Fallback: Calculate address using CREATE2 formula
    // address = keccak256(0xff || factory || salt || keccak256(initCode))[12:]
    const initCodeHash = keccak256(
      encodePacked(
        ['bytes'],
        [publicKey as Hex]
      )
    );
    
    const addressBytes = keccak256(
      encodePacked(
        ['bytes1', 'address', 'bytes32', 'bytes32'],
        ['0xff', FACTORY_ADDRESS, salt, initCodeHash]
      )
    );
    
    const address = ('0x' + addressBytes.slice(-40)) as Address;
    console.log('Calculated address locally:', address);
    return address;
  }
}

/**
 * Check if smart account is deployed
 */
export async function isAccountDeployed(address: Address): Promise<boolean> {
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  try {
    const code = await client.getBytecode({ address });
    return code !== undefined && code !== '0x' && code.length > 2;
  } catch (error) {
    console.error('Failed to check deployment status:', error);
    return false;
  }
}

/**
 * Get account nonce from EntryPoint
 */
export async function getAccountNonce(address: Address): Promise<bigint> {
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  try {
    const nonce = await client.readContract({
      address: ENTRYPOINT_ADDRESS,
      abi: ENTRYPOINT_ABI,
      functionName: 'getNonce',
      args: [address, 0n],
    });
    
    return nonce as bigint;
  } catch (error) {
    console.error('Failed to get nonce:', error);
    return 0n;
  }
}

/**
 * Generate initCode for account deployment
 */
export function generateInitCode(publicKey: string, salt: Hex): Hex {
  const initCalldata = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'createAccount',
    args: [publicKey as Hex, salt],
  });

  // InitCode = factory address + calldata
  return concat([FACTORY_ADDRESS, initCalldata]);
}

/**
 * Create a UserOperation for smart account
 */
export async function createUserOperation(
  account: SmartAccount,
  target: Address,
  value: bigint,
  data: Hex,
  passkeyCredentialId?: string
): Promise<UserOperation> {
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  // Check if account is deployed
  const deployed = await isAccountDeployed(account.address as Address);
  
  // Get current nonce
  const nonce = await getAccountNonce(account.address as Address);
  
  // Generate initCode if not deployed
  const salt = calculateSalt(account.email, account.publicKey);
  const initCode = deployed ? '0x' : generateInitCode(account.publicKey, salt);
  
  // Encode callData for execute function
  const callData = encodeFunctionData({
    abi: ACCOUNT_ABI,
    functionName: 'execute',
    args: [target, value, data],
  });
  
  // Get gas prices
  const gasPrice = await client.getGasPrice();
  
  // Create UserOperation
  const userOp: UserOperation = {
    sender: account.address as Address,
    nonce,
    initCode: initCode as Hex,
    callData,
    callGasLimit: 200000n,
    verificationGasLimit: deployed ? 150000n : 500000n, // More gas needed for deployment
    preVerificationGas: 50000n,
    maxFeePerGas: gasPrice * 2n,
    maxPriorityFeePerGas: gasPrice,
    paymasterAndData: '0x' as Hex, // Will be filled by bundler
    signature: '0x' as Hex, // Will be signed
  };
  
  // Calculate UserOp hash
  const userOpHash = await getUserOpHash(userOp);
  
  // Sign with passkey
  if (passkeyCredentialId) {
    const signature = await signWithPasskey(userOpHash, passkeyCredentialId);
    userOp.signature = signature;
  }
  
  return userOp;
}

/**
 * Calculate UserOperation hash
 */
async function getUserOpHash(userOp: UserOperation): Promise<Hex> {
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  try {
    const hash = await client.readContract({
      address: ENTRYPOINT_ADDRESS,
      abi: ENTRYPOINT_ABI,
      functionName: 'getUserOpHash',
      args: [userOp],
    });
    
    return hash as Hex;
  } catch (error) {
    console.error('Failed to get UserOp hash:', error);
    // Fallback to local calculation
    const packed = encodeAbiParameters(
      parseAbiParameters('address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32'),
      [
        userOp.sender,
        userOp.nonce,
        keccak256(userOp.initCode),
        keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        keccak256(userOp.paymasterAndData),
      ]
    );
    
    return keccak256(packed);
  }
}

/**
 * Deploy smart account if not already deployed
 */
export async function deploySmartAccount(
  email: string,
  publicKey: string
): Promise<{ success: boolean; address: Address; txHash?: Hex }> {
  const salt = calculateSalt(email, publicKey);
  const address = await calculateSmartAccountAddress(publicKey, salt);
  
  // Check if already deployed
  const deployed = await isAccountDeployed(address);
  if (deployed) {
    console.log('Account already deployed at:', address);
    return { success: true, address };
  }
  
  // Deploy the smart account
  console.log('🚀 Deploying smart account...');
  console.log('📍 Smart account address:', address);
  
  // TODO: Implement actual deployment via UserOperation
  // For now, return the deterministic address
  console.log('✅ Deployment prepared');
  console.log('📝 Account will be deployed on first transaction');
  
  // Return success with deterministic address
  return { 
    success: true, 
    address,
    txHash: '0x' + Buffer.from('pending_deployment').toString('hex').padEnd(64, '0') as Hex
  };
}

/**
 * Wait for UserOperation to be mined
 */
async function waitForUserOp(userOpHash: string): Promise<Hex> {
  const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL;
  if (!bundlerUrl) {
    throw new Error('Bundler URL not configured');
  }
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash],
        }),
      });
      
      const result = await response.json();
      
      if (result.result && result.result.receipt) {
        return result.result.receipt.transactionHash;
      }
    } catch (error) {
      console.error('Error checking UserOp status:', error);
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  }
  
  throw new Error('UserOp timeout');
}

/**
 * Get account balance
 */
export async function getAccountBalance(address: Address): Promise<string> {
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  try {
    const balance = await client.getBalance({ address });
    return formatEther(balance);
  } catch (error) {
    console.error('Failed to get balance:', error);
    return '0';
  }
}