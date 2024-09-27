# Subspace EVM Contract Deployment

This project demonstrates deploying an EVM-compatible smart contract on a **Substrate-based blockchain** with EVM support (such as Subspace). The project uses a simple mock USDT token contract written in Solidity and deploys it via the Substrate EVM pallet.

## Table of Contents

- [Subspace EVM Contract Deployment](#subspace-evm-contract-deployment)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [Contract Compilation](#contract-compilation)
  - [Contract Deployment](#contract-deployment)
  - [Check Balance](#check-balance)
  - [Interact with Deployed Contract](#interact-with-deployed-contract)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)

## Overview

This project compiles and deploys a simple ERC-20-compatible token contract (MockUSDT) on the **Subspace** blockchain testnet or mainnet, which supports EVM-based smart contracts.

## Requirements

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/en/) (version 16.x or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Subspace RPC URL for testnet or mainnet (available in `.env` file)
- Solidity compiler (`solc`) for contract compilation

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file:**

   Create a `.env` file in the root directory to store your RPC URL and mnemonic for the deployer account:

   ```bash
   touch .env
   ```

   Add the following content:

   ```env
   RPC_URL=wss://testnet.api.communeai.net
   MNEMONIC="your wallet mnemonic here"
   ```

## Contract Compilation

1. **Compile the smart contract** using the following command:

   ```bash
   node src/compile.js
   ```

   This will compile the `MockUSDT.sol` contract and output the ABI and bytecode in the `MockUSDT.json` file.

2. **Check the compilation output** to ensure the contract compiled successfully. The ABI and bytecode should be generated in `MockUSDT.json`.

## Contract Deployment

1. **Deploy the contract** to the Subspace EVM-compatible chain:

   ```bash
   node src/deploy.js
   ```

   - The script will deploy the contract using the account derived from the mnemonic in the `.env` file.
   - If successful, the terminal will output the Ethereum-compatible contract address.

2. **Confirm the deployment** by checking the logs. You should see a message indicating successful deployment and the contract address.

## Check Balance

Before deploying, ensure the deployer account has enough native tokens (e.g., COMAI) to cover transaction fees:

1. **Check balance** using the provided balance check script:

   ```bash
   node src/checkBalance.js
   ```

   The output will display the deployer address and its current balance.

## Interact with Deployed Contract

Once the contract is deployed, you can interact with it using the ABI and contract address. You can write additional scripts to:

- **Mint new tokens**
- **Burn tokens**
- **Transfer tokens to another address**

These interactions can be done using the `web3.js` or `ethers.js` libraries, or through Polkadot.js.

## Troubleshooting

- **1010: Invalid Transaction: Inability to pay fees**: Ensure your deployer account has sufficient balance to cover transaction fees. Add more funds to the deployer account if necessary.
- **Compilation errors**: If you encounter issues during compilation, ensure you have the correct Solidity version and OpenZeppelin dependencies.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

This **README** provides instructions on compiling, deploying, and interacting with the contract on a Substrate-based EVM chain. Let me know if you'd like to add anything specific!