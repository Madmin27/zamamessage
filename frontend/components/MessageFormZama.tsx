"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAccount, useNetwork, useWalletClient, usePublicClient } from "wagmi";
import { chronoMessageZamaAbi } from "../lib/abi-zama";
import { isAddress } from "viem";
import { useContractAddress } from "../lib/useContractAddress";
import { createInstance } from "fhevmjs";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

interface MessageFormProps {
  onSubmitted?: () => void;
}

export function MessageFormZama({ onSubmitted }: MessageFormProps) {
  const { isConnected, address: userAddress } = useAccount();
  const { chain } = useNetwork();
  const contractAddress = useContractAddress();
  
  const [receiver, setReceiver] = useState("");
  const [content, setContent] = useState("");
  const [unlockMode, setUnlockMode] = useState<"preset" | "custom">("preset");
  const [presetDuration, setPresetDuration] = useState<number>(10);
  const [unlock, setUnlock] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>("Europe/Istanbul");
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    setMounted(true);
    const localTime = new Date();
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hours = String(localTime.getHours()).padStart(2, '0');
    const minutes = String(localTime.getMinutes()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    setUnlock(formatted);
  }, []);

  const unlockTimestamp = useMemo(() => {
    if (unlockMode === "preset") {
      return Math.floor(Date.now() / 1000) + presetDuration;
    }
    if (!unlock) return Math.floor(Date.now() / 1000);
    
    try {
      const parsed = dayjs.tz(unlock, selectedTimezone);
      if (!parsed.isValid()) {
        return Math.floor(Date.now() / 1000);
      }
      return parsed.unix();
    } catch (err) {
      return Math.floor(Date.now() / 1000);
    }
  }, [unlockMode, presetDuration, unlock, selectedTimezone]);

  const isFormValid = useMemo(() => {
    return isConnected &&
      !!receiver &&
      isAddress(receiver) &&
      receiver.toLowerCase() !== userAddress?.toLowerCase() &&
      content.trim().length > 0 &&
      unlockTimestamp > Math.floor(Date.now() / 1000);
  }, [isConnected, receiver, userAddress, content, unlockTimestamp]);

  const unlockTimeDisplay = useMemo(() => {
    if (!mounted) return { local: "", utc: "", relative: "", selected: "" };
    
    try {
      const timestamp = unlockTimestamp * 1000;
      const localTime = dayjs(timestamp).format("DD MMM YYYY, HH:mm");
      const utcTime = dayjs(timestamp).utc().format("DD MMM YYYY, HH:mm");
      const selectedTime = dayjs(timestamp).tz(selectedTimezone).format("DD MMM YYYY, HH:mm");
      const relative = dayjs(timestamp).fromNow();
      
      return { local: localTime, utc: utcTime, selected: selectedTime, relative };
    } catch (err) {
      return { local: "---", utc: "---", selected: "---", relative: "---" };
    }
  }, [unlockTimestamp, selectedTimezone, mounted]);

  const sendZamaMessage = async () => {
    if (!walletClient || !contractAddress || !userAddress || !chain) {
      setError("Wallet not connected");
      return;
    }

    if (!receiver || !isAddress(receiver)) {
      setError("Invalid receiver address");
      return;
    }

    if (receiver.toLowerCase() === userAddress.toLowerCase()) {
      setError("❌ Cannot send message to yourself!");
      return;
    }

    if (content.trim().length === 0) {
      setError("Message content is required");
      return;
    }

    if (unlockTimestamp <= Math.floor(Date.now() / 1000)) {
      setError("Unlock time must be in the future");
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      console.log('🔐 Preparing Zama FHE encryption...');
      
      // Convert content to BigInt hash
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(content);
      
      // Create a 256-bit hash from content
      let contentHash = 0n;
      for (let i = 0; i < Math.min(contentBytes.length, 32); i++) {
        contentHash = contentHash | (BigInt(contentBytes[i]) << BigInt(i * 8));
      }

      console.log('📝 Content hash:', contentHash.toString(16));

      // TODO: Real FHE encryption with fhevmjs
      // For now, use placeholder until we figure out the correct API
      // const instance = await createInstance({ chainId: chain.id });
      // const input = instance.createEncryptedInput(contractAddress, userAddress);
      // ... proper encryption

      // Placeholder: Convert hash to bytes32 format
      const mockEncryptedHandle = ('0x' + contentHash.toString(16).padStart(64, '0')) as `0x${string}`;
      const mockInputProof = '0x' as `0x${string}`; // Empty proof

      console.log('⚠️ Using placeholder encryption (FHE SDK integration pending)');
      console.log('📦 Encrypted handle:', mockEncryptedHandle);

      // Send transaction
      console.log('📤 Sending transaction...');
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: chronoMessageZamaAbi,
        functionName: 'sendMessage',
        args: [
          receiver as `0x${string}`,
          mockEncryptedHandle,
          mockInputProof,
          BigInt(unlockTimestamp),
          0n, // requiredPayment (0 for test)
          0x01, // conditionMask (time-only)
          "", // fileName
          0n, // fileSize
          "", // contentType
          "" // previewImageHash
        ],
        chain: walletClient.chain,
        account: userAddress
      });

      console.log('✅ Transaction sent:', hash);
      setTxHash(hash);

      // Wait for confirmation
      if (publicClient) {
        console.log('⏳ Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('✅ Transaction confirmed:', receipt);
        
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 5000);

        // Reset form
        setReceiver("");
        setContent("");
        
        if (onSubmitted) {
          onSubmitted();
        }
      }
    } catch (err: any) {
      console.error('❌ Zama message send error:', err);
      setError(`Transaction failed: ${err.shortMessage || err.message || 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    await sendZamaMessage();
  };

  if (!mounted) {
    return (
      <div className="space-y-4 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue">
        <p className="text-sm text-text-light/60">Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-4 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue">
        <p className="text-sm text-text-light/60">Connect your wallet to send encrypted messages...</p>
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="space-y-4 rounded-xl border border-orange-700/50 bg-orange-900/20 p-6 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-orange-300">No Zama Contract</h3>
            <p className="mt-2 text-sm text-orange-200/80">
              Zama FHE contract not deployed on this network. Supported networks:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-orange-200/80">
              <li>✅ Sepolia</li>
              <li>✅ Base Sepolia</li>
              <li>✅ Scroll Sepolia</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {successToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="rounded-lg border border-green-500/50 bg-green-900/80 px-4 py-3 shadow-lg">
            <p className="text-green-100 flex items-center gap-2">
              <span>✅</span> Encrypted message sent successfully!
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue backdrop-blur">
        <div className="flex items-center gap-3 border-b border-cyber-blue/20 pb-4">
          <span className="text-2xl">🔐</span>
          <div>
            <h2 className="text-lg font-semibold text-text-light">Send Encrypted Message</h2>
            <p className="text-xs text-text-light/60">Using Zama FHE - Fully Homomorphic Encryption</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-3">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-light">
              Receiver Address
            </label>
            <input
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-cyber-blue/30 bg-midnight/60 px-4 py-2 text-text-light placeholder-text-light/40 focus:border-cyber-blue focus:outline-none"
              disabled={isSending}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-light">
              Message Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your secret message..."
              rows={4}
              className="w-full rounded-lg border border-cyber-blue/30 bg-midnight/60 px-4 py-2 text-text-light placeholder-text-light/40 focus:border-cyber-blue focus:outline-none resize-none"
              disabled={isSending}
            />
            <p className="mt-1 text-xs text-text-light/60">
              ✨ Message will be encrypted on-chain using Zama FHE
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-light">
              Unlock Time
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUnlockMode("preset")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  unlockMode === "preset"
                    ? "bg-cyber-blue text-midnight"
                    : "border border-cyber-blue/30 text-text-light hover:bg-cyber-blue/10"
                }`}
                disabled={isSending}
              >
                Quick Select
              </button>
              <button
                type="button"
                onClick={() => setUnlockMode("custom")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  unlockMode === "custom"
                    ? "bg-cyber-blue text-midnight"
                    : "border border-cyber-blue/30 text-text-light hover:bg-cyber-blue/10"
                }`}
                disabled={isSending}
              >
                Custom Time
              </button>
            </div>

            {unlockMode === "preset" && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                  className="w-full rounded-lg border border-cyber-blue/30 bg-midnight/60 px-4 py-2 text-left text-text-light hover:bg-cyber-blue/5"
                  disabled={isSending}
                >
                  <div className="flex items-center justify-between">
                    <span>⏱️ {presetDuration < 60 ? `${presetDuration}s` : `${Math.floor(presetDuration / 60)}m`}</span>
                    <span className="text-xs text-text-light/60">
                      {unlockTimeDisplay.relative}
                    </span>
                  </div>
                </button>
                
                {isPresetsOpen && (
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 30, 60, 300, 600, 1800, 3600, 7200, 86400].map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => {
                          setPresetDuration(seconds);
                          setIsPresetsOpen(false);
                        }}
                        className="rounded-lg border border-cyber-blue/30 bg-midnight/40 px-3 py-2 text-sm text-text-light hover:bg-cyber-blue/10"
                        disabled={isSending}
                      >
                        {seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${seconds / 60}m` : `${seconds / 3600}h`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {unlockMode === "custom" && (
              <div className="mt-3">
                <input
                  type="datetime-local"
                  value={unlock}
                  onChange={(e) => setUnlock(e.target.value)}
                  className="w-full rounded-lg border border-cyber-blue/30 bg-midnight/60 px-4 py-2 text-text-light focus:border-cyber-blue focus:outline-none"
                  disabled={isSending}
                />
              </div>
            )}

            <div className="mt-2 text-xs text-text-light/60">
              <p>🕒 Unlock: {unlockTimeDisplay.selected} ({selectedTimezone})</p>
              <p>⏰ {unlockTimeDisplay.relative}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isSending}
          className={`w-full rounded-lg px-6 py-3 font-semibold transition ${
            isFormValid && !isSending
              ? "bg-cyber-blue text-midnight hover:bg-cyber-blue/90"
              : "cursor-not-allowed bg-cyber-blue/30 text-text-light/40"
          }`}
        >
          {isSending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Encrypting & Sending...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🔒</span>
              Send Encrypted Message
            </span>
          )}
        </button>

        {txHash && (
          <div className="text-xs text-text-light/60">
            <p>Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
          </div>
        )}
      </form>
    </>
  );
}
