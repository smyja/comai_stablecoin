// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../contracts/MockUSDT.sol";

contract DeployMockUSDT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockUSDT mockUSDT = new MockUSDT(1000000 * 10**6); // 1 million USDT with 6 decimals

        vm.stopBroadcast();
    }
}