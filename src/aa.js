require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { u8aToHex } = require('@polkadot/util');

async function initializeAPI() {
  console.log('Initializing API...');
  if (!process.env.RPC_URL) {
    throw new Error('RPC_URL is not set in the environment variables');
  }
  const wsProvider = new WsProvider(process.env.RPC_URL);
  const api = await Promise.race([
    ApiPromise.create({ provider: wsProvider }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('API initialization timeout')), 30000))
  ]);
  console.log('API initialized successfully.');
  return api;
}

async function decodeError(api, error) {
  if (error.isModule) {
    const { index, error: errorData } = error.asModule;
    const metadata = await api.rpc.state.getMetadata();
    const errorMeta = metadata.asLatest.pallets[index]?.errors[errorData];
    if (errorMeta) {
      return `${errorMeta.name}: ${errorMeta.documentation.join(' ')}`;
    } else {
      return `Unknown error: index ${index}, error ${errorData}`;
    }
  } else {
    return error.toString();
  }
}

async function deployContract(api, substrateAccount) {
  console.log('Loading contract JSON...');
  let contractJson;
  try {
    contractJson = require('./MockUSDT.json');
    console.log('Contract JSON loaded successfully.');
  } catch (error) {
    throw new Error('Failed to load MockUSDT.json. Make sure the file exists in the correct location.');
  }
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  console.log('Creating EVM deployment transaction...');
  const evmAddress = u8aToHex(substrateAccount.publicKey.slice(0, 20));
  const salt = '0x' + '00'.repeat(32);
  const value = '0';
  const gasLimit = '3000000';
  const maxFeePerGas = api.createType('u256', 1000000000);
  const maxPriorityFeePerGas = api.createType('u256', 1000000000);
  console.log('Fetching nonce...');
  const nonce = await api.rpc.system.accountNextIndex(substrateAccount.address);
  console.log('Nonce:', nonce.toString());
  const accessList = [];

  console.log('Creating evm.create2 transaction...');
  const evmDeployTx = api.tx.sudo.sudo(
    api.tx.evm.create2(
      evmAddress,
      bytecode,
      salt,
      value,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      accessList
    )
  );

  console.log('Signing and sending transaction...');
  return new Promise((resolve, reject) => {
    evmDeployTx.signAndSend(substrateAccount, { nonce }, async ({ status, events, dispatchError }) => {
      console.log(`Current status: ${status.type}`);
      if (dispatchError) {
        console.error('Dispatch error:', dispatchError);
        const decodedError = await decodeError(api, dispatchError);
        console.error(`Transaction failed with dispatch error: ${decodedError}`);
        reject(new Error(`Transaction failed: ${decodedError}`));
      } else if (status.isInBlock) {
        console.log(`Transaction included in block: ${status.asInBlock}`);
        events.forEach(({ event }) => {
          const { section, method, data } = event;
          console.log(`Event: ${section}.${method}:: ${data.toString()}`);
          if (section === 'evm' && method === 'Created') {
            const [creator, contract] = data;
            console.log(`Contract deployed at: ${contract.toHex()}`);
            resolve(contract.toHex());
          }
        });
      } else if (status.isFinalized) {
        console.log('Transaction finalized.');
        events.forEach(({ event }) => {
          const { section, method, data } = event;
          console.log(`Event: ${section}.${method}:: ${data.toString()}`);
        });
        resolve('Transaction finalized without EVM Created event.');
      }
    }).catch(async error => {
      console.error('Error sending transaction:', error);
      const decodedError = await decodeError(api, error);
      console.error(`Failed to send transaction: ${decodedError}`);
      reject(new Error(`Failed to send transaction: ${decodedError}`));
    });
  });
}

async function testTransaction(api, substrateAccount) {
  console.log('Creating test transaction...');
  const transfer = api.tx.balances.transfer('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', '1000000000000');

  console.log('Signing and sending test transaction...');
  return new Promise((resolve, reject) => {
    transfer.signAndSend(substrateAccount, ({ status }) => {
      console.log(`Current status: ${status.type}`);
      if (status.isInBlock) {
        console.log(`Transaction included at blockHash ${status.asInBlock}`);
        resolve();
      }
    }).catch(error => {
      console.error(`Failed to send test transaction: ${error.message}`);
      reject(new Error(`Failed to send test transaction: ${error.message}`));
    });
  });
}

async function main() {
  try {
    console.log('Starting deployment process...');
    await cryptoWaitReady();

    if (!process.env.MNEMONIC) {
      throw new Error('MNEMONIC is not set in the environment variables');
    }

    const api = await initializeAPI();

    const keyring = new Keyring({ type: 'sr25519' });
    let substrateAccount;
    try {
      substrateAccount = keyring.addFromUri(process.env.MNEMONIC);
    } catch (error) {
      throw new Error(`Failed to create account from mnemonic: ${error.message}`);
    }
    console.log('Substrate account:', substrateAccount.address);
    console.log('Derived EVM address:', u8aToHex(substrateAccount.publicKey.slice(0, 20)));

    // Uncomment the following line to run the test transaction instead of contract deployment
    // await testTransaction(api, substrateAccount);

    const contractAddress = await deployContract(api, substrateAccount);
    console.log('Deployment completed. Contract address:', contractAddress);
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    process.exit();
  }
}

main().catch(console.error);