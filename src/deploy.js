require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { keccakAsU8a } = require('@polkadot/util-crypto');
const { u8aToHex } = require('@polkadot/util');
const fs = require('fs');

// Load ABI and Bytecode from the compiled contract
const { abi, bytecode } = JSON.parse(fs.readFileSync('MockUSDT.json', 'utf8'));

async function deployContract() {
  const wsProvider = new WsProvider(process.env.RPC_URL);
  const api = await ApiPromise.create({ provider: wsProvider });

  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(process.env.MNEMONIC);

  // Hash the Substrate public key using Keccak256 and convert to H160
  const keccakHash = keccakAsU8a(deployer.publicKey);
  const ethAddress = u8aToHex(keccakHash.slice(-20));
  console.log(`Ethereum-compatible address: ${ethAddress}`);

  // Fetch the nonce (transaction count) from the Substrate account
  const { nonce } = await api.query.system.account(deployer.address);

  // Use BigInt for gas-related values
  const gasLimit = BigInt(10000000); // 4 million gas units
  const maxFeePerGas = BigInt(100000000000); // 100 gwei
  const maxPriorityFeePerGas = BigInt(20000000000); // 20 gwei
  const value = BigInt(0); // No ETH sent with the contract deployment
  const accessList = []; // No access list

  return new Promise((resolve, reject) => {
    api.tx.evm
      .create(
        ethAddress,
        bytecode,
        value,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce.toBigInt(),
        accessList
      )
      .signAndSend(deployer, ({ status, events }) => {
        console.log(`Transaction status: ${status.type}`);

        events.forEach(({ event: { method, section, data } }) => {
          console.log(`Event: ${section}.${method} - Data: ${data.toString()}`);
          if (section === 'evm' && method === 'Created') {
            const [contractAddress] = data;
            console.log('Contract deployed at:', contractAddress.toString());
          }
        });

        if (status.isInBlock) {
          console.log('Transaction included in block:', status.asInBlock.toHex());
        } else if (status.isFinalized) {
          console.log('Transaction finalized in block:', status.asFinalized.toHex());
          resolve('Contract deployment completed');
        }
      })
      .catch((error) => {
        console.error('Deployment failed:', error);
        reject(error);
      });
  });
}

async function main() {
  try {
    console.log('Starting contract deployment...');
    await deployContract();
    console.log('Deployment process completed.');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Ensure disconnection even if an error occurs
    if (global.api) {
      await global.api.disconnect();
      console.log('Disconnected from the node');
    }
  }
}

main().catch(console.error);