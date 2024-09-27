require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

module.exports = {
  solidity: "0.8.4",
  networks: {
    commune: {
      url: process.env.RPC_URL || "https://testnet.api.communeai.net",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    }
  }
};