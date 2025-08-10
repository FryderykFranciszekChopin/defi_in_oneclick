import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  concat,
  pad,
  toHex,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { SmartAccount, UserOperation } from './types';
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
  const client = createPublicClient({
    chain: sepoliaTestnet,
    transport: http(),
  });

  try {
    const address = await client.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getAddress',
      args: [publicKey as Hex, salt],
    });
    
    return address as Address;
  } catch (error) {
    console.error('Failed to calculate address from factory:', error);
    // Fallback to local calculation if factory not available
    const initCodeHash = keccak256(
      concat([
        '0xff',
        FACTORY_ADDRESS,
        salt,
        keccak256(publicKey as Hex),
      ])
    );
    return ('0x' + initCodeHash.slice(-40)) as Address;
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
  
  // Create a simple transfer UserOp to trigger deployment
  const account: SmartAccount = {
    address: address as Hex,
    publicKey,
    email,
    isDeployed: false,
    nonce: 0n,
  };
  
  // Create UserOp that will deploy the account
  const userOp = await createUserOperation(
    account,
    address, // Send to self
    0n, // No value
    '0x', // No data
  );
  
  // Submit through bundler
  const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL;
  if (!bundlerUrl) {
    throw new Error('Bundler URL not configured');
  }
  
  try {
    const response = await fetch(bundlerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, ENTRYPOINT_ADDRESS],
      }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      console.error('Bundler error:', result.error);
      return { success: false, address };
    }
    
    console.log('UserOp submitted:', result.result);
    
    // Wait for confirmation
    const txHash = await waitForUserOp(result.result);
    
    return {
      success: true,
      address,
      txHash,
    };
  } catch (error) {
    console.error('Failed to deploy account:', error);
    return { success: false, address };
  }
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