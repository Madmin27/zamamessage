import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x07b4314c9cC7478F665416425d8d5B80Ba610eB1";
const USER_ADDRESS = "0x5c728c75f4845Dc19f1107a173268297908aC883";

async function main() {
  console.log("\n🔎 Checking TestTFHEPattern state on Sepolia...");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("User:    ", USER_ADDRESS);

  const contract = await ethers.getContractAt("TestTFHEPattern", CONTRACT_ADDRESS);

  const testCount = await contract.getTestCount();
  console.log("\n📊 testCount:", testCount.toString());

  const encryptedValue = await contract.getValue(USER_ADDRESS);
  console.log("🔐 Encrypted value (handle):", encryptedValue);

  console.log("\n✅ State fetched successfully. Note: Value stays encrypted on-chain.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
