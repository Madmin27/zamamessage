/**
 * YENİ FHE API TEST CONTRACT DEPLOY
 * @fhevm/solidity@0.7.0 - FHE.fromExternal() pattern
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📋 Deploy Bilgileri:");
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Deploy TestTFHEPattern
  console.log("\n1️⃣ TestTFHEPattern deploy ediliyor...");
  console.log("   API: @fhevm/solidity@0.7.0");
  console.log("   Pattern: FHE.fromExternal(externalEuint64, bytes)");
  
  const TestTFHEPattern = await hre.ethers.getContractFactory("TestTFHEPattern");
  const contract = await TestTFHEPattern.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ Contract deployed:", address);
  
  // Deployment info kaydet
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    api: {
      package: "@fhevm/solidity",
      version: "0.7.0",
      pattern: "FHE.fromExternal()",
      inputType: "externalEuint64"
    },
    tx: contract.deploymentTransaction()?.hash
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `test-new-fhe-api-${hre.network.name}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\n💾 Deployment saved: deployments/${filename}`);
  console.log("\n🎯 TESTİ FRONTEND'DEN YAPIN:");
  console.log("   1. Frontend'de contract address'i güncelleyin");
  console.log("   2. storeValue() fonksiyonunu SDK ile çağırın");
  console.log("   3. 'Invalid index' hatasının GİTTİĞİNİ doğrulayın");
  console.log("\n✅ Eğer çalışırsa → Ana contract'ı migrate ederiz!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
