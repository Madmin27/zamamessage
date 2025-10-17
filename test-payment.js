const { ethers } = require("hardhat");

async function main() {
  const contract = await ethers.getContractAt(
    "ChronoMessageZama", 
    "0xd6215d3f2553896fc1DbC65C39186ac4e1c770CA"
  );
  
  console.log("📋 Testing message ID 0...");
  
  // Metadata
  const metadata = await contract.getMessageMetadata(0);
  console.log("Metadata:", {
    sender: metadata[0],
    receiver: metadata[1],
    unlockTime: metadata[2].toString(),
    isUnlocked: metadata[3],
    conditionMask: metadata[4]
  });
  
  // Payment (sadece authorized adreslere)
  try {
    const payment = await contract.getRequiredPayment(0);
    console.log("💰 Payment:", payment.toString(), "wei");
  } catch (err) {
    console.error("❌ Payment error:", err.message);
  }
}

main().catch(console.error);
