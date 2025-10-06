import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3";
  
  // RECEIVER private key (test için - ASLA gerçek private key paylaşmayın!)
  const RECEIVER_PRIVATE_KEY = process.env.RECEIVER_PRIVATE_KEY || "";
  
  if (!RECEIVER_PRIVATE_KEY) {
    console.error("❌ RECEIVER_PRIVATE_KEY environment variable gerekli");
    return;
  }
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const receiverWallet = new ethers.Wallet(RECEIVER_PRIVATE_KEY, provider);
  
  const abi = [
    "function getMessageMetadata(uint256) view returns (address, address, uint256, bool)",
    "function getMessageContent(uint256) view returns (string)",
    "function readMessage(uint256) returns (string)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, receiverWallet);
  
  try {
    console.log("\n🔍 Alıcı adresi:", receiverWallet.address);
    
    const [sender, receiver, unlockTime, isRead] = await contract.getMessageMetadata(0);
    
    const now = Math.floor(Date.now() / 1000);
    const unlockDate = new Date(Number(unlockTime) * 1000);
    const isUnlocked = now >= Number(unlockTime);
    
    console.log("\n📨 Mesaj #0 Durumu:");
    console.log("Gönderen:", sender);
    console.log("Alıcı:", receiver);
    console.log("Kilit zamanı:", unlockDate.toLocaleString("tr-TR"));
    console.log("Şu anki zaman:", new Date().toLocaleString("tr-TR"));
    console.log("Açıldı mı?", isUnlocked ? "✅ EVET" : "❌ HAYIR");
    console.log("Okundu mu?", isRead ? "✅ EVET" : "❌ HAYIR");
    console.log("\n⏱️ Kalan süre:", isUnlocked ? "0 saniye (açık)" : `${Number(unlockTime) - now} saniye`);
    
    if (isUnlocked) {
      console.log("\n🔓 Mesaj açık! İçeriği okumayı deneyelim...");
      try {
        const content = await contract.getMessageContent(0);
        console.log("📝 Mesaj içeriği (view):", content);
      } catch (err: any) {
        console.log("⚠️ getMessageContent hatası:", err.message);
      }
    } else {
      console.log("\n🔒 Mesaj hala kilitli. Açılmasını bekleyin.");
    }
  } catch (err: any) {
    console.error("❌ Hata:", err.message);
  }
}

main();
