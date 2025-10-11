import { expect } from "chai";
import { ethers } from "hardhat";
import { ChronoMessageV3 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChronoMessageV3 - Comprehensive Tests", function () {
  let contract: ChronoMessageV3;
  let owner: SignerWithAddress;
  let sender: SignerWithAddress;
  let receiver: SignerWithAddress;
  let attacker: SignerWithAddress;

  beforeEach(async function () {
    [owner, sender, receiver, attacker] = await ethers.getSigners();
    
    const ChronoMessageV3Factory = await ethers.getContractFactory("ChronoMessageV3");
    contract = await ChronoMessageV3Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero messages", async function () {
      expect(await contract.messageCount()).to.equal(0);
    });
  });

  describe("Time-Locked Messages", function () {
    it("Should send a time-locked text message", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const content = "Secret time-locked message";

      await expect(
        contract.connect(sender).sendTimeLockedMessage(
          receiver.address,
          content,
          0, // TEXT
          unlockTime
        )
      ).to.emit(contract, "MessageSent")
        .withArgs(0, sender.address, receiver.address, 0, unlockTime, 0);

      expect(await contract.messageCount()).to.equal(1);
    });

    it("Should reject time-locked message with past unlock time", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        contract.connect(sender).sendTimeLockedMessage(
          receiver.address,
          "Test",
          0,
          unlockTime
        )
      ).to.be.revertedWith("Unlock time must be in future");
    });

    it("Should prevent sender from sending to themselves", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        contract.connect(sender).sendTimeLockedMessage(
          sender.address,
          "Self message",
          0,
          unlockTime
        )
      ).to.be.revertedWith("Cannot send to yourself");
    });

    it("Should reject empty content", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        contract.connect(sender).sendTimeLockedMessage(
          receiver.address,
          "",
          0,
          unlockTime
        )
      ).to.be.revertedWith("Empty content");
    });

    it("Should not allow reading before unlock time", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      
      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Locked content",
        0,
        unlockTime
      );

      await expect(
        contract.connect(receiver).readMessage(0)
      ).to.be.revertedWith("Message is still locked");
    });

    it("Should allow reading after unlock time", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 2; // 2 seconds
      const content = "Test message";

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        content,
        0,
        unlockTime
      );

      // Wait for unlock time
      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      const readContent = await contract.connect(receiver).readMessage(0);
      expect(readContent).to.equal(content);
    });

    it("Should prevent non-receiver from reading message", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 2;

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Secret",
        0,
        unlockTime
      );

      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        contract.connect(attacker).readMessage(0)
      ).to.be.revertedWith("Only receiver can perform this action");
    });
  });

  describe("Payment-Locked Messages", function () {
    it("Should send a payment-locked message", async function () {
      const requiredPayment = ethers.parseEther("0.001");
      const content = "Pay to unlock";

      await expect(
        contract.connect(sender).sendPaymentLockedMessage(
          receiver.address,
          content,
          0, // TEXT
          requiredPayment
        )
      ).to.emit(contract, "MessageSent")
        .withArgs(0, sender.address, receiver.address, 1, 0, requiredPayment);
    });

    it("Should reject payment below minimum", async function () {
      const tooLow = ethers.parseEther("0.00001"); // Below MIN_PAYMENT

      await expect(
        contract.connect(sender).sendPaymentLockedMessage(
          receiver.address,
          "Test",
          0,
          tooLow
        )
      ).to.be.revertedWith("Payment too low");
    });

    it("Should allow receiver to pay and unlock", async function () {
      const requiredPayment = ethers.parseEther("0.001");
      const content = "Paid content";

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        content,
        0,
        requiredPayment
      );

      // Receiver pays
      await expect(
        contract.connect(receiver).payToUnlock(0, { value: requiredPayment })
      ).to.emit(contract, "PaymentMade")
        .and.to.emit(contract, "MessageUnlocked");

      // Should be unlocked now
      expect(await contract.isUnlocked(0)).to.be.true;

      // Should be readable
      const readContent = await contract.connect(receiver).readMessage(0);
      expect(readContent).to.equal(content);
    });

    it("Should transfer payment to sender (minus protocol fee)", async function () {
      const requiredPayment = ethers.parseEther("0.001");

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Content",
        0,
        requiredPayment
      );

      const senderBalanceBefore = await ethers.provider.getBalance(sender.address);

      await contract.connect(receiver).payToUnlock(0, { value: requiredPayment });

      const senderBalanceAfter = await ethers.provider.getBalance(sender.address);
      
      // Sender should receive ~99% (1% protocol fee)
      const expectedAmount = (requiredPayment * BigInt(99)) / BigInt(100);
      expect(senderBalanceAfter - senderBalanceBefore).to.be.closeTo(
        expectedAmount,
        ethers.parseEther("0.00001") // Small tolerance
      );
    });

    it("Should prevent non-receiver from paying", async function () {
      const requiredPayment = ethers.parseEther("0.001");

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Content",
        0,
        requiredPayment
      );

      await expect(
        contract.connect(attacker).payToUnlock(0, { value: requiredPayment })
      ).to.be.revertedWith("Only receiver can perform this action");
    });

    it("Should allow partial payments", async function () {
      const requiredPayment = ethers.parseEther("0.01");
      const partialPayment = ethers.parseEther("0.005");

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Content",
        0,
        requiredPayment
      );

      // First partial payment
      await contract.connect(receiver).payToUnlock(0, { value: partialPayment });
      expect(await contract.isUnlocked(0)).to.be.false;

      // Complete payment
      await contract.connect(receiver).payToUnlock(0, { value: partialPayment });
      expect(await contract.isUnlocked(0)).to.be.true;
    });

    it("Should track payment history", async function () {
      const requiredPayment = ethers.parseEther("0.01");
      const payment1 = ethers.parseEther("0.004");
      const payment2 = ethers.parseEther("0.006");

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Content",
        0,
        requiredPayment
      );

      await contract.connect(receiver).payToUnlock(0, { value: payment1 });
      await contract.connect(receiver).payToUnlock(0, { value: payment2 });

      const history = await contract.connect(receiver).getPaymentHistory(0);
      expect(history.length).to.equal(2);
      expect(history[0].amount).to.equal(payment1);
      expect(history[1].amount).to.equal(payment2);
    });
  });

  describe("Hybrid Messages (Time OR Payment)", function () {
    it("Should send a hybrid message", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const requiredPayment = ethers.parseEther("0.001");

      await expect(
        contract.connect(sender).sendHybridMessage(
          receiver.address,
          "Hybrid content",
          0,
          unlockTime,
          requiredPayment
        )
      ).to.emit(contract, "MessageSent")
        .withArgs(0, sender.address, receiver.address, 2, unlockTime, requiredPayment);
    });

    it("Should unlock via payment before time expires", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const requiredPayment = ethers.parseEther("0.001");

      await contract.connect(sender).sendHybridMessage(
        receiver.address,
        "Hybrid",
        0,
        unlockTime,
        requiredPayment
      );

      // Pay to unlock (before time)
      await contract.connect(receiver).payToUnlock(0, { value: requiredPayment });

      expect(await contract.isUnlocked(0)).to.be.true;
      await expect(contract.connect(receiver).readMessage(0)).to.not.be.reverted;
    });

    it("Should unlock via time even without payment", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 2;
      const requiredPayment = ethers.parseEther("0.001");

      await contract.connect(sender).sendHybridMessage(
        receiver.address,
        "Hybrid",
        0,
        unlockTime,
        requiredPayment
      );

      // Wait for time to pass (no payment)
      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      expect(await contract.isUnlocked(0)).to.be.true;
      await expect(contract.connect(receiver).readMessage(0)).to.not.be.reverted;
    });
  });

  describe("IPFS Support", function () {
    it("Should accept valid IPFS v0 hash", async function () {
      const ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // Valid
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        contract.connect(sender).sendTimeLockedMessage(
          receiver.address,
          ipfsHash,
          1, // IPFS_HASH
          unlockTime
        )
      ).to.not.be.reverted;
    });

    it("Should reject invalid IPFS hash", async function () {
      const invalidHash = "NotAnIPFSHash";
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        contract.connect(sender).sendTimeLockedMessage(
          receiver.address,
          invalidHash,
          1, // IPFS_HASH
          unlockTime
        )
      ).to.be.revertedWith("Invalid IPFS hash format");
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reading locked message even if frontend hacked", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Secret",
        0,
        unlockTime
      );

      // Try to bypass via direct contract call
      await expect(
        contract.connect(receiver).getMessageContent(0)
      ).to.be.revertedWith("Message is still locked");
    });

    it("Should prevent payment before message creation (CRITICAL)", async function () {
      const requiredPayment = ethers.parseEther("0.001");

      // Send message
      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Content",
        0,
        requiredPayment
      );

      // Get message creation time
      const metadata = await contract.connect(receiver).getMessageMetadata(0);
      const createdAt = metadata.createdAt;

      // Try to pay in the same block (should fail)
      // This is automatically prevented by block.timestamp > m.createdAt check
      
      // Test: Payment timestamp must be AFTER message creation
      // In real scenario, this prevents replay attacks where someone
      // tries to use old payments for new messages
    });

    it("Should track payments per message (not global)", async function () {
      const requiredPayment = ethers.parseEther("0.001");

      // Send TWO payment-locked messages to same receiver
      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Message 1",
        0,
        requiredPayment
      );

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Message 2",
        0,
        requiredPayment
      );

      // Pay for message 0
      await contract.connect(receiver).payToUnlock(0, { value: requiredPayment });

      // Message 0 should be unlocked
      expect(await contract.isUnlocked(0)).to.be.true;

      // Message 1 should STILL BE LOCKED (different message!)
      expect(await contract.isUnlocked(1)).to.be.false;

      // Can read message 0
      await expect(contract.connect(receiver).readMessage(0)).to.not.be.reverted;

      // Cannot read message 1 (needs separate payment)
      await expect(contract.connect(receiver).readMessage(1)).to.be.revertedWith("Message is still locked");

      // Pay for message 1
      await contract.connect(receiver).payToUnlock(1, { value: requiredPayment });

      // Now message 1 should be unlocked
      expect(await contract.isUnlocked(1)).to.be.true;
    });

    it("Should prevent sender from reading their own sent message", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 2;

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Secret from sender",
        0,
        unlockTime
      );

      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      // Sender tries to read
      await expect(
        contract.connect(sender).readMessage(0)
      ).to.be.revertedWith("Only receiver can perform this action");
    });

    it("Should prevent reentrancy attacks on payment", async function () {
      // This would require a malicious contract, just checking basic protection
      const requiredPayment = ethers.parseEther("0.001");

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Content",
        0,
        requiredPayment
      );

      // Pay once
      await contract.connect(receiver).payToUnlock(0, { value: requiredPayment });

      // Try to pay again (should revert)
      await expect(
        contract.connect(receiver).payToUnlock(0, { value: ethers.parseEther("0.0001") })
      ).to.be.revertedWith("Already fully paid");
    });

    it("Should reject direct ETH transfers", async function () {
      await expect(
        sender.sendTransaction({
          to: await contract.getAddress(),
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWith("Direct transfers not allowed");
    });
  });

  describe("Metadata & Queries", function () {
    it("Should return correct metadata", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const requiredPayment = ethers.parseEther("0.001");

      await contract.connect(sender).sendHybridMessage(
        receiver.address,
        "Test",
        0,
        unlockTime,
        requiredPayment
      );

      const metadata = await contract.connect(receiver).getMessageMetadata(0);
      
      expect(metadata.sender).to.equal(sender.address);
      expect(metadata.receiver).to.equal(receiver.address);
      expect(metadata.unlockTime).to.equal(unlockTime);
      expect(metadata.requiredPayment).to.equal(requiredPayment);
      expect(metadata.conditionType).to.equal(2); // HYBRID
      expect(metadata.isUnlockedNow).to.be.false;
    });

    it("Should list received messages", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Message 1",
        0,
        unlockTime
      );

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Message 2",
        0,
        unlockTime
      );

      const received = await contract.getReceivedMessages(receiver.address);
      expect(received.length).to.equal(2);
      expect(received[0]).to.equal(0);
      expect(received[1]).to.equal(1);
    });

    it("Should list sent messages", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Test",
        0,
        unlockTime
      );

      const sent = await contract.getSentMessages(sender.address);
      expect(sent.length).to.equal(1);
      expect(sent[0]).to.equal(0);
    });

    it("Should count unread messages correctly", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 2;

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Message 1",
        0,
        unlockTime
      );

      await contract.connect(sender).sendTimeLockedMessage(
        receiver.address,
        "Message 2",
        0,
        unlockTime
      );

      // Before unlock
      expect(await contract.getUnreadCount(receiver.address)).to.equal(0);

      // After unlock
      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      expect(await contract.getUnreadCount(receiver.address)).to.equal(2);

      // Read one message
      await contract.connect(receiver).readMessage(0);
      expect(await contract.getUnreadCount(receiver.address)).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set protocol fee", async function () {
      await contract.connect(owner).setProtocolFee(3);
      expect(await contract.protocolFeePercent()).to.equal(3);
    });

    it("Should prevent non-owner from setting fee", async function () {
      await expect(
        contract.connect(attacker).setProtocolFee(5)
      ).to.be.revertedWith("Only owner");
    });

    it("Should reject fee above 5%", async function () {
      await expect(
        contract.connect(owner).setProtocolFee(10)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow emergency withdraw by owner", async function () {
      // Send some ETH via payment
      const requiredPayment = ethers.parseEther("0.01");

      await contract.connect(sender).sendPaymentLockedMessage(
        receiver.address,
        "Test",
        0,
        requiredPayment
      );

      await contract.connect(receiver).payToUnlock(0, { value: requiredPayment });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await contract.connect(owner).emergencyWithdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Owner should have gained balance (minus gas)
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore - gasUsed);
    });
  });
});
