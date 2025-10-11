"use client";

import { useState, FormEvent } from "react";
import { useAccount, useContractWrite, useWaitForTransaction, useNetwork } from "wagmi";
import { chronoMessageV3Abi } from "../lib/abi-v3";
import { useContractAddress } from "../lib/useContractAddress";
import { isAddress, parseEther } from "viem";
import { IPFSUploader } from "./IPFSUploader";

export function MessageFormV3() {
  const { address: userAddress } = useAccount();
  const { chain } = useNetwork();
  const contractAddress = useContractAddress();

  const [receiver, setReceiver] = useState("");
  const [contentType, setContentType] = useState<"text" | "ipfs">("text");
  const [textContent, setTextContent] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  
  const [conditionType, setConditionType] = useState<"time" | "payment" | "hybrid">("time");
  const [unlockTime, setUnlockTime] = useState("");
  const [feeAmount, setFeeAmount] = useState("0.001");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Determine which function to call
  const getFunctionName = () => {
    if (conditionType === "time") return "sendTimeLockedMessage";
    if (conditionType === "payment") return "sendPaymentLockedMessage";
    return "sendHybridMessage";
  };

  // Prepare arguments based on condition type
  const getArgs = (): any[] => {
    const content = contentType === "ipfs" ? ipfsHash : textContent;
    const cType = contentType === "ipfs" ? 1 : 0; // 0=TEXT, 1=IPFS_HASH
    const unlockTimestamp = unlockTime ? Math.floor(new Date(unlockTime).getTime() / 1000) : 0;
    const fee = parseEther(feeAmount || "0");

    if (conditionType === "time") {
      return [receiver, content, cType, unlockTimestamp];
    } else if (conditionType === "payment") {
      return [receiver, content, cType, fee];
    } else {
      // hybrid
      return [receiver, content, cType, unlockTimestamp, fee];
    }
  };

  const { data, write, isLoading: isWriting } = useContractWrite({
    address: contractAddress,
    abi: chronoMessageV3Abi,
    functionName: getFunctionName(),
    args: getArgs(),
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!receiver || !isAddress(receiver)) {
      setError("Invalid receiver address");
      return;
    }

    if (receiver.toLowerCase() === userAddress?.toLowerCase()) {
      setError("Cannot send to yourself");
      return;
    }

    const content = contentType === "ipfs" ? ipfsHash : textContent;
    if (!content) {
      setError("Content or IPFS hash required");
      return;
    }

    if (conditionType === "time" || conditionType === "hybrid") {
      if (!unlockTime) {
        setError("Unlock time required");
        return;
      }
      const timestamp = new Date(unlockTime).getTime();
      if (timestamp <= Date.now()) {
        setError("Unlock time must be in the future");
        return;
      }
    }

    if (conditionType === "payment" || conditionType === "hybrid") {
      const fee = parseFloat(feeAmount);
      if (isNaN(fee) || fee < 0.0001) {
        setError("Minimum fee: 0.0001 ETH");
        return;
      }
    }

    try {
      write?.();
    } catch (err) {
      console.error("Transaction error:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  // Success handling
  if (isSuccess && !success) {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      // Reset form
      setReceiver("");
      setTextContent("");
      setIpfsHash("");
    }, 3000);
  }

  return (
    <>
      {success && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className="rounded-lg border border-neon-green/50 bg-neon-green/20 px-4 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-neon-green flex items-center gap-2">
              <span>✅</span> Message sent successfully!
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue backdrop-blur-sm"
      >
        <h2 className="text-xl font-bold text-cyber-blue">Send Sealed Message (V3)</h2>

        {/* Receiver */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wide text-cyber-blue">
            Receiver Address
          </label>
          <input
            type="text"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            placeholder="0x..."
            className={`rounded-lg border px-4 py-3 font-mono text-sm outline-none transition ${
              receiver && receiver.toLowerCase() === userAddress?.toLowerCase()
                ? 'border-red-500 bg-red-950/30 text-text-light'
                : 'border-cyber-blue/40 bg-midnight/60 text-text-light'
            }`}
          />
        </div>

        {/* Content Type */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wide text-cyber-blue">
            Content Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContentType("text")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                contentType === "text"
                  ? "bg-neon-orange/20 border-2 border-neon-orange text-neon-orange"
                  : "bg-midnight/40 border border-cyber-blue/30 text-text-light"
              }`}
            >
              📝 Text
            </button>
            <button
              type="button"
              onClick={() => setContentType("ipfs")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                contentType === "ipfs"
                  ? "bg-neon-orange/20 border-2 border-neon-orange text-neon-orange"
                  : "bg-midnight/40 border border-cyber-blue/30 text-text-light"
              }`}
            >
              📁 File (IPFS)
            </button>
          </div>
        </div>

        {/* Content */}
        {contentType === "text" ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold uppercase tracking-wide text-cyber-blue">
              Message
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Write your sealed message..."
              className="min-h-[120px] rounded-lg border border-cyber-blue/40 bg-midnight/60 px-4 py-3 text-text-light outline-none"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold uppercase tracking-wide text-cyber-blue">
              Upload File
            </label>
            <IPFSUploader
              onUploadComplete={(hash) => setIpfsHash(hash)}
              onError={(err) => setError(err)}
            />
            {ipfsHash && (
              <p className="text-xs text-neon-green">
                ✅ IPFS Hash: {ipfsHash.slice(0, 10)}...{ipfsHash.slice(-8)}
              </p>
            )}
          </div>
        )}

        {/* Condition Type */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold uppercase tracking-wide text-text-light/80 mb-3">
            Unlock Condition
          </label>
          
          <div className="flex gap-0">
            <button
              type="button"
              onClick={() => setConditionType("time")}
              className={`flex-1 rounded-t-lg px-4 py-3 text-sm font-semibold transition border-t-2 border-l-2 border-r border-b-0 ${
                conditionType === "time"
                  ? "bg-neon-green/20 border-neon-green text-neon-green"
                  : "bg-midnight/40 border-cyber-blue/30 text-text-light/60"
              }`}
            >
              ⏰ Time Lock
            </button>
            <button
              type="button"
              onClick={() => setConditionType("payment")}
              className={`flex-1 rounded-t-lg px-4 py-3 text-sm font-semibold transition border-t-2 border-r border-l border-b-0 ${
                conditionType === "payment"
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-400"
                  : "bg-midnight/40 border-cyber-blue/30 text-text-light/60"
              }`}
            >
              💰 Payment
            </button>
            <button
              type="button"
              onClick={() => setConditionType("hybrid")}
              className={`flex-1 rounded-t-lg px-4 py-3 text-sm font-semibold transition border-t-2 border-r-2 border-l border-b-0 ${
                conditionType === "hybrid"
                  ? "bg-neon-purple/20 border-neon-purple text-neon-purple"
                  : "bg-midnight/40 border-cyber-blue/30 text-text-light/60"
              }`}
            >
              🔄 Hybrid
            </button>
          </div>

          <div className={`rounded-b-lg rounded-tr-lg border-2 border-t-0 p-4 transition ${
            conditionType === "time" 
              ? "border-neon-green bg-neon-green/10"
              : conditionType === "payment"
              ? "border-cyan-400 bg-cyan-500/10"
              : "border-neon-purple bg-neon-purple/10"
          }`}>
            {/* Time Lock */}
            {(conditionType === "time" || conditionType === "hybrid") && (
              <div className="flex flex-col gap-2 mb-3">
                <label className="text-sm font-semibold text-neon-green">
                  Unlock Time
                </label>
                <input
                  type="datetime-local"
                  value={unlockTime}
                  onChange={(e) => setUnlockTime(e.target.value)}
                  className="rounded-lg border border-neon-green/40 bg-midnight/60 px-4 py-3 text-text-light outline-none"
                />
              </div>
            )}

            {/* Payment */}
            {(conditionType === "payment" || conditionType === "hybrid") && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-cyan-400">
                  Required Fee (ETH)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="0.001"
                  className="rounded-lg border border-cyan-400/40 bg-midnight/60 px-4 py-3 text-text-light outline-none"
                />
                <p className="text-xs text-cyan-300">
                  💡 Receiver must pay this fee to unlock
                </p>
              </div>
            )}

            {conditionType === "hybrid" && (
              <div className="mt-3 rounded-lg bg-neon-purple/10 border border-neon-purple/30 p-3 text-xs text-neon-purple">
                <p>🔄 <strong>Hybrid Mode:</strong> Unlocks when time expires OR payment is made (whichever comes first)</p>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">❌ {error}</p>}

        <button
          type="submit"
          disabled={isWriting || isConfirming}
          className="w-full rounded-lg bg-gradient-to-r from-neon-green via-cyber-blue to-neon-purple px-4 py-3 text-center text-sm font-semibold uppercase tracking-widest text-midnight transition hover:scale-[1.02] disabled:opacity-50"
        >
          {isWriting || isConfirming ? "Sending..." : "Send Sealed Message"}
        </button>

        {data?.hash && (
          <p className="text-xs text-text-light/60 text-center">
            Tx: {data.hash.slice(0, 10)}...{data.hash.slice(-6)}
          </p>
        )}
      </form>
    </>
  );
}
