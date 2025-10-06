import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x1F41e0B9F631a72B32fd3A36F494f8afd7C0b0F2";
  const testAddress = "0x50587bc2bef7c66bc2952f126adbafcc4ab9c9d0";
  
  const contract = await ethers.getContractAt("ChronoMessageV2", contractAddress);
  
  console.log("\n🔍 ADRES KONTROLÜ");
  console.log("Test Address:", testAddress);
  console.log("Test Address (checksum):", ethers.getAddress(testAddress));
  
  // Mesaj 8'in metadata'sını oku
  try {
    const [sender, receiver, unlockTime, isRead] = await contract.getMessageMetadata(8);
    console.log("\n📩 Mesaj #8 Metadata:");
    console.log("  Sender:", sender);
    console.log("  Receiver:", receiver);
    console.log("  Receiver (lowercase):", receiver.toLowerCase());
    console.log("  Test address match:", receiver.toLowerCase() === testAddress.toLowerCase());
  } catch (err: any) {
    console.error("❌ Metadata hatası:", err.message);
  }
  
  // Alınan mesajları kontrol et
  const receivedIds = await contract.getReceivedMessages(testAddress);
  console.log("\n📥 Alınan mesajlar:", receivedIds.map(id => id.toString()));
  
  // Checksum'lu adresle de dene
  const checksumAddress = ethers.getAddress(testAddress);
  const receivedIds2 = await contract.getReceivedMessages(checksumAddress);
  console.log("📥 Alınan mesajlar (checksum):", receivedIds2.map(id => id.toString()));
}

main().catch(console.error);
