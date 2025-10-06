import { ethers } from "hardhat";

async function main() {
  const txHash = "0x58aa9b79d5f6da8dcbaffe0c6746480ca04ec85e7bd35b0ca9ccef9ba84b6919";
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  console.log("\n🔍 TRANSACTION DETAYLARI\n");
  
  // Transaction bilgilerini al
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.log("❌ Transaction bulunamadı!");
    return;
  }
  
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Block:", tx.blockNumber);
  
  // Receipt'i al (event logları için)
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.log("❌ Receipt bulunamadı!");
    return;
  }
  
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Gas Used:", receipt.gasUsed.toString());
  
  // Contract'tan MessageSent event'ini decode et
  const contractAbi = [
    "event MessageSent(uint256 indexed id, address indexed sender, address indexed receiver, uint256 unlockTime)"
  ];
  
  const iface = new ethers.Interface(contractAbi);
  
  console.log("\n📨 EVENT LOGLARI:\n");
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === "MessageSent") {
          console.log("✅ MessageSent Event:");
          console.log("   Message ID:", parsed.args.id.toString());
          console.log("   Sender:", parsed.args.sender);
          console.log("   Receiver:", parsed.args.receiver);
          console.log("   Unlock Time:", new Date(Number(parsed.args.unlockTime) * 1000).toLocaleString("tr-TR"));
          
          // Şimdi bu mesajı contract'tan çek
          const contract = new ethers.Contract(contractAddress, [
            "function getMessageMetadata(uint256) view returns (address, address, uint256, bool)"
          ], provider);
          
          try {
            const [sender, receiver, unlockTime, isRead] = await contract.getMessageMetadata(parsed.args.id);
            console.log("\n   📋 Contract'tan doğrulama:");
            console.log("   ✅ Mesaj blockchain'de mevcut!");
            console.log("   Okundu:", isRead ? "Evet" : "Hayır");
          } catch (e: any) {
            console.log("\n   ⚠️  Mesaj metadata'sına erişim hatası:", e.message);
          }
        }
      } catch (e) {
        // Event parse edilemedi, atla
      }
    }
  }
}

main().catch(console.error);
