import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  const balance = await ethers.provider.getBalance(address);
  const network = await ethers.provider.getNetwork();
  
  console.log("\n" + "=".repeat(60));
  console.log("📍 Adres:", address);
  console.log("🌐 Network:", network.name, `(ChainID: ${network.chainId})`);
  console.log("💰 Bakiye:", ethers.formatEther(balance), "ETH");
  console.log("🔗 RPC URL:", (await ethers.provider.getNetwork()).chainId);
  console.log("=".repeat(60) + "\n");
  
  // Son 5 transaction'ı kontrol et
  const txCount = await ethers.provider.getTransactionCount(address);
  console.log("📊 Toplam Transaction Sayısı:", txCount);
  
  if (txCount > 0) {
    console.log("\n🔍 Bu adresten transaction yapıldı, cüzdan aktif.");
  } else {
    console.log("\n⚠️  Bu adresten hiç transaction yapılmamış!");
    console.log("   ETH'ler doğru adrese gönderildi mi kontrol edin:");
    console.log("   Gönderilen adres:", address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
