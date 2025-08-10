# Foundry Makefile for OneClick DeFi

-include .env

.PHONY: all test clean deploy

# Default network
NETWORK ?= xlayer

# Build contracts
build:
	forge build

# Run tests
test:
	forge test -vvv

# Run tests with gas report
test-gas:
	forge test --gas-report

# Clean build artifacts
clean:
	forge clean

# Install dependencies
install:
	forge install openzeppelin/openzeppelin-contracts --no-commit
	forge install foundry-rs/forge-std --no-commit

# Deploy to XLayer
deploy-xlayer:
	forge script script/Deploy.s.sol:DeployScript \
		--rpc-url $(XLAYER_RPC_URL) \
		--broadcast \
		--verify \
		-vvvv

# Deploy to XLayer testnet
deploy-testnet:
	forge script script/Deploy.s.sol:DeployScript \
		--rpc-url https://testrpc.xlayer.tech \
		--broadcast \
		-vvvv

# Verify contract
verify:
	forge verify-contract \
		--chain-id 196 \
		--compiler-version v0.8.19+commit.7dd6d404 \
		$(CONTRACT_ADDRESS) \
		$(CONTRACT_NAME) \
		--etherscan-api-key $(ETHERSCAN_API_KEY)

# Check deployment size
size:
	forge build --sizes

# Run slither security analysis
slither:
	slither contracts/ --config-file slither.config.json

# Format code
format:
	forge fmt

# Update dependencies
update:
	forge update

# Deployment helper
help:
	@echo "Available commands:"
	@echo "  make build          - Build contracts"
	@echo "  make test           - Run tests"
	@echo "  make test-gas       - Run tests with gas report"
	@echo "  make deploy-xlayer  - Deploy to XLayer mainnet"
	@echo "  make deploy-testnet - Deploy to XLayer testnet"
	@echo "  make verify         - Verify deployed contract"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make format         - Format Solidity code"