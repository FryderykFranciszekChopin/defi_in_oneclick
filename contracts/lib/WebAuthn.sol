// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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
        if (x >= P256_P || y >= P256_P) {
            return false;
        }
        
        uint256 lhs = mulmod(y, y, P256_P);
        uint256 rhs = addmod(
            addmod(
                mulmod(mulmod(x, x, P256_P), x, P256_P),
                mulmod(P256_A, x, P256_P),
                P256_P
            ),
            P256_B,
            P256_P
        );
        
        return lhs == rhs;
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
        // Calculate s^-1
        uint256 sInv = modInverse(s, P256_N);
        
        // Calculate u1 = message * s^-1 mod n
        uint256 u1 = mulmod(message, sInv, P256_N);
        
        // Calculate u2 = r * s^-1 mod n
        uint256 u2 = mulmod(r, sInv, P256_N);
        
        // Calculate point R = u1*G + u2*Q
        (uint256 rx,) = ecAdd(
            ecMul(P256_GX, P256_GY, u1),
            ecMul(qx, qy, u2)
        );
        
        // Verify r == rx mod n
        return r == (rx % P256_N);
    }

    /**
     * @dev Modular inverse using extended Euclidean algorithm
     */
    function modInverse(uint256 a, uint256 m) internal pure returns (uint256) {
        if (a == 0) return 0;
        
        int256 lm = 1;
        int256 hm = 0;
        uint256 low = a % m;
        uint256 high = m;
        
        while (low > 1) {
            uint256 ratio = high / low;
            int256 nm = hm - int256(ratio) * lm;
            uint256 new_ = high - ratio * low;
            
            hm = lm;
            lm = nm;
            high = low;
            low = new_;
        }
        
        return uint256(lm + int256(m)) % m;
    }

    /**
     * @dev Elliptic curve point multiplication (simplified)
     * Note: In production, use a proper elliptic curve library
     */
    function ecMul(uint256 px, uint256 py, uint256 scalar) internal pure returns (uint256, uint256) {
        // Simplified implementation - in production use double-and-add algorithm
        if (scalar == 0) return (0, 0);
        if (scalar == 1) return (px, py);
        
        // This is a placeholder - implement proper scalar multiplication
        return (px, py);
    }

    /**
     * @dev Elliptic curve point addition (simplified)
     * Note: In production, use a proper elliptic curve library
     */
    function ecAdd(
        uint256 px1, uint256 py1,
        uint256 px2, uint256 py2
    ) internal pure returns (uint256, uint256) {
        // Handle identity cases
        if (px1 == 0 && py1 == 0) return (px2, py2);
        if (px2 == 0 && py2 == 0) return (px1, py1);
        
        // This is a placeholder - implement proper point addition
        return (px1, py1);
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
     * @dev Base64 URL encode (simplified)
     */
    function base64UrlEncode(bytes memory data) internal pure returns (string memory) {
        // Simplified implementation - in production use proper base64url encoding
        return string(data);
    }
}