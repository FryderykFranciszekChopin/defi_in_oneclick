# OKX DEX API Integration Guide

## Overview
OneClick DeFi integrates OKX DEX API to provide best-in-class swap execution across 500+ DEXs and 20+ chains.

## API Endpoints Used

### 1. Quote Endpoint
```
GET https://www.okx.com/api/v5/dex/aggregator/quote
```
- Gets the best available quote for a token swap
- Returns exchange rate, gas estimates, and routing information

### 2. Swap Endpoint
```
GET https://www.okx.com/api/v5/dex/aggregator/swap
```
- Generates transaction data for executing the swap
- Includes router address, calldata, and value

## Implementation Details

### Authentication
All requests require HMAC SHA256 signature with:
- `OK-ACCESS-KEY`: API key from OKX
- `OK-ACCESS-SIGN`: HMAC signature
- `OK-ACCESS-TIMESTAMP`: ISO 8601 timestamp
- `OK-ACCESS-PASSPHRASE`: API passphrase

### Quote Flow
1. User enters swap amount
2. Call `/quote` endpoint with:
   - chainId: 196 (XLayer)
   - fromTokenAddress
   - toTokenAddress
   - amount
3. Display quote with exchange rate and gas savings

### Swap Flow
1. User confirms quote
2. Call `/swap` endpoint to get transaction data
3. Create UserOperation with swap calldata
4. Execute via Smart Account (gasless)

## XLayer Integration

### Why XLayer?
- **Ultra-low fees**: Validium architecture
- **OKB native token**: Seamless OKX ecosystem integration
- **EVM compatible**: Deploy existing Ethereum dApps
- **High performance**: Off-chain data availability

### Smart Account on XLayer
```solidity
// Deploy address calculation
address = CREATE2(
    factory,
    keccak256(email + publicKey),
    bytecode
)
```

### Gasless Execution
1. User signs with Passkey
2. Bundler sponsors gas via Paymaster
3. Transaction executed on XLayer
4. User pays $0 in gas fees

## Security Considerations

1. **API Keys**: Server-side only, never exposed to client
2. **Signatures**: All API calls authenticated with HMAC
3. **Slippage Protection**: Default 1% with user control
4. **Transaction Simulation**: Validate before execution

## Testing

### Local Development
```bash
# Set environment variables
cp .env.local.example .env.local

# Add your OKX API credentials
OKX_API_KEY=your_key
OKX_SECRET_KEY=your_secret
OKX_PASSPHRASE=your_passphrase

# Run development server
npm run dev
```

### Test Swap Flow
1. Create account with email
2. Get quote for OKB → USDC
3. Execute gasless swap
4. Verify on XLayer explorer

## Production Deployment

### API Rate Limits
- Quote: 10 requests/second
- Swap: 5 requests/second
- Use caching for repeated quotes

### Error Handling
- Retry failed requests with exponential backoff
- Fallback to cached quotes if API unavailable
- Clear error messages for users

### Monitoring
- Track API response times
- Monitor swap success rates
- Alert on repeated failures

## Benefits for Users

1. **Best Prices**: Aggregates 500+ DEXs
2. **Zero Gas**: All fees sponsored
3. **One Click**: Email to swap in seconds
4. **Multi-chain**: Access 60+ chains from one interface

## Future Enhancements

1. **Cross-chain Swaps**: Leverage OKX bridge integration
2. **Limit Orders**: Schedule swaps at target prices
3. **Portfolio Tracking**: Multi-chain balance aggregation
4. **Mobile App**: Native iOS/Android with Passkey support