// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISpendingLimitModule {
    function checkSpendingLimit(
        address account,
        address target,
        uint256 amount
    ) external returns (bool allowed, string memory reason);
}