// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

interface IEntryPoint {
    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    event AccountDeployed(
        bytes32 indexed userOpHash,
        address indexed sender,
        address factory,
        address paymaster
    );

    event UserOperationRevertReason(
        bytes32 indexed userOpHash,
        address indexed sender,
        uint256 nonce,
        bytes revertReason
    );

    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external;

    function getUserOpHash(
        UserOperation calldata userOp
    ) external view returns (bytes32);

    function getSenderAddress(
        bytes calldata initCode
    ) external;

    function depositTo(address account) external payable;

    function balanceOf(address account) external view returns (uint256);

    function withdrawTo(
        address payable withdrawAddress,
        uint256 withdrawAmount
    ) external;
}