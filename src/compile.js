//compile.js
const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Path to the contract
const contractPath = path.resolve(__dirname, '../contracts', 'MockUSDT.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Import handler for external dependencies
function findImports(importPath) {
  if (importPath.startsWith('@openzeppelin')) {
    const openZeppelinPath = path.resolve(__dirname, '../node_modules', importPath);
    return { contents: fs.readFileSync(openZeppelinPath, 'utf8') };
  }
  return { error: 'File not found' };
}

const input = {
  language: 'Solidity',
  sources: {
    'MockUSDT.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
};

console.log('Compiling contract...');

try {
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  console.log('Compilation output:', JSON.stringify(output, null, 2));

  if (output.errors) {
    console.error('Compilation errors:', output.errors);
  }

  const contract = output.contracts['MockUSDT.sol']['MockUSDT'];

  if (!contract) {
    console.error('Contract not found in compilation output');
    process.exit(1);
  }

  console.log('ABI:', JSON.stringify(contract.abi));
  console.log('Bytecode:', contract.evm.bytecode.object);

  fs.writeFileSync('MockUSDT.json', JSON.stringify({
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object
  }, null, 2));

  console.log('Contract compiled successfully');
} catch (error) {
  console.error('Compilation failed:', error);
}
