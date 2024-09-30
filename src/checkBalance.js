const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { decodeAddress, encodeAddress } = require('@polkadot/util-crypto');
const { u8aToHex } = require('@polkadot/util');
require('dotenv').config();

async function checkBalance() {
  const wsProvider = new WsProvider(process.env.RPC_URL);
  const api = await ApiPromise.create({ provider: wsProvider });

  // Check chain properties
  const properties = await api.rpc.system.properties();
  console.log("Chain properties:", properties.toHuman());

  // Try to detect SS58 format
  const ss58Format = properties.ss58Format.unwrapOr(42).toNumber();
  console.log(`Detected SS58 format: ${ss58Format}`);

  // Create keyring with detected format
  const keyring = new Keyring({ type: 'sr25519', ss58Format });

  // Add account from mnemonic
  const deployer = keyring.addFromUri(process.env.MNEMONIC);

  // Log different address representations
  console.log(`Deployer address (detected format): ${deployer.address}`);
  console.log(`Deployer public key: ${u8aToHex(deployer.publicKey)}`);

  // Try encoding with different formats
  [0, 1, 2, 42].forEach(format => {
    const encodedAddress = encodeAddress(deployer.publicKey, format);
    console.log(`Address with format ${format}: ${encodedAddress}`);
  });

  // Check balance
  const { data: balance } = await api.query.system.account(deployer.address);

  console.log(`Balance: ${balance.free} (free), ${balance.reserved} (reserved)`);
  
  await api.disconnect();
}

checkBalance().catch(console.error);