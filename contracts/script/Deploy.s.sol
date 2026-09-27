// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {HaloPool} from "../src/HaloPool.sol";

/// Deploys HaloPool with demo parameters scaled for testnet USDC (PRD section 9 rules, smaller caps).
contract Deploy is Script {
    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        HaloPool.Params memory p = HaloPool.Params({
            feeBps: 100, // 1%
            minFee: 20_000, // 0.02 USDC
            leverage: 20,
            claimCap: 25e6,
            userCap: 50e6,
            newUserCap: 10e6,
            newUserPeriod: 7 days,
            feeWindow: 1 hours,
            claimWindow: 7 days,
            unbondDelay: 7 days
        });
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        HaloPool pool = new HaloPool(IERC20(usdc), operator, p);
        vm.stopBroadcast();
        console.log("HaloPool", address(pool));
    }
}
