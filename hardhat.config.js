require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts-hardhat"
  },
  networks: {
    sepolia: {
      url: "https://eth-sepolia.public.blastapi.io",
      accounts: ["0x4883a8fd611148c2eeda5397693e12fba45b939e22375d4f9a469b62d1f1c882"]
    },
    xlayer: {
      url: "https://testrpc.xlayer.tech",
      accounts: ["0x4883a8fd611148c2eeda5397693e12fba45b939e22375d4f9a469b62d1f1c882"],
      gasPrice: 20000000000, // 20 gwei
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      xlayer: process.env.XLAYER_API_KEY
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 195,
        urls: {
          apiURL: "https://www.okx.com/explorer/xlayer-test/api",
          browserURL: "https://www.okx.com/explorer/xlayer-test"
        }
      }
    ]
  }
};