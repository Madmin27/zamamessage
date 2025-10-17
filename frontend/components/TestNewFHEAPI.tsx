"use client";

/**
 * YENİ FHE API TEST COMPONENT
 * @fhevm/solidity@0.7.0 test eder
 * Contract: TestTFHEPattern
 */

import { useState, useEffect } from "react";
import { useFhe } from "./FheProvider";
import { useAccount, useContractWrite, useWaitForTransaction, useChainId, usePublicClient } from "wagmi";
import { parseAbi } from "viem";

// YENİ API ile deploy edilen test contract
const TEST_CONTRACT = "0x07b4314c9cC7478F665416425d8d5B80Ba610eB1";

const TEST_ABI = parseAbi([
  "function storeValue(bytes32 encryptedValue, bytes calldata inputProof) external",
  "function testCount() external view returns (uint256)"
]);

export default function TestNewFHEAPI() {
  const { address } = useAccount();
  const fhe = useFhe(); // EmelMarket pattern
  const chainId = useChainId();
  const isSepolia = chainId === 11155111;
  const publicClient = usePublicClient();
  
  const [status, setStatus] = useState("");
  const [testValue, setTestValue] = useState("42");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [fheReady, setFheReady] = useState(false);

  function toHex(input: any): `0x${string}` | null {
    if (!input) return null;
    if (typeof input === "string") {
      return (input.startsWith("0x") ? input : ("0x" + input)) as `0x${string}`;
    }
    if (input instanceof Uint8Array) {
      return ("0x" + Array.from(input).map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
    }
    if (Array.isArray(input)) {
      return ("0x" + input.map((b) => Number(b).toString(16).padStart(2, "0")).join("")) as `0x${string}`;
    }
    try {
      // TypedArray benzeri objeler
      // @ts-ignore
      const arr = Array.from(input);
      if (arr && arr.length >= 0) {
        return ("0x" + arr.map((b: any) => Number(b).toString(16).padStart(2, "0")).join("")) as `0x${string}`;
      }
    } catch {}
    return null;
  }

  // Not: Handle'ı asla kes/pad etme; SDK ne verdiyse aynen ilet.

  // FHE yüklenme kontrolü
  useEffect(() => {
    if (fhe?.createEncryptedInput) {
      setFheReady(true);
      console.log("✅ FHE ready!");
    }
  }, [fhe]);

  const { write, data: writeResult, isLoading: isWriting, error: writeError } = useContractWrite({
    address: TEST_CONTRACT as `0x${string}`,
    abi: TEST_ABI,
    functionName: "storeValue",
  });
  
  const { isLoading: isConfirming, isSuccess, isError: isTxError } = useWaitForTransaction({ 
    hash: writeResult?.hash 
  });

  async function testStoreValue() {
    if (!fhe || !address) {
  setStatus("❌ FHE or wallet is not connected!");
      return;
    }
    if (!isSepolia) {
  setStatus("❌ Wrong network: Zama FHE only supports Sepolia (11155111). Please switch to Sepolia.");
      return;
    }

    try {
  setStatus("1️⃣ Encrypting value...");
      const value = BigInt(testValue);
      
      // FHE hazır mı kontrol et
      if (!fhe.createEncryptedInput) {
  setStatus("❌ FHE has not loaded yet. Refresh the page.");
        return;
      }
      
      console.log("🔐 Encrypting value:", value.toString());
      
      // Şifreleme (EmelMarket pattern - chaining)
      // SDK chaining bazı versiyonlarda çalışmıyor → etap etap ilerle
      const inputCreator = fhe.createEncryptedInput(TEST_CONTRACT, address);
      const handlesBuilder = inputCreator.add64(value);
      const encryptedValue = await handlesBuilder.encrypt();
      
      console.log("✅ Encrypted:", {
        handles: encryptedValue.handles,
        proof: encryptedValue.inputProof
      });
      
      if (!encryptedValue.handles || !encryptedValue.handles[0]) {
  setStatus("❌ Encryption failed: handles array is empty!");
        return;
      }
      
      const encryptedDataRaw = encryptedValue.handles[0];
      const proofRaw = encryptedValue.inputProof;

  const encryptedData = toHex(encryptedDataRaw);
      const proof = toHex(proofRaw);

      console.log("🔎 Types & Context:", {
        encryptSender: address,
        txSender: address,
        handleType: typeof encryptedDataRaw,
        proofType: typeof proofRaw,
        handleLen: (encryptedDataRaw as any)?.length,
        proofLen: (proofRaw as any)?.length,
        handleHexLen: encryptedData?.length,
        proofHexLen: proof?.length,
      });
      
      if (!encryptedData || !proof) {
  setStatus("❌ Conversion failed: handle/proof is not a hex string");
        return;
      }

      // Log for visibility
      console.log("📏 Lengths:", {
        handleHexLen: encryptedData.length,
        proofHexLen: proof.length,
      });

      // Önce simülasyon: revert nedenini daha net yakalamak için
      try {
        await publicClient?.simulateContract({
          address: TEST_CONTRACT as `0x${string}`,
          abi: TEST_ABI,
          functionName: "storeValue",
          args: [encryptedData, proof],
          account: address as `0x${string}`,
        });
      } catch (simErr: any) {
        const msg = simErr?.shortMessage || simErr?.message || "simulateContract failed";
  console.error("🧪 Simulation revert:", simErr);
  setStatus(`❌ Simulation reverted: ${msg}`);
        return;
      }

  setStatus("2️⃣ Waiting for wallet confirmation...");
      
      // YENİ API: FHE.fromExternal(externalEuint64, bytes)
      write({
        args: [encryptedData, proof],
      });
      
    } catch (error: any) {
  console.error("❌ ERROR:", error);
      
      if (error.message.includes("Invalid index")) {
  setStatus("❌ FAILED: 'Invalid index' error persists!");
      } else {
  setStatus(`❌ Error: ${error.message}`);
      }
    }
  }
  
  // İşlem akışını görünür kıl: cüzdan onayı / ağ onayı / başarı / hatalar
  useEffect(() => {
    if (isWriting) {
  setStatus((s) => s || "2️⃣ Waiting for wallet confirmation...");
    }
  }, [isWriting]);

  useEffect(() => {
    if (writeResult?.hash && !isConfirming && !isSuccess) {
  setStatus("3️⃣ Waiting for network confirmation...");
    }
  }, [writeResult?.hash, isConfirming, isSuccess]);

  useEffect(() => {
    if (isConfirming) {
  setStatus("3️⃣ Waiting for network confirmation...");
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess) {
  setStatus("🎉 SUCCESS! The new FHE API works!");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (writeError) {
      // @ts-ignore
      const msg = (writeError as any)?.shortMessage || writeError.message;
  setStatus(`❌ Signature rejected or error: ${msg}`);
    }
  }, [writeError]);

  // 90 sn sonra halen onay gelmediyse kullanıcıya bilgilendirme yap
  useEffect(() => {
    if (!writeResult?.hash || isSuccess) return;
    const t = setTimeout(() => {
      setStatus((prev) =>
        prev.includes("network confirmation")
          ? "⏳ Waiting for network confirmation... (Sepolia might be busy; track it via the Etherscan link)"
          : prev
      );
    }, 90000);
    return () => clearTimeout(t);
  }, [writeResult?.hash, isSuccess]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">New FHE API Test</h2>

      <div className="mb-6 p-4 bg-blue-50 rounded">
        <p className="text-sm"><strong>Contract:</strong> {TEST_CONTRACT}</p>
        <p className="text-sm"><strong>API:</strong> @fhevm/solidity@0.7.0</p>
        <p className="text-sm"><strong>Pattern:</strong> FHE.fromExternal(externalEuint64, bytes)</p>
        <p className="text-sm mt-2">
          <strong>FHE Status:</strong> {fheReady ? "✅ Ready" : "⏳ Loading..."}
        </p>
        <p className="text-sm">
          <strong>Wallet:</strong> {address ? `✅ ${address.slice(0, 6)}...${address.slice(-4)}` : "❌ Not connected"}
        </p>
        <p className="text-sm">
          <strong>Network:</strong> {isSepolia ? "✅ Sepolia" : `❌ ${chainId ?? "unknown"}`} (Zama supports Sepolia only)
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Value:</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
          />
        </div>

        <button
          onClick={testStoreValue}
          disabled={!address || !fheReady || !isSepolia || isWriting || isConfirming}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {isWriting ? "Wallet Confirmation..." : isConfirming ? "Network Confirmation..." : "Run Test"}
        </button>

        {status && (
          <div
            className={`p-3 rounded text-sm ${
              status.includes("🎉")
                ? "bg-green-50 text-green-800"
                : status.includes("❌")
                ? "bg-red-50 text-red-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            {status}
          </div>
        )}

        {writeResult?.hash && (
          <div className="text-sm">
            <p>Transaction Hash:</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${writeResult.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {writeResult.hash}
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded text-sm">
        <p className="font-semibold mb-2">🎯 Test Goal:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ If the transaction succeeds → the library update WORKS!</li>
          <li>❌ If the "Invalid index" error persists → another fix is required</li>
        </ul>
      </div>
    </div>
  );
}
