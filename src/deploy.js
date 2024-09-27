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
  const keccakHash = keccakAsU8a(deployer.publicKey); // Keccak-256 hash of the public key
  const ethAddress = u8aToHex(keccakHash.slice(-20)); // Use the last 20 bytes of the Keccak hash

  console.log(`Ethereum-compatible address: ${ethAddress}`);

  // Fetch the nonce (transaction count) from the Substrate account
  const { nonce } = await api.query.system.account(deployer.address);

  // Use BigInt for gas-related values
  const gasLimit = BigInt(1000000); // Lower the gas limit to 1 million gas units
  const maxFeePerGas = BigInt(500000000); // 0.5 gwei
  const maxPriorityFeePerGas = null; // Set priority fee to null  
  const value = BigInt(0); // No ETH sent with the contract deployment
  const accessList = []; // No access list

  try {
    // Use the EVM pallet to create the contract
    const unsub = await api.tx.evm
      .create(
        ethAddress, // Source address (in H160 format)
        bytecode, // Contract bytecode
        value, // Value to transfer to contract (0)
        gasLimit, // Gas limit
        maxFeePerGas, // Max fee per gas (BigInt)
        maxPriorityFeePerGas, // Max priority fee per gas (set to `None`)
        nonce.toBigInt(), // Nonce fetched from system.account
        accessList // Empty access list
      )
      .signAndSend(deployer, ({ status, events }) => {
        if (status.isInBlock) {
          console.log('Contract included in block:', status.asInBlock.toHex());
        } else if (status.isFinalized) {
          console.log('Contract successfully finalized');
          events.forEach(({ event }) => {
            if (event.method === 'Created') {
              console.log('Contract deployed at:', event.data.toHuman());
            }
          });
        }
      });

    console.log('Contract deployment initiated successfully');
    unsub();
  } catch (error) {
    console.error('Deployment failed:', error);
  }

  await api.disconnect();
}

deployContract().catch(console.error);
