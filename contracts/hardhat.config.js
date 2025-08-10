require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "./.env" });

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./sol-files",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    xlayer: {
      url: process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    xlayerTestnet: {
      url: "https://testrpc.xlayer.tech",
      chainId: 195,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      xlayer: process.env.ETHERSCAN_API_KEY || "abc",
      xlayerTestnet: process.env.ETHERSCAN_API_KEY || "abc",
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://api.oklink.com/api/v5/explorer/contract/verify-source-code",
          browserURL: "https://www.oklink.com/x-layer",
        },
      },
      {
        network: "xlayerTestnet",
        chainId: 195,
        urls: {
          apiURL: "https://testnet.xlayer.tech/api",
          browserURL: "https://testnet.xlayer.tech",
        },
      },
    ],
  },
};