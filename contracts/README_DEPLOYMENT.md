# Foundry Deployment Guide

## Prerequisites

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
forge install
```

## Configuration

1. **Set up your private key**:
   - Copy `.env.example` to `.env`
   - Replace `your_private_key_here_without_0x_prefix` with your actual private key (without the 0x prefix)
   - **IMPORTANT**: Never commit your `.env` file to version control!

2. **Configure network settings** (optional):
   - The `foundry.toml` file contains network RPC URLs
   - Update these if you need to use different RPC endpoints

## Deployment Methods

### Method 1: Using Makefile (Recommended)

```bash
# Deploy to testnet
make deploy-testnet

# Deploy to mainnet
make deploy-mainnet

# Deploy without contract verification (faster)
make deploy-testnet-fast
make deploy-mainnet-fast
```

### Method 2: Using Shell Script

```bash
# Make the script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. Check your private key configuration
2. Ask you to select testnet or mainnet
3. Build and deploy the contracts
4. Verify contracts on the block explorer

### Method 3: Direct Forge Commands

```bash
# Deploy to XLayer Testnet
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://testrpc.xlayer.tech \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvvv

# Deploy to XLayer Mainnet
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://rpc.xlayer.tech \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvvv
```

## Post-Deployment

1. **Save contract addresses**: After deployment, save the deployed contract addresses from the console output
2. **Verify contracts**: If you deployed without verification, you can verify later using:
   ```bash
   make verify
   ```
3. **Update frontend**: Update your frontend configuration with the new contract addresses

## Security Notes

- **Never share your private key**
- **Always test on testnet first**
- **Double-check network selection before mainnet deployment**
- **Keep your `.env` file secure and never commit it to git**

## Troubleshooting

1. **"PRIVATE_KEY not set" error**: Make sure you've created `.env` file and added your private key
2. **Build failures**: Run `forge clean` and then `forge build`
3. **Deployment failures**: Check your account has enough native tokens for gas fees
4. **Verification failures**: Ensure your `ETHERSCAN_API_KEY` is set correctly