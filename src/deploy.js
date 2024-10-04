require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { u8aToHex } = require('@polkadot/util');
const fs = require('fs');

// Load ABI and Bytecode from the compiled contract
const { abi, bytecode } = JSON.parse(fs.readFileSync('MockUSDT.json', 'utf8'));

/**
 * Converts a Substrate AccountId to an Ethereum H160 address.
 * This example takes the last 20 bytes of the AccountId.
 * Adjust the conversion logic if your network uses a different mapping.
 * 
 * @param {Uint8Array} accountIdBytes - The Substrate AccountId bytes (32 bytes).
 * @returns {string} - The Ethereum address (20 bytes) in hex format.
 */
function substrateToEthAddress(accountIdBytes) {
  if (accountIdBytes.length !== 32) {
    throw new Error('Invalid AccountId length');
  }
  // Extract the last 20 bytes
  const ethAddressBytes = accountIdBytes.slice(-20);
  return u8aToHex(ethAddressBytes);
}

async function deployContract() {
  const wsProvider = new WsProvider(process.env.RPC_URL);
  const api = await ApiPromise.create({ provider: wsProvider });

  console.log('Connected to node:', await api.rpc.system.chain());

  // Use 'sr25519' key type for Substrate development accounts
  const keyring = new Keyring({ type: 'sr25519' });

  // Verify PRIVATE_KEY is defined
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is not set.');
  }

  // Add the account from the mnemonic or private key
  const deployer = keyring.addFromUri(process.env.PRIVATE_KEY);
  console.log('Deploying from account:', deployer.address);

  // Debug: Log deployer's publicKey length
  console.log('Deployer public key length:', deployer.publicKey.length);
  console.log('Deployer public key:', u8aToHex(deployer.publicKey));

  // Convert Substrate AccountId to Ethereum H160 address
  const ethAddress = substrateToEthAddress(deployer.publicKey);
  console.log('Converted Ethereum address:', ethAddress);

  // Fetch the nonce (transaction count)
  const nonce = await api.rpc.system.accountNextIndex(deployer.address);
  console.log('Current nonce:', nonce.toString());

  // Use BigInt for gas-related values, ensure values are within appropriate ranges
  const gasLimit = BigInt(3000000); // Adjust as needed
  const maxFeePerGas = BigInt(2000000000); // 2 Gwei (increased from 1 Gwei)
  const maxPriorityFeePerGas = BigInt(2000000000); // 2 Gwei (increased from 1 Gwei)
  const value = BigInt(0); // No ETH sent with the contract deployment
  const accessList = []; // No access list

  // Create the EVM deployment extrinsic
  const evmCall = api.tx.evm.create(
    ethAddress,                     // Ethereum-compatible address (H160)
    bytecode,                       // Contract bytecode
    value,                          // ETH value to send
    gasLimit,                       // Gas limit
    maxFeePerGas,                  // Max fee per gas (increased)
    maxPriorityFeePerGas,          // Max priority fee per gas (increased)
    BigInt(nonce),                 // Nonce
    accessList                     // Access list
  );
  
  return new Promise((resolve, reject) => {
    evmCall.signAndSend(deployer, { signer: deployer }, ({ status, events, dispatchError }) => {
      console.log(`Transaction status: ${status.type}`);

      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          console.error(`${section}.${name}: ${docs.join(' ')}`);
        } else {
          console.error(dispatchError.toString());
        }
      }

      events.forEach(({ event: { method, section, data } }) => {
        console.log(`Event: ${section}.${method} - Data: ${data.toString()}`);
      });

      if (status.isFinalized) {
        console.log('Transaction finalized in block:', status.asFinalized.toHex());
        resolve('Contract deployment completed');
      }
    }).catch((error) => {
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