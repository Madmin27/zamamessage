import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x84Ee2670dD05d60EC343791dfA6995fEeE0F3Cb3";
  const receiverAddress = "0x50587bC2bef7C66bC2952F126ADbafCc4Ab9c9D0";
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  const abi = [
    "function getMessageMetadata(uint256) view returns (address, address, uint256, bool)",
    "function getMessageContent(uint256) view returns (string)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
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
    
    // Eğer açıldıysa içeriği de deneyelim
    if (isUnlocked) {
      try {
        const content = await contract.getMessageContent(0);
        console.log("\n📝 Mesaj içeriği:", content);
      } catch (err: any) {
        console.log("\n⚠️ İçerik okunamadı:", err.message);
      }
    }
  } catch (err: any) {
    console.error("Hata:", err.message);
  }
}

main();
