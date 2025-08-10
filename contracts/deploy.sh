#!/bin/bash

# Load environment variables
source .env

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}OneClick DeFi Deployment Script${NC}"
echo "=================================="

# Check if private key is set
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" == "your_private_key_here_without_0x_prefix" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env file${NC}"
    echo "Please add your private key to the .env file"
    exit 1
fi

# Select network
echo "Select deployment network:"
echo "1) XLayer Testnet"
echo "2) XLayer Mainnet"
read -p "Enter choice (1 or 2): " NETWORK_CHOICE

case $NETWORK_CHOICE in
    1)
        NETWORK="xlayer_testnet"
        RPC_URL=$XLAYER_TESTNET_RPC_URL
        CHAIN_ID=$XLAYER_TESTNET_CHAIN_ID
        echo -e "${YELLOW}Deploying to XLayer Testnet...${NC}"
        ;;
    2)
        NETWORK="xlayer"
        RPC_URL=$XLAYER_RPC_URL
        CHAIN_ID=$XLAYER_CHAIN_ID
        echo -e "${YELLOW}Deploying to XLayer Mainnet...${NC}"
        echo -e "${RED}WARNING: This will deploy to mainnet!${NC}"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            echo "Deployment cancelled"
            exit 0
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Build contracts
echo -e "\n${YELLOW}Building contracts...${NC}"
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed${NC}"
    exit 1
fi

# Deploy contracts
echo -e "\n${YELLOW}Deploying contracts...${NC}"
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvvv

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Deployment successful!${NC}"
    echo "Check the console output above for deployed contract addresses"
else
    echo -e "\n${RED}Deployment failed${NC}"
    exit 1
fi