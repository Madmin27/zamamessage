import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing sendMessage with actual FHE encryption...\n");

  // Contract address
  const contractAddress = "0x38756CCb09EE1719089F370a8386a772a8F7B5cf";
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Sender:", signer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH\n");

  // Load contract
  const ConfidentialMessage = await ethers.getContractAt(
    "ConfidentialMessage",
    contractAddress
  );

  // Test data from frontend
  const receiver = "0xF6D39Dda8997407110264acEc6a24345834cB639";
  const encryptedContent = "0xa62fa29cad9af327cb910f5c37591d79b2d8e93f87000000000000aa36a70500";
  const inputProof = "0x0101a62fa29cad9af327cb910f5c37591d79b2d8e93f87000000000000aa36a705004b1e1bb70add713e8f738f90bb97c3f0a5886b7bdf6d694f9353ff8a28234e251d5e82f373153624802d543942afd7eaf3bf7d30dbde81d5375bfeab469e73291b00";
  const unlockTime = Math.floor(Date.now() / 1000) + 60; // 1 dakika sonra

  console.log("📝 Parameters:");
  console.log("  Receiver:", receiver);
  console.log("  Encrypted Content:", encryptedContent);
  console.log("  Input Proof:", inputProof.substring(0, 50) + "...");
  console.log("  Unlock Time:", unlockTime, `(${new Date(unlockTime * 1000).toISOString()})\n`);

  try {
    // Estimate gas first
    console.log("⛽ Estimating gas...");
    const gasEstimate = await ConfidentialMessage.sendMessage.estimateGas(
      receiver,
      encryptedContent,
      inputProof,
      unlockTime
    );
    console.log("✅ Gas estimate:", gasEstimate.toString(), "\n");

    // Send transaction
    console.log("📤 Sending transaction...");
    const tx = await ConfidentialMessage.sendMessage(
      receiver,
      encryptedContent,
      inputProof,
      unlockTime,
      { gasLimit: gasEstimate * 2n } // 2x gas limit for safety
    );

    console.log("⏳ Transaction sent:", tx.hash);
    console.log("   Waiting for confirmation...\n");

    const receipt = await tx.wait();
    
    if (!receipt) {
      console.error("❌ Receipt is null");
      return;
    }
    
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Get messageId from event
    const event = receipt.logs.find((log: any) => {
      try {
        return ConfidentialMessage.interface.parseLog(log)?.name === "MessageSent";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsedEvent = ConfidentialMessage.interface.parseLog(event);
      console.log("   Message ID:", parsedEvent?.args.messageId.toString());
    }

  } catch (error: any) {
    console.error("\n❌ Transaction FAILED!");
    console.error("Error:", error.message);
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    // Try to decode revert reason
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
    
    // Full error for debugging
    console.error("\nFull error:");
    console.error(error);
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
