# XLayer Deployment Guide

## Prerequisites

1. **Get OKB Tokens**
   - Visit: https://www.okx.com/xlayer/faucet
   - Get test OKB for gas fees
   - Or bridge OKB from mainnet

2. **Setup Wallet**
   ```bash
   # Install dependencies
   npm install ethers hardhat @nomicfoundation/hardhat-toolbox
   ```

3. **Configure Environment**
   ```bash
   # .env
   XLAYER_PRIVATE_KEY=your_private_key
   XLAYER_RPC_URL=https://rpc.xlayer.tech
   ```

## Deployment Steps

### 1. Deploy Smart Contracts

```bash
# Run deployment script
npx hardhat run scripts/deploy-xlayer.js --network xlayer
```

### 2. Verify Contracts

```bash
# Verify on XLayer Explorer
npx hardhat verify --network xlayer CONTRACT_ADDRESS
```

### 3. Test Gasless Transactions

```javascript
// Test script
const { ethers } = require('ethers');

async function testGaslessSwap() {
  // 1. Connect to XLayer
  const provider = new ethers.JsonRpcProvider('https://rpc.xlayer.tech');
  
  // 2. Create Smart Account
  const smartAccount = await createSmartAccount({
    email: 'test@example.com',
    chainId: 196,
  });
  
  // 3. Execute gasless swap
  const tx = await executeGaslessSwap({
    account: smartAccount,
    fromToken: 'OKB',
    toToken: 'USDC',
    amount: '1',
  });
  
  console.log('Transaction:', tx);
}
```

## XLayer Network Details

- **Chain ID**: 196
- **RPC URL**: https://rpc.xlayer.tech
- **Explorer**: https://www.okx.com/explorer/xlayer
- **Gas Token**: OKB
- **Block Time**: ~3 seconds

## Smart Contract Addresses

### Core Infrastructure
- **EntryPoint**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- **Factory**: `0x5de4839a76cf55d0c90e2061ef4386d962E15ae3`
- **Paymaster**: `0x0000000000325602a77416A16136FDafd04b299f`

### OKX Infrastructure
- **OKX DEX Router**: `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`
- **OKX Bridge**: `0xceE7c026942241a0C50214c909266103dA3d5963`

## Testing Checklist

- [ ] Deploy factory contract
- [ ] Create test Smart Account
- [ ] Fund with test OKB
- [ ] Execute gasless swap
- [ ] Verify on explorer
- [ ] Test session keys
- [ ] Test cross-chain swap
- [ ] Test MEV protection

## Mainnet Deployment

1. **Audit Contracts**
   - Use Certik or similar
   - Fix any issues

2. **Update Configuration**
   ```javascript
   const MAINNET_CONFIG = {
     factory: '0x...', // Deploy new factory
     paymaster: '0x...', // Production paymaster
     minBalance: '0.1', // Minimum OKB balance
   };
   ```

3. **Progressive Rollout**
   - Start with limited users
   - Monitor gas usage
   - Scale gradually

## Monitoring

### Key Metrics
- Smart Account creation rate
- Swap success rate
- Gas savings per user
- Cross-chain usage

### Tools
- XLayer Explorer: Transaction monitoring
- Pimlico Dashboard: Bundler metrics
- Custom analytics: User behavior

## Troubleshooting

### Common Issues

1. **"Insufficient OKB"**
   - Get OKB from faucet
   - Check paymaster balance

2. **"Invalid signature"**
   - Verify passkey implementation
   - Check signature format

3. **"Transaction underpriced"**
   - Increase gas price
   - Use priority fee

### Debug Commands

```bash
# Check balance
cast balance ADDRESS --rpc-url https://rpc.xlayer.tech

# Send test transaction
cast send ADDRESS --value 0.01ether --rpc-url https://rpc.xlayer.tech

# Call contract
cast call CONTRACT "balanceOf(address)" ADDRESS --rpc-url https://rpc.xlayer.tech
```

## Support

- XLayer Docs: https://www.okx.com/xlayer/docs
- Discord: https://discord.gg/okx
- Technical Support: xlayer@okx.com