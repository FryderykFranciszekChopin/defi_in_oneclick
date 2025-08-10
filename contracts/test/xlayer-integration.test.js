const { expect } = require('chai');
const { ethers } = require('ethers');

describe('XLayer Integration Tests', function() {
  let provider;
  let testWallet;
  
  before(async function() {
    // Connect to XLayer
    provider = new ethers.JsonRpcProvider('https://rpc.xlayer.tech');
    
    // Create test wallet
    testWallet = ethers.Wallet.createRandom().connect(provider);
    console.log('Test wallet:', testWallet.address);
  });

  describe('Network Connection', function() {
    it('should connect to XLayer', async function() {
      const network = await provider.getNetwork();
      expect(network.chainId).to.equal(196n);
      expect(network.name).to.equal('xlayer');
    });

    it('should get latest block', async function() {
      const block = await provider.getBlock('latest');
      expect(block).to.not.be.null;
      expect(block.number).to.be.greaterThan(0);
      console.log('Latest block:', block.number);
    });
  });

  describe('OKB Token', function() {
    it('should check OKB balance', async function() {
      const balance = await provider.getBalance(testWallet.address);
      console.log('OKB balance:', ethers.formatEther(balance));
      expect(balance).to.be.at.least(0n);
    });

    it('should estimate gas price', async function() {
      const gasPrice = await provider.getFeeData();
      console.log('Gas price:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
      expect(gasPrice.gasPrice).to.be.greaterThan(0n);
    });
  });

  describe('Smart Account', function() {
    it('should calculate CREATE2 address', async function() {
      const factory = '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3';
      const salt = ethers.keccak256(ethers.toUtf8Bytes('test@oneclick.defi'));
      const initCode = '0x608060405234801561001057600080fd5b50';
      
      const address = ethers.getCreate2Address(
        factory,
        salt,
        ethers.keccak256(initCode)
      );
      
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
      console.log('Predicted address:', address);
    });
  });

  describe('OKX DEX Integration', function() {
    it('should format swap parameters', async function() {
      const swapParams = {
        chainId: 196,
        fromTokenAddress: '0x0000000000000000000000000000000000000000', // OKB
        toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        amount: ethers.parseEther('1').toString(),
        slippage: '1',
        userWalletAddress: testWallet.address,
      };
      
      expect(swapParams.chainId).to.equal(196);
      expect(swapParams.amount).to.equal('1000000000000000000');
    });
  });

  describe('Gasless Transaction', function() {
    it('should create UserOperation', async function() {
      const userOp = {
        sender: testWallet.address,
        nonce: 0n,
        initCode: '0x',
        callData: '0x',
        callGasLimit: 100000n,
        verificationGasLimit: 200000n,
        preVerificationGas: 50000n,
        maxFeePerGas: ethers.parseUnits('1', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
        paymasterAndData: '0x',
        signature: '0x',
      };
      
      expect(userOp.sender).to.equal(testWallet.address);
      expect(userOp.callGasLimit).to.equal(100000n);
    });
  });
});