import { ethers } from "hardhat";

async function main() {
  console.log("🚀 ChronoMessageV2 deploy ediliyor...");

  const ChronoMessageV2 = await ethers.getContractFactory("ChronoMessageV2");
  const contract = await ChronoMessageV2.deploy();
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ ChronoMessageV2 deploy edildi:", address);
  console.log("📍 Network:", (await ethers.provider.getNetwork()).name);
  console.log("⛽ Deploy gas used:", (await contract.deploymentTransaction()?.wait())?.gasUsed.toString());
  
  console.log("\n📝 .env dosyasına ekleyin:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  
  console.log("\n🔍 Etherscan'da görüntüle:");
  console.log(`https://sepolia.etherscan.io/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
