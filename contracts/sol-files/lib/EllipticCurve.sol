// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EllipticCurve
 * @notice Elliptic curve operations for P256 curve
 * @dev Implements proper point addition and scalar multiplication
 */
library EllipticCurve {
    // P256 curve parameters
    uint256 constant P256_P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
    uint256 constant P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
    uint256 constant P256_A = P256_P - 3;
    uint256 constant P256_B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B;
    uint256 constant P256_GX = 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296;
    uint256 constant P256_GY = 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5;

    /**
     * @dev Check if a point is on the P256 curve
     * @param x The x coordinate
     * @param y The y coordinate
     * @return True if the point is on the curve
     */
    function isOnCurve(uint256 x, uint256 y) internal pure returns (bool) {
        if (x >= P256_P || y >= P256_P) {
            return false;
        }
        
        // Check: y^2 = x^3 + ax + b (mod p)
        uint256 lhs = mulmod(y, y, P256_P);
        uint256 rhs = addmod(
            addmod(
                mulmod(mulmod(x, x, P256_P), x, P256_P), // x^3
                mulmod(P256_A, x, P256_P),                // ax
                P256_P
            ),
            P256_B,                                        // b
            P256_P
        );
        
        return lhs == rhs;
    }

    /**
     * @dev Modular inverse using Fermat's little theorem
     * @param a The number to invert
     * @return The modular inverse of a mod P256_P
     */
    function invMod(uint256 a) internal pure returns (uint256) {
        return expMod(a, P256_P - 2, P256_P);
    }

    /**
     * @dev Modular exponentiation
     * @param base The base
     * @param exp The exponent
     * @param mod The modulus
     * @return base^exp mod mod
     */
    function expMod(uint256 base, uint256 exp, uint256 mod) internal pure returns (uint256) {
        uint256 result = 1;
        base = base % mod;
        
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = mulmod(result, base, mod);
            }
            exp = exp >> 1;
            base = mulmod(base, base, mod);
        }
        
        return result;
    }

    /**
     * @dev Point doubling on P256 curve
     * @param x The x coordinate
     * @param y The y coordinate
     * @return x3 The x coordinate of 2P
     * @return y3 The y coordinate of 2P
     */
    function pointDouble(uint256 x, uint256 y) internal pure returns (uint256 x3, uint256 y3) {
        if (x == 0 && y == 0) {
            return (0, 0);
        }
        
        // λ = (3x² + a) / 2y
        uint256 numerator = addmod(
            mulmod(3, mulmod(x, x, P256_P), P256_P),
            P256_A,
            P256_P
        );
        uint256 denominator = mulmod(2, y, P256_P);
        uint256 lambda = mulmod(numerator, invMod(denominator), P256_P);
        
        // x3 = λ² - 2x
        x3 = addmod(
            mulmod(lambda, lambda, P256_P),
            P256_P - mulmod(2, x, P256_P),
            P256_P
        );
        
        // y3 = λ(x - x3) - y
        y3 = addmod(
            mulmod(lambda, addmod(x, P256_P - x3, P256_P), P256_P),
            P256_P - y,
            P256_P
        );
    }

    /**
     * @dev Point addition on P256 curve
     * @param x1 The x coordinate of point 1
     * @param y1 The y coordinate of point 1
     * @param x2 The x coordinate of point 2
     * @param y2 The y coordinate of point 2
     * @return x3 The x coordinate of P1 + P2
     * @return y3 The y coordinate of P1 + P2
     */
    function pointAdd(
        uint256 x1, uint256 y1,
        uint256 x2, uint256 y2
    ) internal pure returns (uint256 x3, uint256 y3) {
        // Handle identity cases
        if (x1 == 0 && y1 == 0) {
            return (x2, y2);
        }
        if (x2 == 0 && y2 == 0) {
            return (x1, y1);
        }
        
        // Handle point doubling
        if (x1 == x2) {
            if (y1 == y2) {
                return pointDouble(x1, y1);
            } else {
                // Points are inverses, return identity
                return (0, 0);
            }
        }
        
        // λ = (y2 - y1) / (x2 - x1)
        uint256 numerator = addmod(y2, P256_P - y1, P256_P);
        uint256 denominator = addmod(x2, P256_P - x1, P256_P);
        uint256 lambda = mulmod(numerator, invMod(denominator), P256_P);
        
        // x3 = λ² - x1 - x2
        x3 = addmod(
            addmod(
                mulmod(lambda, lambda, P256_P),
                P256_P - x1,
                P256_P
            ),
            P256_P - x2,
            P256_P
        );
        
        // y3 = λ(x1 - x3) - y1
        y3 = addmod(
            mulmod(lambda, addmod(x1, P256_P - x3, P256_P), P256_P),
            P256_P - y1,
            P256_P
        );
    }

    /**
     * @dev Scalar multiplication using double-and-add algorithm
     * @param x The x coordinate of the point
     * @param y The y coordinate of the point
     * @param scalar The scalar to multiply by
     * @return qx The x coordinate of scalar * P
     * @return qy The y coordinate of scalar * P
     */
    function scalarMul(
        uint256 x,
        uint256 y,
        uint256 scalar
    ) internal pure returns (uint256 qx, uint256 qy) {
        if (scalar == 0 || (x == 0 && y == 0)) {
            return (0, 0);
        }
        
        uint256 rx = 0;
        uint256 ry = 0;
        uint256 px = x;
        uint256 py = y;
        
        while (scalar > 0) {
            if (scalar & 1 == 1) {
                (rx, ry) = pointAdd(rx, ry, px, py);
            }
            (px, py) = pointDouble(px, py);
            scalar = scalar >> 1;
        }
        
        return (rx, ry);
    }

    /**
     * @dev Verify P256 ECDSA signature
     * @param hash The message hash
     * @param r Signature r value
     * @param s Signature s value
     * @param qx Public key x coordinate
     * @param qy Public key y coordinate
     * @return True if signature is valid
     */
    function verifySignature(
        uint256 hash,
        uint256 r,
        uint256 s,
        uint256 qx,
        uint256 qy
    ) internal pure returns (bool) {
        // Verify parameters are in valid range
        if (r == 0 || r >= P256_N || s == 0 || s >= P256_N) {
            return false;
        }
        
        // Verify public key is on curve
        if (!isOnCurve(qx, qy)) {
            return false;
        }
        
        // Calculate s^-1 mod n
        uint256 sInv = expMod(s, P256_N - 2, P256_N);
        
        // Calculate u1 = hash * s^-1 mod n
        uint256 u1 = mulmod(hash, sInv, P256_N);
        
        // Calculate u2 = r * s^-1 mod n
        uint256 u2 = mulmod(r, sInv, P256_N);
        
        // Calculate point R = u1*G + u2*Q
        (uint256 gx, uint256 gy) = scalarMul(P256_GX, P256_GY, u1);
        (uint256 qx2, uint256 qy2) = scalarMul(qx, qy, u2);
        (uint256 rx, ) = pointAdd(gx, gy, qx2, qy2);
        
        // Verify r == rx mod n
        return r == (rx % P256_N);
    }
}