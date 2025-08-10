// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EllipticCurve.sol";

/**
 * @title P256Verifier
 * @notice Simplified P256 signature verification using precompile
 * @dev Uses the P256VERIFY precompile available on some chains
 */
library P256Verifier {
    // Address of P256VERIFY precompile (if available)
    address constant P256VERIFY = address(0x100);
    
    /**
     * @dev Verify a P256 signature using precompile if available
     * @param hash The message hash to verify
     * @param r The r value of the signature
     * @param s The s value of the signature  
     * @param qx The x coordinate of the public key
     * @param qy The y coordinate of the public key
     * @return True if signature is valid
     */
    function verify(
        bytes32 hash,
        uint256 r,
        uint256 s,
        uint256 qx,
        uint256 qy
    ) internal view returns (bool) {
        // Check if precompile is available
        uint256 size;
        address precompile = P256VERIFY;
        assembly {
            size := extcodesize(precompile)
        }
        
        if (size > 0) {
            // Use precompile
            bytes memory input = abi.encode(hash, r, s, qx, qy);
            (bool success, bytes memory result) = P256VERIFY.staticcall(input);
            
            if (success && result.length == 32) {
                return abi.decode(result, (bool));
            }
        }
        
        // Fallback: Use EllipticCurve library for verification
        return EllipticCurve.verifySignature(uint256(hash), r, s, qx, qy);
    }
    
    /**
     * @dev Extract public key coordinates from uncompressed public key
     * @param publicKey 64-byte uncompressed public key (without 0x04 prefix)
     * @return qx The x coordinate
     * @return qy The y coordinate
     */
    function extractPublicKey(bytes memory publicKey) 
        internal 
        pure 
        returns (uint256 qx, uint256 qy) 
    {
        require(publicKey.length == 64, "Invalid public key length");
        
        assembly {
            qx := mload(add(publicKey, 32))
            qy := mload(add(publicKey, 64))
        }
    }
}