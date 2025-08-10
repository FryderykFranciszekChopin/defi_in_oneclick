import { encodeFunctionData, parseEther, type Address, type Hex } from 'viem';
import type { SmartAccount, UserOperation } from './types';
import { generateInitCode } from './factory';

export interface SwapParams {
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  minAmount: bigint;
  recipient: Address;
  data: Hex;
}

export function createSwapUserOp(
  account: SmartAccount,
  swap: SwapParams,
  nonce: bigint = 0n
): Partial<UserOperation> {
  // Encode the swap call
  const callData = encodeFunctionData({
    abi: [
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
    ],
    functionName: 'execute',
    args: [swap.toToken, 0n, swap.data],
  });

  return {
    sender: account.address,
    nonce,
    initCode: generateInitCode(account),
    callData,
    callGasLimit: 300000n,
    verificationGasLimit: 600000n,
    preVerificationGas: 50000n,
    maxFeePerGas: parseEther('0.00001'),
    maxPriorityFeePerGas: parseEther('0.000001'),
    paymasterAndData: '0x' as Hex, // Will be filled by paymaster
    signature: '0x' as Hex, // Will be signed
  };
}

export function createTransferUserOp(
  account: SmartAccount,
  to: Address,
  amount: bigint,
  token?: Address,
  nonce: bigint = 0n
): Partial<UserOperation> {
  let callData: Hex;

  if (token) {
    // ERC20 transfer
    callData = encodeFunctionData({
      abi: [
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
      ],
      functionName: 'execute',
      args: [
        token,
        0n,
        encodeFunctionData({
          abi: [
            {
              name: 'transfer',
              type: 'function',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ type: 'bool' }],
            },
          ],
          functionName: 'transfer',
          args: [to, amount],
        }),
      ],
    });
  } else {
    // Native token transfer
    callData = encodeFunctionData({
      abi: [
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
      ],
      functionName: 'execute',
      args: [to, amount, '0x'],
    });
  }

  return {
    sender: account.address,
    nonce,
    initCode: generateInitCode(account),
    callData,
    callGasLimit: 100000n,
    verificationGasLimit: account.isDeployed ? 150000n : 600000n,
    preVerificationGas: 50000n,
    maxFeePerGas: parseEther('0.00001'),
    maxPriorityFeePerGas: parseEther('0.000001'),
    paymasterAndData: '0x' as Hex,
    signature: '0x' as Hex,
  };
}