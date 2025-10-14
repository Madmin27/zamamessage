import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { applySepoliaRelayerOverrides } from "../config/zamaSepolia";

async function main() {
  console.log("🔐 Deploying ChronoMessageZama to Sepolia (Zama FHEVM)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const relayerConfig = applySepoliaRelayerOverrides(SepoliaConfig);

  console.log("\n🌐 Using Zama Sepolia settings:");
  console.log("   ACL:                       ", relayerConfig.aclContractAddress);
  console.log("   KMS Verifier:              ", relayerConfig.kmsContractAddress);
  console.log("   Input Verifier:            ", relayerConfig.inputVerifierContractAddress);
  console.log("   Decryption Verifier:       ", relayerConfig.verifyingContractAddressDecryption);
  console.log("   Input Verifier (EIP712):   ", relayerConfig.verifyingContractAddressInputVerification);
  console.log("   Gateway Chain ID:          ", relayerConfig.gatewayChainId);
  console.log("   Relayer URL:               ", relayerConfig.relayerUrl ?? "<default>");
  console.log("   RPC:                       ", typeof relayerConfig.network === "string" ? relayerConfig.network : "<provider object>");
  
  // Deploy ChronoMessageZama
  const ChronoMessageZama = await ethers.getContractFactory("ChronoMessageZama");
  console.log("⏳ Deploying contract...");
  
  const contract = await ChronoMessageZama.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ ChronoMessageZama deployed to:", address);

  const deployTx = contract.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : undefined;
  const protocolId = await contract.protocolId();

  console.log("   Deployment tx hash:       ", deployTx?.hash ?? "<unknown>");
  console.log("   Block number:             ", receipt?.blockNumber ?? "<pending>");
  console.log("   Gas used:                 ", receipt?.gasUsed?.toString() ?? "<unknown>");
  console.log("   Protocol ID:              ", protocolId.toString());
  
  // Save deployment info
  const deployment = {
    network: "sepolia",
    version: "zama",
    contractName: "ChronoMessageZama",
    address: address,
    deployedAt: new Date().toISOString(),
    deployedBy: deployer.address,
    chainId: 11155111,
    transactionHash: deployTx?.hash,
    blockNumber: receipt?.blockNumber ?? null,
    gasUsed: receipt?.gasUsed?.toString() ?? null,
    features: ["FHE", "TIME_LOCK", "ENCRYPTED_CONTENT"],
    abi: "See artifacts/contracts/ChronoMessageZama.sol/ChronoMessageZama.json",
    protocolId: protocolId.toString(),
    fheSettings: {
      aclContractAddress: relayerConfig.aclContractAddress,
      kmsContractAddress: relayerConfig.kmsContractAddress,
      inputVerifierContractAddress: relayerConfig.inputVerifierContractAddress,
      verifyingContractAddressDecryption: relayerConfig.verifyingContractAddressDecryption,
      verifyingContractAddressInputVerification: relayerConfig.verifyingContractAddressInputVerification,
      gatewayChainId: relayerConfig.gatewayChainId,
      relayerUrl: relayerConfig.relayerUrl ?? null,
      networkRpc: typeof relayerConfig.network === "string" ? relayerConfig.network : null
    }
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, "zama-sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  
  console.log("📝 Deployment info saved to:", deploymentPath);
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("1. Update frontend/lib/chains.ts with this address");
  console.log("2. Generate ABI: npm run generate-abi-zama");
  console.log("3. Test the contract on Sepolia");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
