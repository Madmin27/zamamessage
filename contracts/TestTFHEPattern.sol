// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title TestTFHEPattern
/// @notice Zama'nın YENİ @fhevm/solidity@0.7.0 API'sini test eder
/// @dev FHE.fromExternal() pattern kullanır (OpenZeppelin benzeri)
contract TestTFHEPattern is SepoliaConfig {
    
    event ValueStored(address indexed user);
    
    mapping(address => euint64) private _encryptedValues;
    uint256 public testCount;
    
    /// @notice Değer saklar (Zama'nın transfer pattern'ı gibi)
    /// @param inputHandle Şifreli değer handle'ı (externalEuint64)
    /// @param inputProof ZKPoK kanıtı
    function storeValue(externalEuint64 inputHandle, bytes calldata inputProof) external {
        // YENİ API: FHE.fromExternal()
        euint64 value = FHE.fromExternal(inputHandle, inputProof);
        
        // Değeri kaydet
        _encryptedValues[msg.sender] = value;
        
        // ACL izinleri (Zama pattern'ı)
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
        
        testCount++;
        emit ValueStored(msg.sender);
    }
    
    /// @notice Değeri oku (şifreli)
    function getValue(address user) external view returns (euint64) {
        return _encryptedValues[user];
    }
    
    /// @notice Test counter'ı oku
    function getTestCount() external view returns (uint256) {
        return testCount;
    }
    
    // Not: fromExternal zaten proof doğrular. Ek isSenderAllowed guard'ı gereksiz olabilir.
}
