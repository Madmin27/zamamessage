import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing with FRONTEND wallet (0x5c728c75...)...\n");

  // Use frontend wallet from .env
  const frontendPrivateKey = process.env.PRIVATE_KEY_FRONTEND;
  
  if (!frontendPrivateKey || frontendPrivateKey.includes("BURAYA")) {
    console.error("❌ PRIVATE_KEY_FRONTEND not set in .env!");
    console.error("Please add the private key of 0x5c728c75... wallet to .env");
    process.exit(1);
  }

  const frontendWallet = new ethers.Wallet(frontendPrivateKey, ethers.provider);
  console.log("Frontend Wallet:", frontendWallet.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(frontendWallet.address)), "ETH\n");

  // Contract address
  const contractAddress = "0x38756CCb09EE1719089F370a8386a772a8F7B5cf";
  
  // Frontend'ten alınan GERÇEK encryption data
  // Bu data 0x5c728c75... wallet ile şifrelenmiş!
  const encryptedContent = "0xab5e54ce49f782399019414e0abf562282fed68140000000000000aa36a70500";
  const inputProof = "0x0101ab5e54ce49f782399019414e0abf562282fed68140000000000000aa36a70500c0977a30f059574194123b77e03e77e7f6c1dd1f17c1efa180590e1036ac853448e740e888a41e5e346cd0bdc7252e650c54e34190699d1ee0a662e21f93c6e61b00";
  
  console.log("📝 Using encryption data from frontend:");
  console.log("  Created by wallet:", "0x5c728c75f4845Dc19f1107a173268297908aC883");
  console.log("  Now sending from:  ", frontendWallet.address);
  console.log("  Should match: ", frontendWallet.address.toLowerCase() === "0x5c728c75f4845Dc19f1107a173268297908aC883".toLowerCase() ? "✅ YES" : "❌ NO");
  console.log("");

  // Load contract
  const ConfidentialMessage = await ethers.getContractAt(
    "ConfidentialMessage",
    contractAddress,
    frontendWallet // Use frontend wallet!
  );

  const receiver = "0xF6D39Dda8997407110264acEc6a24345834cB639";
  const unlockTime = Math.floor(Date.now() / 1000) + 60;

  try {
    console.log("⛽ Estimating gas with CORRECT wallet...");
    const gasEstimate = await ConfidentialMessage.sendMessage.estimateGas(
      receiver,
      encryptedContent,
      inputProof,
      unlockTime
    );
    console.log("✅ Gas estimation SUCCESS:", gasEstimate.toString());
    console.log("✅ FHE.fromExternal() accepts the proof!\n");

    // Send transaction
    console.log("📤 Sending transaction...");
    const tx = await ConfidentialMessage.sendMessage(
      receiver,
      encryptedContent,
      inputProof,
      unlockTime,
      { gasLimit: gasEstimate * 2n }
    );

    console.log("⏳ Transaction sent:", tx.hash);
    console.log("   Waiting for confirmation...\n");

    const receipt = await tx.wait();
    
    if (!receipt) {
      console.error("❌ Receipt is null");
      return;
    }

    console.log("✅✅✅ TRANSACTION CONFIRMED!");
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

    console.log("\n🎉 SUCCESS! The problem was using wrong wallet!");
    console.log("📝 Solution: Use the SAME wallet that created the encryption!");

  } catch (error: any) {
    console.error("\n❌ Transaction FAILED!");
    console.error("Error:", error.message);
    
    if (frontendWallet.address.toLowerCase() !== "0x5c728c75f4845Dc19f1107a173268297908aC883".toLowerCase()) {
      console.error("\n⚠️  WALLET MISMATCH!");
      console.error("Encryption was created with: 0x5c728c75f4845Dc19f1107a173268297908aC883");
      console.error("But transaction sent from:  ", frontendWallet.address);
      console.error("This is why FHE.fromExternal() rejects the proof!");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
