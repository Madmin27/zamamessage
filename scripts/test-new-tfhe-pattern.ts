import { ethers } from "hardhat";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { applySepoliaRelayerOverrides } from "../config/zamaSepolia";

async function main() {
  console.log("\n🚀 YENİ TFHE PATTERN TEST DEPLOYMENT\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy TestTFHEPattern sözleşmesi
  console.log("📝 Deploying TestTFHEPattern...");
  const TestTFHEPattern = await ethers.getContractFactory("TestTFHEPattern");
  const contract = await TestTFHEPattern.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Deployed at:", contractAddress);
  console.log("Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);

  // 2. FHE Instance oluştur (SepoliaConfig kullan)
  console.log("\n⚙️  Initializing FHE instance...");
  const relayerConfig = applySepoliaRelayerOverrides(SepoliaConfig);
  console.log("   ACL:", relayerConfig.aclContractAddress);
  console.log("   InputVerifier:", relayerConfig.inputVerifierContractAddress);
  console.log("   Relayer URL:", relayerConfig.relayerUrl);
  const instance = await createInstance(relayerConfig);
  console.log("✅ FHE instance created");

  // 3. Public key al
  console.log("\n🔑 Fetching public key...");
  const publicKeyData = instance.getPublicKey();
  if (publicKeyData) {
    console.log("✅ Public key size:", publicKeyData.publicKey.length, "bytes");
  } else {
    console.log("⚠️ Public key could not be fetched");
  }

  // 4. Değer şifrele
  const testValue = 42;
  console.log("\n🔐 Encrypting test value:", testValue);
  
  const input = instance.createEncryptedInput(contractAddress, deployer.address);
  input.add64(testValue);
  const { handles, inputProof } = await input.encrypt();
  
  console.log("✅ Encrypted!");
  console.log("   Handle:", handles[0]);
  console.log("   Handle size:", handles[0].length, "bytes");
  console.log("   Proof size:", inputProof.length, "bytes");

  // 5. Gas estimation dene
  console.log("\n⛽ Estimating gas for storeValue()...");
  
  try {
    const gasEstimate = await contract.storeValue.estimateGas(handles[0], inputProof);
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // 6. Transaction gönder
    console.log("\n📤 Sending transaction...");
    const tx = await contract.storeValue(handles[0], inputProof);
    console.log("TX hash:", tx.hash);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt?.blockNumber);
    console.log("   Gas used:", receipt?.gasUsed.toString());
    
    // 7. testCount kontrol et
    const testCount = await contract.getTestCount();
    console.log("\n📊 Test count:", testCount.toString());
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS! YENİ TFHE PATTERN ÇALIŞIYOR!");
    console.log("=".repeat(60));
    
  } catch (error: any) {
    console.log("\n❌ ERROR during gas estimation:");
    console.log("Error message:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    console.log("\n📋 Full error:");
    console.log(error);
    
    console.log("\n" + "=".repeat(60));
    console.log("❌ FAILED - But this tells us important info!");
    console.log("=".repeat(60));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
