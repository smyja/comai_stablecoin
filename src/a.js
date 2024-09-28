const { ApiPromise, WsProvider } = require('@polkadot/api');

async function checkPendingTransactions() {
  // Connect to the node's WebSocket endpoint
  const wsProvider = new WsProvider('wss://testnet.api.communeai.net');
  const api = await ApiPromise.create({ provider: wsProvider });
  const latestBlockHash = await api.rpc.chain.getBlockHash();
  const latestBlock = await api.rpc.chain.getBlock(latestBlockHash);
  
  console.log('Latest block:', latestBlock.toHuman());
  
  try {
    // Fetch pending extrinsics (pending transactions in Substrate terminology)
    const pendingExtrinsics = await api.rpc.author.pendingExtrinsics();
    
    console.log('Pending extrinsics:', pendingExtrinsics.toHuman());
  } catch (error) {
    console.error('Error fetching pending extrinsics:', error);
  } finally {
    await api.disconnect();
  }
}

checkPendingTransactions();
