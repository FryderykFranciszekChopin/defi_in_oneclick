# OneClick DeFi Smart Contracts

## Overview

This directory contains the smart contracts for OneClick DeFi, an Account Abstraction (ERC-4337) implementation with Passkey/WebAuthn support for the XLayer blockchain.

## Architecture

### Core Contracts

1. **OneClickAccount.sol**
   - ERC-4337 compliant smart account
   - Supports WebAuthn/Passkey authentication
   - Integrates with session key module
   - Handles transaction execution

2. **OneClickFactory.sol**
   - Deploys OneClickAccount instances using CREATE2
   - Ensures deterministic addresses based on email + passkey
   - Manages account creation and initialization

3. **SessionKeyModule.sol**
   - Enables temporary delegation keys
   - Supports spending limits and restrictions
   - Allows gasless transactions for specific operations

### Libraries

1. **P256Verifier.sol**
   - Handles P256 elliptic curve signature verification
   - Used for WebAuthn/Passkey validation
   - Supports precompile when available

### Interfaces

1. **IEntryPoint.sol**
   - ERC-4337 EntryPoint interface
   - Handles UserOperation validation and execution

2. **IAccount.sol**
   - Standard interface for smart accounts
   - Required by ERC-4337 specification

3. **UserOperation.sol**
   - Struct definition for ERC-4337 operations
   - Used throughout the system

## Key Features

### 1. Passkey Authentication
- Users authenticate using biometric/device passkeys
- No need to manage private keys
- Signatures verified on-chain using P256 curve

### 2. Account Abstraction
- Gasless transactions via Pimlico paymaster
- Bundled operations for efficiency
- Full ERC-4337 compliance

### 3. Session Keys
- Temporary keys with restrictions
- Spending limits per session
- Target contract/function restrictions

### 4. Deterministic Deployment
- Same address across deployments
- Based on email + passkey combination
- Uses CREATE2 for predictability

## Deployment

### Prerequisites
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Deploy to XLayer
```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export XLAYER_RPC_URL=https://rpc.xlayer.tech

# Run deployment
forge script script/Deploy.s.sol:DeployScript --rpc-url $XLAYER_RPC_URL --broadcast -vvvv
```

### Verify Contracts
```bash
forge verify-contract <CONTRACT_ADDRESS> OneClickAccount --chain-id 196
```

## Testing

```bash
# Run all tests
forge test

# Run with gas report
forge test --gas-report

# Run specific test
forge test --match-test testCreateAccount -vvv
```

## Security Considerations

1. **Signature Verification**
   - P256 signatures must be properly validated
   - Consider using audited libraries in production

2. **Access Control**
   - Only EntryPoint can call certain functions
   - Session keys have strict limitations

3. **Replay Protection**
   - Nonces prevent replay attacks
   - UserOperation hash includes chain ID

4. **Upgrade Safety**
   - Contracts are non-upgradeable by design
   - New features via modules only

## Integration

### Frontend Integration
```typescript
// Create account
const account = await factory.createAccount(publicKey, salt);

// Generate UserOperation
const userOp = {
  sender: account,
  nonce: await getNonce(account),
  initCode: isDeployed ? '0x' : getInitCode(),
  callData: encodeCallData(target, value, data),
  // ... gas limits and fees
};

// Sign with Passkey
const signature = await signWithPasskey(userOp);
```

### Pimlico Integration
- Configure bundler URL
- Set up paymaster for gas sponsorship
- Monitor UserOperation status

## Gas Optimization

1. **Deployment**: ~300,000 gas
2. **Transfer**: ~50,000 gas
3. **Swap**: ~150,000 gas
4. **Session Key**: ~80,000 gas

## Auditing

### Areas to Review
1. Signature verification logic
2. Session key validation
3. Reentrancy protection
4. Access control modifiers

### Known Limitations
- P256Verifier uses simplified validation in demo
- WebAuthn full spec not implemented
- Session keys need comprehensive testing

## Support

For questions or issues:
- GitHub Issues: [your-repo/issues]
- Documentation: [docs-link]
- Discord: [discord-invite]