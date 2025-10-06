import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ChronoMessageZama } from "../typechain-types";

describe("ChronoMessageZama (Zama FHE)", function () {
  let contract: ChronoMessageZama;
  let contractAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  before(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    alice = signers[1];
    bob = signers[2];
  });

  beforeEach(async function () {
    // Skip if not running on mock FHEVM
    if (!fhevm.isMock) {
      console.warn("⚠️  These tests only run on local mock FHEVM (use --network localhost)");
      this.skip();
    }

    const ContractFactory = await ethers.getContractFactory("ChronoMessageZama");
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(contractAddress).to.be.properAddress;
    });

    it("should have zero messages initially", async function () {
      const messageCount = await contract.messageCount();
      expect(messageCount).to.equal(0);
    });
  });

  describe("Send Message (FHE Encrypted)", function () {
    it("should send an encrypted message with future unlock time", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 saat sonra

      // Mesajı FHE ile şifrele (euint256)
      const messageValue = 12345n; // Test değeri
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(messageValue)
        .encrypt();

      // Mesajı gönder
      const tx = await contract
        .connect(alice)
        .sendMessage(
          encrypted.handles[0],
          encrypted.inputProof,
          unlockTime
        );

      await tx.wait();

      // Mesaj sayısını kontrol et
      const messageCount = await contract.messageCount();
      expect(messageCount).to.equal(1);

      // Metadata'yı kontrol et
      const [sender, msgUnlockTime, isUnlocked] = await contract.getMessageMetadata(0);
      expect(sender).to.equal(alice.address);
      expect(msgUnlockTime).to.equal(unlockTime);
      expect(isUnlocked).to.be.false;
    });

    it("should reject message with past unlock time", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 saat önce

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(42n)
        .encrypt();

      await expect(
        contract.connect(alice).sendMessage(
          encrypted.handles[0],
          encrypted.inputProof,
          pastTime
        )
      ).to.be.revertedWith("Unlock time must be in future");
    });

    it("should emit MessageSent event", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(999n)
        .encrypt();

      await expect(
        contract.connect(alice).sendMessage(
          encrypted.handles[0],
          encrypted.inputProof,
          unlockTime
        )
      ).to.emit(contract, "MessageSent")
        .withArgs(0, alice.address, unlockTime);
    });
  });

  describe("Read Message (FHE Decryption)", function () {
    it("should not allow reading before unlock time", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(777n)
        .encrypt();

      await contract
        .connect(alice)
        .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);

      // Zaman kilidi henüz açılmamış - okumaya çalış
      await expect(
        contract.connect(alice).readMessage(0)
      ).to.be.revertedWith("Message still locked");
    });

    it("should allow sender to read message after unlock time", async function () {
      const messageValue = 888n;
      
      // Mevcut block timestamp'i al
      const currentBlock = await ethers.provider.getBlock('latest');
      const unlockTime = currentBlock!.timestamp + 10; // 10 saniye sonra

      // Mesaj gönder
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(messageValue)
        .encrypt();

      await contract
        .connect(alice)
        .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);

      // Zaman simülasyonu - Hardhat'te increase time
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      // Şimdi okuyabilmeli
      const encryptedContent = await contract.connect(alice).readMessage(0);
      expect(encryptedContent).to.not.equal(ethers.ZeroHash);
    });

    it("should not allow non-sender to read message", async function () {
      // Mevcut block timestamp'i al
      const currentBlock = await ethers.provider.getBlock('latest');
      const unlockTime = currentBlock!.timestamp + 10;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(555n)
        .encrypt();

      await contract
        .connect(alice)
        .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);

      // Zaman simülasyonu
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      // Bob okumaya çalışsın (fail olmalı)
      await expect(
        contract.connect(bob).readMessage(0)
      ).to.be.revertedWith("Only sender can read");
    });

    it("should reject reading non-existent message", async function () {
      await expect(
        contract.connect(alice).readMessage(999)
      ).to.be.revertedWith("Message not found");
    });
  });

  describe("Metadata Functions", function () {
    it("should return correct metadata", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(123n)
        .encrypt();

      await contract
        .connect(alice)
        .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);

      const [sender, msgUnlockTime, isUnlocked] = await contract.getMessageMetadata(0);

      expect(sender).to.equal(alice.address);
      expect(msgUnlockTime).to.equal(unlockTime);
      expect(isUnlocked).to.be.false;
    });

    it("should track user message count", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      // Alice 2 mesaj göndersin
      for (let i = 0; i < 2; i++) {
        const encrypted = await fhevm
          .createEncryptedInput(contractAddress, alice.address)
          .add256(BigInt(i + 100))
          .encrypt();

        await contract
          .connect(alice)
          .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);
      }

      // Bob 1 mesaj göndersin
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, bob.address)
        .add256(999n)
        .encrypt();

      await contract
        .connect(bob)
        .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);

      // Mesaj sayılarını kontrol et
      const aliceCount = await contract.getUserMessageCount(alice.address);
      const bobCount = await contract.getUserMessageCount(bob.address);

      expect(aliceCount).to.equal(2);
      expect(bobCount).to.equal(1);
    });

    it("should correctly report message lock status", async function () {
      // Mevcut block timestamp'i al
      const currentBlock = await ethers.provider.getBlock('latest');
      const unlockTime = currentBlock!.timestamp + 10;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, alice.address)
        .add256(456n)
        .encrypt();

      await contract
        .connect(alice)
        .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);

      // Mesaj kilitli olmalı
      let isLocked = await contract.isMessageLocked(0);
      expect(isLocked).to.be.true;

      // Zaman simülasyonu
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      // Artık kilitli olmamalı
      isLocked = await contract.isMessageLocked(0);
      expect(isLocked).to.be.false;
    });
  });

  describe("Multiple Messages", function () {
    it("should handle multiple messages from different users", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;

      // 3 farklı kullanıcıdan mesaj
      const users = [alice, bob, owner];
      
      for (let i = 0; i < users.length; i++) {
        const encrypted = await fhevm
          .createEncryptedInput(contractAddress, users[i].address)
          .add256(BigInt(i * 100))
          .encrypt();

        await contract
          .connect(users[i])
          .sendMessage(encrypted.handles[0], encrypted.inputProof, unlockTime);
      }

      // Toplam mesaj sayısı
      const messageCount = await contract.messageCount();
      expect(messageCount).to.equal(3);

      // Her kullanıcının kendi mesajını kontrol et
      for (let i = 0; i < users.length; i++) {
        const [sender] = await contract.getMessageMetadata(i);
        expect(sender).to.equal(users[i].address);
      }
    });
  });
});
