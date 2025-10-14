// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title MinimalZamaTest
/// @notice En basit Zama FHE test sözleşmesi
/// @dev Sadece fromExternal() çağrısını test eder
contract MinimalZamaTest is SepoliaConfig {
    
    event TestSuccess(uint256 timestamp);
    event TestData(address sender, uint256 value);
    
    uint256 public testCount;
    
    /// @notice En basit fromExternal testi
    /// @param encryptedValue Şifreli değer (externalEuint64)
    /// @param inputProof ZKPoK kanıtı
    function testFromExternal(
        externalEuint64 encryptedValue,
        bytes calldata inputProof
    ) external returns (bool) {
        // 1. fromExternal çağrısı
        euint64 value = FHE.fromExternal(encryptedValue, inputProof);
        
        // 2. İzinleri ayarla
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
        
        // 3. Başarılı
        testCount++;
        emit TestSuccess(block.timestamp);
        emit TestData(msg.sender, testCount);
        
        return true;
    }
    
    /// @notice Sadece izin testi
    function testAllowOnly(
        externalEuint64 encryptedValue,
        bytes calldata inputProof
    ) external returns (bool) {
        euint64 value = FHE.fromExternal(encryptedValue, inputProof);
        FHE.allowThis(value);
        // msg.sender'a izin verme
        testCount++;
        return true;
    }
    
    /// @notice Constructor kontrolü
    function getProtocolId() external pure returns (uint256) {
        return 10001; // Sepolia için
    }
}
