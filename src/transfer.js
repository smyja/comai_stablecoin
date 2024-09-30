require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { BN } = require('@polkadot/util');

async function transferTokens() {
  // Initialize the provider to connect to the local node
  const wsProvider = new WsProvider(process.env.RPC_URL);
  
  // Create the API instance
  const api = await ApiPromise.create({ provider: wsProvider });

  // Log the connected chain
  console.log('Connected to chain:', await api.rpc.system.chain());

  // Initialize the keyring and add the sender account
  const keyring = new Keyring({ type: 'sr25519' });
  const sender = keyring.addFromUri(process.env.MNEMONIC);
  
  // Define the recipient address and transfer amount
  const recipientAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'; // Replace with actual recipient address
  const transferAmount = new BN('1000'); // Adjust the amount as needed

  console.log(`Attempting to transfer ${transferAmount.toString()} from ${sender.address} to ${recipientAddress}`);

  // Return a promise that resolves when the transaction is finalized
  return new Promise((resolve, reject) => {
    // Create the transferKeepAlive extrinsic
    const transfer = api.tx.balances.transferKeepAlive(recipientAddress, transferAmount);

    // Sign and send the transaction with a callback to handle status updates
    transfer.signAndSend(sender, (result) => {
      if (result.status.isInBlock) {
        console.log(`Included at blockHash ${result.status.asInBlock}`);
      } else if (result.status.isFinalized) {
        console.log(`Finalized at blockHash ${result.status.asFinalized}`);

        // Fetch and log the events associated with the finalized block
        api.query.system.events.at(result.status.asFinalized)
          .then((events) => {
            console.log(`\nEvents in block ${result.status.asFinalized}:`);
            events.forEach(({ event, phase }) => {
              const { method, section } = event;
              console.log(`\t' ${phase}: ${section}.${method}:: ${event.meta.docs.join(' ')}`);
            });
            resolve();
          })
          .catch((err) => {
            console.error('Error fetching events:', err);
            reject(err);
          });
      } else if (result.isError) {
        console.error(`Transaction failed: ${result.status}`);
        reject(new Error(`Transaction failed: ${result.status}`));
      }
    }).catch((error) => {
      console.error('Error signing and sending:', error);
      reject(error);
    });
  }).finally(async () => {
    // Disconnect from the API once the transaction is handled
    await api.disconnect();
    console.log('Disconnected from the API');
  });
}

async function main() {
  try {
    await transferTokens();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Execute the main function
main().catch(console.error);