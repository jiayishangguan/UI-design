require("@nomicfoundation/hardhat-toolbox");
require("solidity-docgen"); 
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  docgen: {
    path: './docs',      // Target directory for generated documentation
    clear: true,         // Whether to delete old documentation before generating new files
    runOnCompile: true,  // Automatically update docs whenever running 'npx hardhat compile'
    },
  networks: {
    hardhat: {
      // Local development network; default configuration is used
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts:
        process.env.DEPLOYER_PRIVATE_KEY !== undefined
          ? [process.env.DEPLOYER_PRIVATE_KEY]
          : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};
