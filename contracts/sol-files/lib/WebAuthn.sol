// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EllipticCurve.sol";

/**
 * @title WebAuthn
 * @notice Library for verifying WebAuthn/Passkey signatures
 * @dev Implements P256 signature verification for passkeys
 */
library WebAuthn {
    // P256 curve parameters
    uint256 constant P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
    uint256 constant P256_P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 constant P256_A = P256_P - 3;
    uint256 constant P256_B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B;
    uint256 constant P256_GX = 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296;
    uint256 constant P256_GY = 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5;

    /**
     * @dev Verify a WebAuthn P256 signature
     * @param authenticatorData The authenticator data from WebAuthn response
     * @param clientDataJSON The client data JSON from WebAuthn response
     * @param challengeIndex Index of challenge in clientDataJSON
     * @param typeIndex Index of type in clientDataJSON
     * @param r The r value of the signature
     * @param s The s value of the signature
     * @param qx The x coordinate of the public key
     * @param qy The y coordinate of the public key
     * @param challenge The expected challenge (userOpHash)
     */
    function verify(
        bytes memory authenticatorData,
        string memory clientDataJSON,
        uint256 challengeIndex,
        uint256 typeIndex,
        uint256 r,
        uint256 s,
        uint256 qx,
        uint256 qy,
        bytes32 challenge
    ) internal pure returns (bool) {
        // Verify signature values are in valid range
        if (r == 0 || r >= P256_N || s == 0 || s >= P256_N) {
            return false;
        }

        // Verify public key is on curve
        if (!isOnCurve(qx, qy)) {
            return false;
        }

        // Verify clientDataJSON contains correct type and challenge
        bytes memory clientDataBytes = bytes(clientDataJSON);
        
        // Check type at typeIndex
        if (!checkSubstring(clientDataBytes, typeIndex, '"webauthn.get"')) {
            return false;
        }
        
        // Check challenge at challengeIndex
        string memory challengeBase64 = base64UrlEncode(abi.encodePacked(challenge));
        if (!checkSubstring(clientDataBytes, challengeIndex, challengeBase64)) {
            return false;
        }

        // Create message hash from authenticatorData and clientDataJSON hash
        bytes32 clientDataHash = sha256(clientDataBytes);
        bytes32 message = sha256(abi.encodePacked(authenticatorData, clientDataHash));

        // Verify signature using P256 curve
        return verifyP256Signature(uint256(message), r, s, qx, qy);
    }

    /**
     * @dev Check if a point is on the P256 curve
     */
    function isOnCurve(uint256 x, uint256 y) internal pure returns (bool) {
        return EllipticCurve.isOnCurve(x, y);
    }

    /**
     * @dev Verify P256 ECDSA signature
     * @param message The message hash
     * @param r Signature r value
     * @param s Signature s value  
     * @param qx Public key x coordinate
     * @param qy Public key y coordinate
     */
    function verifyP256Signature(
        uint256 message,
        uint256 r,
        uint256 s,
        uint256 qx,
        uint256 qy
    ) internal pure returns (bool) {
        return EllipticCurve.verifySignature(message, r, s, qx, qy);
    }


    /**
     * @dev Check if a substring exists at a specific index
     */
    function checkSubstring(
        bytes memory str,
        uint256 index,
        string memory substr
    ) internal pure returns (bool) {
        bytes memory substrBytes = bytes(substr);
        
        if (index + substrBytes.length > str.length) {
            return false;
        }
        
        for (uint256 i = 0; i < substrBytes.length; i++) {
            if (str[index + i] != substrBytes[i]) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @dev Base64 URL encode
     */
    function base64UrlEncode(bytes memory data) internal pure returns (string memory) {
        string memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        
        if (data.length == 0) return "";
        
        // Calculate encoded length
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        
        // Add padding if necessary
        uint256 padLen = data.length % 3;
        if (padLen > 0) {
            encodedLen -= (3 - padLen);
        }
        
        bytes memory result = new bytes(encodedLen);
        
        uint256 dataPtr;
        uint256 resultPtr;
        
        assembly {
            dataPtr := add(data, 0x20)
            resultPtr := add(result, 0x20)
        }
        
        // Encode 3 bytes at a time
        for (uint256 i = 0; i < data.length / 3; i++) {
            uint256 chunk;
            assembly {
                chunk := mload(add(dataPtr, mul(i, 3)))
            }
            
            uint256 a = (chunk >> 232) & 0xFF;
            uint256 b = (chunk >> 224) & 0xFF;
            uint256 c = (chunk >> 216) & 0xFF;
            
            result[i * 4] = bytes(TABLE)[a >> 2];
            result[i * 4 + 1] = bytes(TABLE)[((a & 3) << 4) | (b >> 4)];
            result[i * 4 + 2] = bytes(TABLE)[((b & 15) << 2) | (c >> 6)];
            result[i * 4 + 3] = bytes(TABLE)[c & 63];
        }
        
        // Handle remaining bytes
        if (padLen == 1) {
            uint256 a = uint256(uint8(data[data.length - 1]));
            result[encodedLen - 2] = bytes(TABLE)[a >> 2];
            result[encodedLen - 1] = bytes(TABLE)[(a & 3) << 4];
        } else if (padLen == 2) {
            uint256 a = uint256(uint8(data[data.length - 2]));
            uint256 b = uint256(uint8(data[data.length - 1]));
            result[encodedLen - 3] = bytes(TABLE)[a >> 2];
            result[encodedLen - 2] = bytes(TABLE)[((a & 3) << 4) | (b >> 4)];
            result[encodedLen - 1] = bytes(TABLE)[(b & 15) << 2];
        }
        
        return string(result);
    }
}