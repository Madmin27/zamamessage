import { ethers } from "hardhat";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

async function main() {
  console.log("\n🧪 Minimal Zama Test - Deploy & Test\n");
  console.log("=" .repeat(60));

  const [signer] = await ethers.getSigners();
  console.log("Deployer:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // 1. Deploy MinimalZamaTest
  console.log("📝 1. Deploy MinimalZamaTest...");
  const MinimalZamaTest = await ethers.getContractFactory("MinimalZamaTest");
  const minimal = await MinimalZamaTest.deploy();
  await minimal.waitForDeployment();
  
  const minimalAddr = await minimal.getAddress();
  console.log("✅ Deployed:", minimalAddr);
  
  // 2. Protocol ID Kontrolü
  console.log("\n🔍 2. Protocol ID Kontrolü...");
  const protocolId = await minimal.getProtocolId();
  console.log("Protocol ID:", protocolId.toString());
  
  if (protocolId.toString() !== "10001") {
    console.log("⚠️  Protocol ID yanlış!");
  } else {
    console.log("✅ Protocol ID doğru");
  }

  // 3. FHE SDK ile şifreleme
  console.log("\n🔐 3. FHE Şifreleme...");
  const fheInstance = await createInstance(SepoliaConfig);
  console.log("✅ FHE Instance oluşturuldu");
  
  const testValue = 42n;
  const encrypted = await fheInstance
    .createEncryptedInput(minimalAddr, signer.address)
    .add64(testValue)
    .encrypt();
  
  console.log("✅ Değer şifrelendi:", testValue.toString());
  console.log("   Handle:", encrypted.handles[0]);
  console.log("   Proof size:", encrypted.inputProof.length, "bytes");

  // 4. testFromExternal çağrısı
  console.log("\n📤 4. testFromExternal() Çağrısı...");
  
  try {
    // Önce gas tahmini
    console.log("⛽ Gas tahmini yapılıyor...");
    const gasEstimate = await minimal.testFromExternal.estimateGas(
      encrypted.handles[0],
      encrypted.inputProof
    );
    console.log("✅ Gas tahmini başarılı:", gasEstimate.toString());
    
    // Şimdi gerçek işlem
    console.log("📤 İşlem gönderiliyor...");
    const tx = await minimal.testFromExternal(
      encrypted.handles[0],
      encrypted.inputProof,
      { gasLimit: gasEstimate * 2n }
    );
    
    console.log("⏳ Transaction hash:", tx.hash);
    console.log("   Onay bekleniyor...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction onaylandı!");
    console.log("   Block:", receipt?.blockNumber);
    console.log("   Gas kullanıldı:", receipt?.gasUsed.toString());
    
    // Event'leri kontrol et
    if (receipt?.logs) {
      console.log("   Events:", receipt.logs.length);
      receipt.logs.forEach((log: any, index: number) => {
        try {
          const parsed = minimal.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          if (parsed) {
            console.log(`   Event ${index}:`, parsed.name);
          }
        } catch (e) {
          // Parse edilemeyen log
        }
      });
    }
    
    // testCount kontrolü
    const testCount = await minimal.testCount();
    console.log("   Test Count:", testCount.toString());
    
    console.log("\n🎉 BAŞARILI! fromExternal() çalışıyor!");
    
  } catch (error: any) {
    console.error("\n❌ HATA!");
    console.error("Error message:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
    
    // Detaylı hata
    console.error("\nFull error:");
    console.error(error);
    
    console.log("\n🔍 Sorun Analizi:");
    console.log("1. Constructor çalıştı mı? (Contract deploy edildi ✅)");
    console.log("2. ACL adresleri set edildi mi? (SepoliaConfig ✅)");
    console.log("3. Proof formatı doğru mu? (SDK üretimi ✅)");
    console.log("4. Gas yeterli mi? (2x limit verdik ✅)");
    console.log("\n❓ Hala revert ediyor!");
  }

  // 5. Özet
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST ÖZET");
  console.log("=".repeat(60));
  console.log("Contract:", minimalAddr);
  console.log("Deployer:", signer.address);
  console.log("Etherscan:", `https://sepolia.etherscan.io/address/${minimalAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
