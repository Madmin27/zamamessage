import { expect } from "chai";
import { ethers } from "hardhat";
import { ChronoMessageV2 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ChronoMessageV2", function () {
  let contract: ChronoMessageV2;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    
    const ChronoMessageV2Factory = await ethers.getContractFactory("ChronoMessageV2");
    contract = await ChronoMessageV2Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should start with zero messages", async function () {
      expect(await contract.messageCount()).to.equal(0);
    });
  });

  describe("Sending Messages", function () {
    it("Should send a message from Alice to Bob", async function () {
      const unlockTime = (await time.latest()) + 3600; // 1 saat sonra
      const content = "Merhaba Bob, bu gizli bir mesaj!";

      await expect(
        contract.connect(alice).sendMessage(bob.address, content, unlockTime)
      )
        .to.emit(contract, "MessageSent")
        .withArgs(0, alice.address, bob.address, unlockTime);

      expect(await contract.messageCount()).to.equal(1);
    });

    it("Should fail when sending to zero address", async function () {
      const unlockTime = (await time.latest()) + 3600;
      
      await expect(
        contract.connect(alice).sendMessage(ethers.ZeroAddress, "test", unlockTime)
      ).to.be.revertedWith("Invalid receiver address");
    });

    it("Should fail when sending to yourself", async function () {
      const unlockTime = (await time.latest()) + 3600;
      
      await expect(
        contract.connect(alice).sendMessage(alice.address, "test", unlockTime)
      ).to.be.revertedWith("Cannot send to yourself");
    });

    it("Should fail with empty content", async function () {
      const unlockTime = (await time.latest()) + 3600;
      
      await expect(
        contract.connect(alice).sendMessage(bob.address, "", unlockTime)
      ).to.be.revertedWith("Empty content");
    });

    it("Should fail with past unlock time", async function () {
      const unlockTime = (await time.latest()) - 3600; // 1 saat önce
      
      await expect(
        contract.connect(alice).sendMessage(bob.address, "test", unlockTime)
      ).to.be.revertedWith("Unlock time must be in the future");
    });
  });

  describe("Reading Messages - Privacy", function () {
    let messageId: number;
    const content = "Süper gizli mesaj!";
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + 3600;
      const tx = await contract.connect(alice).sendMessage(bob.address, content, unlockTime);
      await tx.wait();
      messageId = 0;
    });

    it("Should NOT allow sender (Alice) to read the message", async function () {
      // Unlock time geçse bile gönderen okuyamaz
      await time.increaseTo(unlockTime + 1);
      
      await expect(
        contract.connect(alice).readMessage(messageId)
      ).to.be.revertedWith("Only receiver can read the message");
    });

    it("Should NOT allow third party (Charlie) to read the message", async function () {
      await time.increaseTo(unlockTime + 1);
      
      await expect(
        contract.connect(charlie).readMessage(messageId)
      ).to.be.revertedWith("Only receiver can read the message");
    });

    it("Should allow receiver (Bob) to read after unlock time", async function () {
      await time.increaseTo(unlockTime + 1);
      
      // staticCall kullanarak sadece return value'yu al (state değişmeden)
      const readContent = await contract.connect(bob).readMessage.staticCall(messageId);
      expect(readContent).to.equal(content);
    });

    it("Should NOT allow receiver to read before unlock time", async function () {
      await expect(
        contract.connect(bob).readMessage(messageId)
      ).to.be.revertedWith("Message still locked");
    });

    it("Should mark message as read after first read", async function () {
      await time.increaseTo(unlockTime + 1);
      
      // İlk okuma
      await expect(
        contract.connect(bob).readMessage(messageId)
      ).to.emit(contract, "MessageRead")
        .withArgs(messageId, bob.address);

      // Metadata kontrolü
      const [, , , isRead] = await contract.connect(bob).getMessageMetadata(messageId);
      expect(isRead).to.be.true;
    });
  });

  describe("Message Metadata", function () {
    let messageId: number;
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + 3600;
      await contract.connect(alice).sendMessage(bob.address, "test", unlockTime);
      messageId = 0;
    });

    it("Should allow sender to view metadata", async function () {
      const [sender, receiver, time, isRead] = await contract.connect(alice).getMessageMetadata(messageId);
      
      expect(sender).to.equal(alice.address);
      expect(receiver).to.equal(bob.address);
      expect(time).to.equal(unlockTime);
      expect(isRead).to.be.false;
    });

    it("Should allow receiver to view metadata", async function () {
      const [sender, receiver, time, isRead] = await contract.connect(bob).getMessageMetadata(messageId);
      
      expect(sender).to.equal(alice.address);
      expect(receiver).to.equal(bob.address);
      expect(time).to.equal(unlockTime);
      expect(isRead).to.be.false;
    });

    it("Should NOT allow third party to view metadata", async function () {
      await expect(
        contract.connect(charlie).getMessageMetadata(messageId)
      ).to.be.revertedWith("Not authorized to view this message");
    });
  });

  describe("Message Tracking", function () {
    beforeEach(async function () {
      const unlockTime = (await time.latest()) + 3600;
      
      // Alice -> Bob (2 mesaj)
      await contract.connect(alice).sendMessage(bob.address, "Mesaj 1", unlockTime);
      await contract.connect(alice).sendMessage(bob.address, "Mesaj 2", unlockTime + 100);
      
      // Bob -> Alice (1 mesaj)
      await contract.connect(bob).sendMessage(alice.address, "Cevap", unlockTime + 200);
      
      // Charlie -> Bob (1 mesaj)
      await contract.connect(charlie).sendMessage(bob.address, "Selam", unlockTime + 300);
    });

    it("Should track received messages correctly", async function () {
      const bobReceived = await contract.getReceivedMessages(bob.address);
      expect(bobReceived.length).to.equal(3); // Alice'ten 2, Charlie'den 1
      expect(bobReceived).to.deep.equal([0, 1, 3]);

      const aliceReceived = await contract.getReceivedMessages(alice.address);
      expect(aliceReceived.length).to.equal(1); // Bob'dan 1
      expect(aliceReceived).to.deep.equal([2]);
    });

    it("Should track sent messages correctly", async function () {
      const aliceSent = await contract.getSentMessages(alice.address);
      expect(aliceSent.length).to.equal(2);
      expect(aliceSent).to.deep.equal([0, 1]);

      const bobSent = await contract.getSentMessages(bob.address);
      expect(bobSent.length).to.equal(1);
      expect(bobSent).to.deep.equal([2]);

      const charlieSent = await contract.getSentMessages(charlie.address);
      expect(charlieSent.length).to.equal(1);
      expect(charlieSent).to.deep.equal([3]);
    });
  });

  describe("Unread Count", function () {
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + 3600;
      
      // Alice -> Bob (2 mesaj, farklı unlock time)
      await contract.connect(alice).sendMessage(bob.address, "Mesaj 1", unlockTime);
      await contract.connect(alice).sendMessage(bob.address, "Mesaj 2", unlockTime + 7200);
    });

    it("Should return 0 unread before unlock time", async function () {
      const unreadCount = await contract.getUnreadCount(bob.address);
      expect(unreadCount).to.equal(0);
    });

    it("Should return 1 unread after first message unlocks", async function () {
      await time.increaseTo(unlockTime + 1);
      
      const unreadCount = await contract.getUnreadCount(bob.address);
      expect(unreadCount).to.equal(1);
    });

    it("Should return 2 unread after both messages unlock", async function () {
      await time.increaseTo(unlockTime + 7201);
      
      const unreadCount = await contract.getUnreadCount(bob.address);
      expect(unreadCount).to.equal(2);
    });

    it("Should decrease unread count after reading", async function () {
      await time.increaseTo(unlockTime + 7201);
      
      // İlk mesajı oku
      await contract.connect(bob).readMessage(0);
      
      const unreadCount = await contract.getUnreadCount(bob.address);
      expect(unreadCount).to.equal(1); // Sadece ikinci mesaj okunmamış
    });
  });

  describe("IsUnlocked Helper", function () {
    let messageId: number;
    let unlockTime: number;

    beforeEach(async function () {
      unlockTime = (await time.latest()) + 3600;
      await contract.connect(alice).sendMessage(bob.address, "test", unlockTime);
      messageId = 0;
    });

    it("Should return false before unlock time", async function () {
      expect(await contract.isUnlocked(messageId)).to.be.false;
    });

    it("Should return true after unlock time", async function () {
      await time.increaseTo(unlockTime + 1);
      expect(await contract.isUnlocked(messageId)).to.be.true;
    });
  });

  describe("Multiple Users Scenario", function () {
    it("Should handle complex message flow", async function () {
      const baseTime = await time.latest();
      
      // Alice -> Bob: "Gizli proje hakkında konuşalım"
      await contract.connect(alice).sendMessage(
        bob.address,
        "Gizli proje hakkında konuşalım",
        baseTime + 1000
      );
      
      // Bob -> Alice: "Tamam, saat 3'te buluşalım"
      await contract.connect(bob).sendMessage(
        alice.address,
        "Tamam, saat 3'te buluşalım",
        baseTime + 2000
      );
      
      // Charlie -> Bob: "Partiye gelecek misin?"
      await contract.connect(charlie).sendMessage(
        bob.address,
        "Partiye gelecek misin?",
        baseTime + 1500
      );

      // Kontroller
      expect(await contract.messageCount()).to.equal(3);
      
      // Bob 2 mesaj almalı
      const bobReceived = await contract.getReceivedMessages(bob.address);
      expect(bobReceived.length).to.equal(2);
      
      // Alice 1 mesaj almalı
      const aliceReceived = await contract.getReceivedMessages(alice.address);
      expect(aliceReceived.length).to.equal(1);
      
      // Zaman ilerlet
      await time.increaseTo(baseTime + 2001);
      
      // Bob ilk mesajını okusun (Alice'ten)
      const msg1 = await contract.connect(bob).readMessage.staticCall(0);
      expect(msg1).to.equal("Gizli proje hakkında konuşalım");
      
      // Alice mesajını okusun (Bob'dan)
      const msg2 = await contract.connect(alice).readMessage.staticCall(1);
      expect(msg2).to.equal("Tamam, saat 3'te buluşalım");
      
      // Bob ikinci mesajını okusun (Charlie'den)
      const msg3 = await contract.connect(bob).readMessage.staticCall(2);
      expect(msg3).to.equal("Partiye gelecek misin?");
      
      // Alice Bob'un mesajını okuyamaz (gönderen okuyamaz)
      await expect(
        contract.connect(bob).readMessage(1)
      ).to.be.revertedWith("Only receiver can read the message");
    });
  });
});
