import { ethers } from "hardhat";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { applySepoliaRelayerOverrides } from "config/zamaSepolia";

/**
 * Zama konfigürasyonunu doğrulama scripti
 * Bu script şunları kontrol eder:
 * 1. SDK konfigürasyonu
 * 2. Sözleşme konfigürasyonu
 * 3. ACL/KMS adres eşleşmeleri
 * 4. Relayer bağlantısı
 * 5. Public key durumu
 */
async function main() {
  console.log("\n🔍 Zama FHE Konfigürasyon Doğrulama\n");
  console.log("=" .repeat(60));

  // 1. SDK Konfigürasyonunu Kontrol Et
  const relayerConfig = applySepoliaRelayerOverrides(SepoliaConfig);

  console.log("\n📦 1. SDK Konfigürasyonu:");
  console.log("-".repeat(60));
  console.log("ACL Address:              ", relayerConfig.aclContractAddress);
  console.log("KMS Address:              ", relayerConfig.kmsContractAddress);
  console.log("Input Verifier:           ", relayerConfig.inputVerifierContractAddress);
  console.log("Gateway Chain ID:         ", relayerConfig.gatewayChainId);
  console.log("Relayer URL:              ", relayerConfig.relayerUrl);
  console.log("Network RPC:              ", relayerConfig.network);

  // 2. Sözleşme Bilgileri
  console.log("\n📝 2. Deploy Edilen Sözleşmeler:");
  console.log("-".repeat(60));
  
  const confidentialMessageAddr = "0x07b4314c9cC7478F665416425d8d5B80Ba610eB1";
  const chronoMessageZamaAddr = "0x65016d7E35EC1830d599991d82381bf03eEC2987";
  
  console.log("ConfidentialMessage:      ", confidentialMessageAddr);
  console.log("ChronoMessageZama:        ", chronoMessageZamaAddr);

  // 3. FHE Instance Oluştur
  console.log("\n🔐 3. FHE Instance Kontrolü:");
  console.log("-".repeat(60));
  
  try {
  const instance = await createInstance(relayerConfig);
    console.log("✅ FHE Instance oluşturuldu");
    
    const publicKeyInfo = instance.getPublicKey();
    if (publicKeyInfo) {
      console.log("✅ Public Key alındı");
      console.log("   Public Key ID:         ", publicKeyInfo.publicKeyId);
      console.log("   Public Key Size:       ", publicKeyInfo.publicKey.length, "bytes");
    } else {
      console.log("⚠️  Public Key bilgisi yok");
    }
  } catch (error: any) {
    console.error("❌ FHE Instance hatası:", error.message);
  }

  // 4. Sözleşme Durumu Kontrol Et
  console.log("\n📋 4. Sözleşme On-Chain Durumu:");
  console.log("-".repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Signer Address:           ", signer.address);

  try {
    const ConfidentialMessage = await ethers.getContractAt(
      "ConfidentialMessage",
      confidentialMessageAddr
    );

    const messageCount = await ConfidentialMessage.messageCount();
    console.log("✅ Sözleşme erişilebilir");
    console.log("   Message Count:         ", messageCount.toString());

    // Protocol ID kontrol et
    const protocolId = await ConfidentialMessage.protocolId();
    console.log("   Protocol ID:           ", protocolId.toString());
    console.log("   Expected (Sepolia):     10001");
    
    if (protocolId.toString() !== "10001") {
      console.log("⚠️  Protocol ID eşleşmiyor!");
    } else {
      console.log("✅ Protocol ID doğru");
    }

  } catch (error: any) {
    console.error("❌ Sözleşme erişim hatası:", error.message);
  }

  // 5. Test Şifreleme
  console.log("\n🔒 5. Test Şifreleme:");
  console.log("-".repeat(60));

  try {
  const instance = await createInstance(relayerConfig);
    const testValue = 123456789n;
    
    const encrypted = await instance
      .createEncryptedInput(confidentialMessageAddr, signer.address)
      .add64(testValue)
      .encrypt();

    console.log("✅ Şifreleme başarılı");
    console.log("   Handle Type:           ", typeof encrypted.handles[0]);
    console.log("   Handle Size:           ", encrypted.handles[0].length, "bytes");
    console.log("   Proof Type:            ", typeof encrypted.inputProof);
    console.log("   Proof Size:            ", encrypted.inputProof.length, "bytes");

    // Handle'ı hex'e çevir
    const handleHex = '0x' + Buffer.from(encrypted.handles[0]).toString('hex');
    const proofHex = '0x' + Buffer.from(encrypted.inputProof).toString('hex');
    
    console.log("\n   Handle (hex):          ", handleHex);
    console.log("   Proof (hex, ilk 66):   ", proofHex.substring(0, 66) + "...");

  } catch (error: any) {
    console.error("❌ Şifreleme hatası:", error.message);
  }

  // 6. ACL Sözleşmesi Kontrol Et
  console.log("\n🔐 6. ACL Sözleşmesi Kontrolü:");
  console.log("-".repeat(60));

  try {
    const aclAbi = [
      "function allowed(address, address) external view returns (bool)",
      "function allowedOneBit(address, address) external view returns (bool)"
    ];

    const ACL = new ethers.Contract(
      relayerConfig.aclContractAddress,
      aclAbi,
      signer
    );

    // ACL erişilebilir mi kontrol et
    const code = await ethers.provider.getCode(relayerConfig.aclContractAddress);
    if (code === "0x" || code === "0x0") {
      console.log("❌ ACL sözleşmesi deploy edilmemiş!");
    } else {
      console.log("✅ ACL sözleşmesi deploy edilmiş");
      console.log("   Bytecode Size:         ", code.length, "chars");
    }

  } catch (error: any) {
    console.error("❌ ACL kontrol hatası:", error.message);
  }

  // 7. Relayer Bağlantı Testi
  console.log("\n🌐 7. Relayer Bağlantı Testi:");
  console.log("-".repeat(60));

  try {
  const relayerUrl = relayerConfig.relayerUrl;
    const response = await fetch(`${relayerUrl}/v1/keyurl`);
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Relayer erişilebilir");
      console.log("   Status:                ", data.status);
      console.log("   FHE Keys Count:        ", data.response?.fhe_key_info?.length || 0);
    } else {
      console.log("⚠️  Relayer response:", response.status, response.statusText);
    }
  } catch (error: any) {
    console.error("❌ Relayer bağlantı hatası:", error.message);
  }

  // Özet
  console.log("\n" + "=".repeat(60));
  console.log("📊 ÖZET");
  console.log("=".repeat(60));
  console.log(`
✅ Kontrol Edilen:
   - SDK konfigürasyonu
   - Sözleşme deployment
   - FHE instance oluşturma
   - Şifreleme işlemi
   - ACL sözleşmesi
   - Relayer bağlantısı

⚠️  Bilinen Sorun:
   - sendMessage çağrıları revert ediyor
   - FHE.fromExternal() proof'ları kabul etmiyor
   
📝 Sonraki Adımlar:
   1. Zama destek ekibi ile iletişime geç
   2. Sözleşme kayıt durumunu öğren
   3. ZAMA_TROUBLESHOOTING.md dosyasını oku
   4. Discord: https://discord.gg/zama

💡 Bu script'in çıktısını Zama destek ekibi ile paylaşabilirsiniz.
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal Error:", error);
    process.exit(1);
  });
