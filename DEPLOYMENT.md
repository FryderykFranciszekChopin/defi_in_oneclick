# OneClick DeFi Deployment Guide

## Prerequisites

1. **Development Environment**
   ```bash
   # Install dependencies
   npm install
   
   # Install Foundry for smart contract deployment
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment Variables**
   Create `.env.local` file:
   ```env
   # OKX API Credentials
   OKX_API_KEY=your-api-key
   OKX_SECRET_KEY=your-secret-key
   OKX_PASSPHRASE=your-passphrase
   
   # Pimlico API Key (for bundler & paymaster)
   NEXT_PUBLIC_PIMLICO_API_KEY=your-pimlico-api-key
   
   # XLayer RPC
   XLAYER_RPC_URL=https://rpc.xlayer.tech
   NEXT_PUBLIC_XLAYER_CHAIN_ID=196
   ```

## Smart Contract Deployment

### 1. Deploy Contracts

```bash
# Navigate to contracts directory
cd contracts

# Deploy OneClickAccount implementation
forge create --rpc-url $XLAYER_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" \
  --verify \
  src/OneClickAccount.sol:OneClickAccount

# Deploy Factory
forge create --rpc-url $XLAYER_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/OneClickFactory.sol:OneClickFactory

# Deploy SessionKeyModule
forge create --rpc-url $XLAYER_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/SessionKeyModule.sol:SessionKeyModule
```

### 2. Update Configuration

After deployment, update the contract addresses in:
- `lib/smart-account/factory.ts`
- `deployment.config.json`

```typescript
// lib/smart-account/factory.ts
export const FACTORY_ADDRESS = '0x...'; // Your deployed factory
export const IMPLEMENTATION_ADDRESS = '0x...'; // Your deployed implementation
```

### 3. Verify EntryPoint

Check if ERC-4337 EntryPoint is deployed on XLayer:

```bash
cast code 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 --rpc-url https://rpc.xlayer.tech
```

If not deployed, you'll need to deploy it or use a different EntryPoint.

## Infrastructure Setup

### 1. Pimlico Configuration

1. Sign up at [pimlico.io](https://pimlico.io)
2. Create a new project for XLayer (Chain ID: 196)
3. Get your API key
4. Configure sponsorship policy:
   ```javascript
   // Example sponsorship policy
   {
     "sponsorshipPolicyId": "sp_cheerful_thing",
     "rules": [
       {
         "type": "contract_address",
         "addresses": ["0x..."] // Your router contracts
       },
       {
         "type": "gas_limit",
         "maxGasLimit": "500000"
       }
     ]
   }
   ```

### 2. OKX API Setup

1. Log in to OKX
2. Go to API management
3. Create new API key with:
   - Trading permissions
   - Read-only access
4. Whitelist your server IP (if applicable)

## Frontend Deployment

### 1. Build Application

```bash
# Build for production
npm run build

# Test production build locally
npm run start
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 3. Environment Variables on Vercel

Add all environment variables from `.env.local` to your Vercel project settings.

## Testing Gasless Transactions

### 1. Fund Paymaster

Ensure your Pimlico paymaster has sufficient balance:
- Check balance: https://dashboard.pimlico.io
- Minimum recommended: 0.1 ETH on XLayer

### 2. Test Flow

```javascript
// Test script
const testGaslessSwap = async () => {
  // 1. Create account
  const account = await createSmartAccount({
    email: "test@example.com",
    publicKey: "0x...",
    chainId: 196
  });
  
  // 2. Check deployment
  console.log("Account deployed:", account.isDeployed);
  
  // 3. Test swap
  const userOp = await createUserOperationForSwap({
    account,
    fromToken: USDT_ADDRESS,
    toToken: OKB_ADDRESS,
    amount: parseUnits("10", 6),
    minAmountOut: 0n,
    swapData: "0x..."
  });
  
  // 4. Execute gasless
  const opHash = await executeGaslessOperation({
    account,
    userOp,
    passkeyId: "test-passkey"
  });
  
  console.log("UserOp Hash:", opHash);
};
```

## Monitoring

### 1. Transaction Monitoring

- XLayer Explorer: https://www.okx.com/explorer/xlayer
- Pimlico Dashboard: https://dashboard.pimlico.io

### 2. Error Tracking

```javascript
// Add error tracking
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to monitoring service
});
```

### 3. Performance Monitoring

```javascript
// Track UserOp performance
const start = Date.now();
const opHash = await executeGaslessOperation(options);
const duration = Date.now() - start;
console.log(`UserOp took ${duration}ms`);
```

## Troubleshooting

### Common Issues

1. **"EntryPoint not deployed"**
   - Verify EntryPoint address on XLayer
   - May need to deploy your own

2. **"Paymaster sponsorship failed"**
   - Check Pimlico balance
   - Verify sponsorship policy
   - Check API key permissions

3. **"UserOp signature invalid"**
   - Ensure passkey is properly registered
   - Check signature encoding format
   - Verify challenge matches userOpHash

4. **"Smart account deployment failed"**
   - Ensure factory is deployed
   - Check CREATE2 address calculation
   - Verify constructor arguments

### Debug Mode

Enable debug logging:
```javascript
// In your app
localStorage.setItem('DEBUG', 'true');

// Check console for detailed logs
```

## Security Checklist

- [ ] Smart contracts audited
- [ ] API keys secured (server-side only)
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Passkey storage encrypted
- [ ] SSL/TLS enabled
- [ ] Security headers configured

## Production Readiness

1. **Performance**
   - [ ] Bundle size optimized
   - [ ] Images optimized
   - [ ] Code splitting implemented
   - [ ] Caching configured

2. **Reliability**
   - [ ] Error boundaries added
   - [ ] Retry logic implemented
   - [ ] Fallback UI for failures
   - [ ] Health check endpoint

3. **Monitoring**
   - [ ] APM configured
   - [ ] Alerts set up
   - [ ] Logs aggregated
   - [ ] Metrics tracked

## Support

- Technical Issues: GitHub Issues
- Security: security@oneclick-defi.com
- Business: hello@oneclick-defi.com