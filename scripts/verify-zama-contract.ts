import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x8dC004001b615Bf8fD801192B15D78fE647fF418";
  
  console.log("🔍 Checking contract at:", contractAddress);
  
  // Check if contract exists
  const code = await ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    console.log("❌ No contract found at this address!");
    return;
  }
  console.log("✅ Contract exists (bytecode length:", code.length, ")");
  
  // Try to read messageCount
  const contract = await ethers.getContractAt("ChronoMessageZama", contractAddress);
  
  try {
    const count = await contract.messageCount();
    console.log("✅ messageCount:", count.toString());
  } catch (err: any) {
    console.log("❌ messageCount error:", err.message);
  }
  
  // Try to call getUserMessageCount
  try {
    const signer = (await ethers.getSigners())[0];
    const userCount = await contract.getUserMessageCount(signer.address);
    console.log("✅ getUserMessageCount:", userCount.toString());
  } catch (err: any) {
    console.log("❌ getUserMessageCount error:", err.message);
  }
}

main().catch(console.error);
