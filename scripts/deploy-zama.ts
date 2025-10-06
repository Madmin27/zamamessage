import hre from "hardhat";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("\n=== ChronoMessageZama (Zama FHE) Deployment ===");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Bakiye kontrolü
  const minBalance = hre.ethers.parseEther("0.01");
  if (balance < minBalance) {
    console.error("❌ Insufficient balance! Need at least 0.01 ETH for deployment.");
    process.exit(1);
  }

  console.log("Deploying ChronoMessageZama contract (Zama FHE enabled)...");
  const ChronoMessageZama = await hre.ethers.getContractFactory("ChronoMessageZama");
  const contract = await ChronoMessageZama.deploy();
  
  console.log("Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ ChronoMessageZama deployed to: ${address}`);

  // Deployment metadata'yı kaydet
  const deploymentsDir = path.resolve(__dirname, "..", "deployments");
  await fs.mkdir(deploymentsDir, { recursive: true });
  
  const metadata = {
    address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    contractType: "ChronoMessageZama",
    fheEnabled: true,
    features: [
      "Zama FHE encryption (euint256)",
      "Time-locked messaging",
      "Access control (only sender can read)",
      "Sepolia testnet compatible"
    ]
  };
  
  const filename = `${hre.network.name}.json`;
  await fs.writeFile(
    path.join(deploymentsDir, filename), 
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`\n📝 Deployment info saved to: deployments/${filename}`);

  // Network'e göre explorer URL'i
  const explorerUrls: Record<string, string> = {
    sepolia: "https://sepolia.etherscan.io",
    mainnet: "https://etherscan.io",
    polygon: "https://polygonscan.com",
    mumbai: "https://mumbai.polygonscan.com"
  };

  const explorerUrl = explorerUrls[hre.network.name];
  if (explorerUrl) {
    console.log(`\n🔍 View on Explorer: ${explorerUrl}/address/${address}`);
    console.log(`\n📌 To verify contract, run:`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${address}`);
  }

  // Zama FHE bilgileri
  if (hre.network.name === "sepolia") {
    console.log(`\n🔐 Zama FHE Configuration:`);
    console.log(`- Gateway URL: https://gateway.sepolia.zama.ai`);
    console.log(`- Encryption Type: euint256 (256-bit encrypted integers)`);
    console.log(`- Access Control: FHE.allow() based`);
    console.log(`\n📚 Next Steps:`);
    console.log(`1. Update frontend .env.local with contract address`);
    console.log(`2. Install @zama-fhe/relayer-sdk in frontend`);
    console.log(`3. Test encryption/decryption with fhevmjs`);
    console.log(`4. See ZAMA_TESTNET.md for complete guide`);
  }

  console.log("\n=== Deployment Complete ===\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
