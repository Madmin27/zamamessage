import { ethers } from "hardhat";

async function main() {
  console.log("\n🚀 Deploying ConfidentialMessage contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Deploy ConfidentialMessage
  const ConfidentialMessage = await ethers.getContractFactory("ConfidentialMessage");
  const contract = await ConfidentialMessage.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ ConfidentialMessage deployed to:", address);

  // Save deployment info
  const deployment = {
    network: "sepolia",
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    pattern: "ConfidentialMessage - EmelMarket Pattern",
    changes: [
      "✅ Uses inEuint256 instead of externalEuint256",
      "✅ NO coprocessor calls (like ConfidentialWETH)",
      "✅ On-chain encrypted state only",
      "✅ Homomorphic operations",
      "✅ Frontend decrypts with user's private key"
    ]
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "deployments/confidential-message-sepolia.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n📄 Deployment saved to deployments/confidential-message-sepolia.json");
  console.log("\n🔑 KEY DIFFERENCE FROM OLD CONTRACT:");
  console.log("   - OLD: externalEuint256 + FHE.fromExternal() → coprocessor call → FAILS");
  console.log("   - NEW: inEuint256 + FHE.asEuint256() → on-chain only → WORKS!");
  console.log("\n💡 This is exactly how EmelMarket works on Sepolia!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
