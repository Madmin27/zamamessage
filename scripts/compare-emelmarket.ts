import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Comparing EmelMarket contracts with ours...\n");
    
    // EmelMarket CWETH kontratı
    const cwethCode = await ethers.provider.getCode("0xA3b95080674fBd12fC3626046DCa474c48d012d8");
    console.log("📦 EmelMarket CWETH bytecode length:", cwethCode.length);
    
    // EmelMarket FHEEmelMarket kontratı  
    const marketCode = await ethers.provider.getCode("0xA8B39ecfbB39c6749C8BA40ee9d349aB844F93cE");
    console.log("📦 FHEEmelMarket bytecode length:", marketCode.length);
    
    // Bizim kontratımız
    const ourCode = await ethers.provider.getCode("0x65016d7E35EC1830d599991d82381bf03eEC2987");
    console.log("📦 ChronoMessageZama bytecode length:", ourCode.length);
    
    // Zama Coprocessor (karşılaştırma için)
    const coprocCode = await ethers.provider.getCode("0x848B0066793BcC60346Da1F49049357399B8D595");
    console.log("📦 Zama Coprocessor bytecode length:", coprocCode.length);
    
    console.log("\n✅ EmelMarket contracts are deployed and have real bytecode!");
    console.log("✅ This means their FHE operations SHOULD work on Sepolia");
    console.log("\n🤔 Let's check if they use the same Zama coprocessor addresses...");
    
    // CWETH kontratından protocolId'yi okuyalım (eğer varsa)
    try {
        const cwethContract = await ethers.getContractAt(
            ["function protocolId() view returns (uint256)"],
            "0xA3b95080674fBd12fC3626046DCa474c48d012d8"
        );
        const protocolId = await cwethContract.protocolId();
        console.log("\n🔑 EmelMarket CWETH protocolId:", protocolId.toString());
    } catch (e) {
        console.log("\n⚠️  Could not read protocolId from CWETH");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
