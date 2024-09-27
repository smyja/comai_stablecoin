const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
require('dotenv').config();

async function checkBalance() {
  const wsProvider = new WsProvider(process.env.RPC_URL);
  const api = await ApiPromise.create({ provider: wsProvider });

  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(process.env.MNEMONIC);

  const { data: balance } = await api.query.system.account(deployer.address);

  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Balance: ${balance.free} (free), ${balance.reserved} (reserved)`);
  
  await api.disconnect();
}

checkBalance().catch(console.error);
