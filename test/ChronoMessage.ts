import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChronoMessage", () => {
  it("should store and unlock messages after the unlock time", async () => {
    const [sender] = await ethers.getSigners();
    const ChronoMessage = await ethers.getContractFactory("ChronoMessage");
    const chronoMessage = await ChronoMessage.deploy();

    await chronoMessage.waitForDeployment();

    const unlockDelay = 3600; // 1 saat
    const latestBlock = await ethers.provider.getBlock("latest");
    const unlockTime = (latestBlock?.timestamp ?? 0) + unlockDelay;

    const tx = await chronoMessage.sendMessage("Merhaba gelecek!", unlockTime);
    await expect(tx)
      .to.emit(chronoMessage, "MessageSent")
      .withArgs(0, sender.address, unlockTime);
    await tx.wait();

    expect(await chronoMessage.messageCount()).to.equal(1);

    await expect(chronoMessage.readMessage(0)).to.be.revertedWith("Message still locked");

    await ethers.provider.send("evm_increaseTime", [unlockDelay]);
    await ethers.provider.send("evm_mine", []);

    const content = await chronoMessage.readMessage(0);
    expect(content).to.equal("Merhaba gelecek!");

    const metadata = await chronoMessage.getMessageMetadata(0);
    expect(metadata[0]).to.equal(sender.address);
    expect(metadata[1]).to.equal(unlockTime);
  });

  it("should reject invalid messages", async () => {
    const ChronoMessage = await ethers.getContractFactory("ChronoMessage");
    const chronoMessage = await ChronoMessage.deploy();
    await chronoMessage.waitForDeployment();

    const latestBlock = await ethers.provider.getBlock("latest");
    const latestTimestamp = latestBlock?.timestamp ?? 0;

    await expect(chronoMessage.sendMessage("", latestTimestamp + 10)).to.be.revertedWith("Empty content");
    await expect(chronoMessage.sendMessage("Test", latestTimestamp - 1)).to.be.revertedWith(
      "Unlock time must be in the future"
    );
    await expect(chronoMessage.readMessage(99)).to.be.revertedWith("Message not found");
  });
});
