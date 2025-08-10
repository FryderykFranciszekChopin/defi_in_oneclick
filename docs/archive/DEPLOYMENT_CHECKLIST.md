# OneClick DeFi - Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Setup
- [ ] Install Foundry: `curl -L https://foundry.paradigm.xyz | bash`
- [ ] Run `foundryup` to get latest version
- [ ] Set up `.env` file with:
  ```
  PRIVATE_KEY=your_deployer_private_key
  XLAYER_RPC_URL=https://rpc.xlayer.tech
  ETHERSCAN_API_KEY=your_etherscan_api_key
  ```

### 2. Contract Verification
- [ ] Run tests: `forge test -vvv`
- [ ] Check gas usage: `forge test --gas-report`
- [ ] Run coverage: `forge coverage`

### 3. Audit Checklist
- [ ] Verify all external calls are protected
- [ ] Check reentrancy guards
- [ ] Validate signature verification logic
- [ ] Test edge cases for session keys
- [ ] Ensure proper access control

## Deployment Steps

### 1. Deploy to XLayer Testnet (Chain ID: 195)
```bash
# First, test on testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://testnet.xlayer.tech \
  --broadcast \
  --verify \
  -vvvv
```

### 2. Verify Deployment
- [ ] Check all contracts deployed successfully
- [ ] Verify contracts on block explorer
- [ ] Test factory can create accounts
- [ ] Test WebAuthn signature validation

### 3. Integration Testing
- [ ] Deploy a test account via factory
- [ ] Execute a transaction with Passkey signature
- [ ] Test session key functionality
- [ ] Verify paymaster integration

### 4. Deploy to XLayer Mainnet (Chain ID: 196)
```bash
# Deploy to mainnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $XLAYER_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### 5. Post-Deployment
- [ ] Update `deployed-addresses.json` with contract addresses
- [ ] Update frontend factory address in `lib/smart-account/factory.ts`
- [ ] Configure Pimlico with deployed contracts
- [ ] Test end-to-end flow on mainnet

## Critical Checks

### Security
- [ ] Deployer wallet has no remaining permissions
- [ ] All contracts verified on explorer
- [ ] No hardcoded private keys or secrets
- [ ] Proper event emissions for monitoring

### Integration
- [ ] Pimlico bundler configured correctly
- [ ] Paymaster funded and operational
- [ ] Frontend can interact with contracts
- [ ] Gas estimation accurate

### Documentation
- [ ] Update README with deployed addresses
- [ ] Document any configuration changes
- [ ] Create user guide for Passkey setup
- [ ] Prepare demo video/screenshots

## Emergency Procedures

### If Deployment Fails
1. Check gas prices and wallet balance
2. Verify RPC endpoint is responsive
3. Check for contract size limits
4. Review deployment logs for errors

### Rollback Plan
1. Keep previous version addresses
2. Frontend can switch between versions
3. Have upgrade mechanism ready

## Contact Information
- Technical Lead: [Your contact]
- Smart Contract Dev: [Your contact]
- DevOps: [Your contact]
- Emergency: [24/7 contact]

## Final Checklist
- [ ] All tests passing
- [ ] Security review completed
- [ ] Gas optimization done
- [ ] Documentation updated
- [ ] Team briefed on deployment
- [ ] Monitoring setup
- [ ] Backup plan ready

## Notes
- XLayer EntryPoint: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- Deployment estimated gas: ~3M gas units
- Keep 0.1 OKB in deployer wallet for safety