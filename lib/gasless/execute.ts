import { type Hex, keccak256, encodePacked, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { SmartAccount, UserOperation } from '../smart-account/types';
import { BundlerClient } from './bundler';
import { paymasterClient } from './paymaster';
import { signWithPasskey } from './signer';
import { signWithPasskey as signMessage } from '../passkey-sign';
import { xlayer } from '../smart-account/factory';

const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as const;

export interface ExecuteOptions {
  account: SmartAccount;
  userOp: Partial<UserOperation>;
  passkeyId: string;
}

export async function executeGaslessOperation(options: ExecuteOptions): Promise<Hex> {
  const bundler = new BundlerClient();
  
  try {
    // 1. Estimate gas first (without paymaster)
    console.log('Estimating gas for UserOperation...');
    const gasEstimate = await bundler.estimateUserOperationGas(options.userOp);
    
    // 2. Build complete UserOperation
    const completeUserOp: UserOperation = {
      sender: options.userOp.sender!,
      nonce: options.userOp.nonce!,
      initCode: options.userOp.initCode || '0x',
      callData: options.userOp.callData!,
      callGasLimit: gasEstimate.callGasLimit,
      verificationGasLimit: gasEstimate.verificationGasLimit,
      preVerificationGas: gasEstimate.preVerificationGas,
      maxFeePerGas: gasEstimate.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
      paymasterAndData: '0x',
      signature: '0x', // Dummy signature for estimation
    };

    // 3. Get paymaster sponsorship
    console.log('Getting paymaster sponsorship...');
    const sponsorshipResult = await paymasterClient.sponsorUserOperation(
      completeUserOp,
      ENTRYPOINT_ADDRESS
    );
    
    // Update UserOp with sponsored gas values
    completeUserOp.paymasterAndData = sponsorshipResult.paymasterAndData;
    completeUserOp.preVerificationGas = sponsorshipResult.preVerificationGas;
    completeUserOp.verificationGasLimit = sponsorshipResult.verificationGasLimit;
    completeUserOp.callGasLimit = sponsorshipResult.callGasLimit;

    // 4. Calculate UserOp hash for signing
    const userOpHash = await getUserOpHash(completeUserOp, ENTRYPOINT_ADDRESS, xlayer.id);
    console.log('UserOp hash for signing:', userOpHash);

    // 5. Request user confirmation with passkey
    console.log('Requesting transaction approval with passkey...');
    const confirmationMessage = `Approve transaction:\nFrom: ${options.userOp.sender}\nOperation: Swap tokens\nNetwork: XLayer`;
    
    try {
      // First verify user with passkey
      const verification = await signMessage(confirmationMessage);
      console.log('User confirmed transaction with passkey');
      
      // Then sign the actual UserOp
      const signature = await signWithPasskey(userOpHash, options.passkeyId);
      completeUserOp.signature = signature;
    } catch (error: any) {
      if (error.message.includes('cancelled')) {
        throw new Error('Transaction cancelled by user');
      }
      throw error;
    }

    // 6. Send to bundler
    console.log('Sending UserOperation to bundler...');
    const opHash = await bundler.sendUserOperation(completeUserOp);
    console.log('UserOperation submitted:', opHash);
    
    return opHash;
  } catch (error: any) {
    console.error('Gasless operation failed:', error);
    
    // Provide user-friendly error messages
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Your smart account needs funding. Please add some ETH for deployment.');
    }
    if (error.message?.includes('already deployed')) {
      throw new Error('Smart account already deployed. Retrying without init code...');
    }
    if (error.message?.includes('paymaster')) {
      throw new Error('Gas sponsorship failed. The transaction will require gas fees.');
    }
    
    throw error;
  }
}

export async function getUserOpHash(
  userOp: UserOperation,
  entryPoint: Hex,
  chainId: number
): Promise<Hex> {
  // Pack the UserOperation struct
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

  // Create the final hash with EntryPoint address and chain ID
  const encoded = encodePacked(
    ['bytes32', 'address', 'uint256'],
    [keccak256(packed), entryPoint, BigInt(chainId)]
  );

  return keccak256(encoded);
}

export async function waitForTransaction(opHash: Hex): Promise<any> {
  const bundler = new BundlerClient();
  
  try {
    console.log('Waiting for transaction confirmation...');
    const receipt = await bundler.waitForUserOperationReceipt(opHash, 60000); // 60 second timeout
    
    if (!receipt.success) {
      throw new Error('Transaction failed on-chain');
    }
    
    console.log('Transaction confirmed:', receipt.receipt.transactionHash);
    return receipt;
  } catch (error: any) {
    console.error('Transaction wait failed:', error);
    
    if (error.message?.includes('timeout')) {
      throw new Error('Transaction is taking longer than expected. Please check the explorer.');
    }
    
    throw error;
  }
}

export async function checkPaymasterStatus(): Promise<{
  active: boolean;
  canSponsor: boolean;
  balance: string;
}> {
  try {
    const status = await paymasterClient.getSponsorshipStatus();
    
    return {
      active: status.active,
      canSponsor: status.active && status.balance > 0n,
      balance: (status.balance / 10n ** 18n).toString() + ' ETH',
    };
  } catch (error) {
    console.error('Failed to check paymaster status:', error);
    return {
      active: false,
      canSponsor: false,
      balance: '0 ETH',
    };
  }
}