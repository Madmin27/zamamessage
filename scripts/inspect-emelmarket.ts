import { ethers } from "hardhat";

async function main() {
  console.log("\n🔍 EmelMarket cWETH İncelemesi\n");
  console.log("=".repeat(60));

  // EmelMarket'in çalışan cWETH sözleşmesi
  const cWETHAddr = "0xA3b95080674fBd12fC3626046DCa474c48d012d8";
  
  console.log("Contract:", cWETHAddr);
  console.log("Etherscan:", `https://sepolia.etherscan.io/address/${cWETHAddr}`);
  
  // Bytecode'u al
  const code = await ethers.provider.getCode(cWETHAddr);
  console.log("\nBytecode uzunluğu:", code.length, "chars");
  
  // İlk birkaç byte'ı göster
  console.log("Bytecode başlangıç:", code.substring(0, 100) + "...");
  
  // Constructor event'lerini oku
  console.log("\n📋 Contract Deployment Bilgileri:");
  
  // Contract'ın creation tx'ini bul
  const filter = {
    address: cWETHAddr,
    fromBlock: 0,
    toBlock: 'latest'
  };
  
  try {
    const logs = await ethers.provider.getLogs(filter);
    console.log("Toplam event sayısı:", logs.length);
    
    if (logs.length > 0) {
      console.log("\nİlk 5 event:");
      logs.slice(0, 5).forEach((log, i) => {
        console.log(`${i + 1}. Block: ${log.blockNumber}, Topics: ${log.topics.length}`);
      });
    }
  } catch (e: any) {
    console.log("Event sorgulanamadı:", e.message);
  }
  
  // ACL sözleşmesini kontrol et
  console.log("\n🔐 ACL Sözleşmesi Kontrolü:");
  const aclAddr = "0x687820221192C5B662b25367F70076A37bc79b6c";
  
  const aclCode = await ethers.provider.getCode(aclAddr);
  console.log("ACL deployed:", aclCode !== "0x");
  console.log("ACL bytecode uzunluğu:", aclCode.length);
  
  // ACL sözleşmesinin fonksiyonlarını dene
  const aclAbi = [
    "function allowed(address, address) external view returns (bool)",
    "function allowedOneBit(address, address) external view returns (bool)"
  ];
  
  const ACL = new ethers.Contract(aclAddr, aclAbi, ethers.provider);
  
  try {
    // cWETH'in kendisine izni var mı?
    const selfAllowed = await ACL.allowed(cWETHAddr, cWETHAddr);
    console.log("\ncWETH → cWETH izin:", selfAllowed);
  } catch (e: any) {
    console.log("ACL allowed() çağrısı başarısız:", e.message);
  }
  
  // InputVerifier kontrolü
  console.log("\n📝 InputVerifier Kontrolü:");
  const ivAddr = "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4";
  
  const ivCode = await ethers.provider.getCode(ivAddr);
  console.log("InputVerifier deployed:", ivCode !== "0x");
  console.log("InputVerifier bytecode uzunluğu:", ivCode.length);
  
  // KMS kontrolü
  console.log("\n🔑 KMS Kontrolü:");
  const kmsAddr = "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC";
  
  const kmsCode = await ethers.provider.getCode(kmsAddr);
  console.log("KMS deployed:", kmsCode !== "0x");
  console.log("KMS bytecode uzunluğu:", kmsCode.length);
  
  // Coprocessor kontrolü
  console.log("\n⚙️  Coprocessor Kontrolü:");
  const coprocessorAddr = "0x848B0066793BcC60346Da1F49049357399B8D595";
  
  const coprocessorCode = await ethers.provider.getCode(coprocessorAddr);
  console.log("Coprocessor deployed:", coprocessorCode !== "0x");
  console.log("Coprocessor bytecode uzunluğu:", coprocessorCode.length);
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 ÖZET");
  console.log("=".repeat(60));
  console.log(`
Tüm altyapı bileşenleri deploy edilmiş:
- ✅ ACL: ${aclCode !== "0x"}
- ✅ InputVerifier: ${ivCode !== "0x"}
- ✅ KMS: ${kmsCode !== "0x"}
- ✅ Coprocessor: ${coprocessorCode !== "0x"}

Ancak bizim sözleşmemiz hala revert ediyor!

🔍 Sonraki Adım:
EmelMarket'in sözleşme kodunu GitHub'dan indirip 
bizim sözleşmemizle karşılaştıralım.
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
