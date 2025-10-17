"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useRef, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, useNetwork, usePublicClient } from "wagmi";
import { confidentialMessageAbi } from "../lib/abi-confidential"; // ✅ NEW: EmelMarket Pattern ABI
import { chronoMessageZamaAbi } from "../lib/abi-zama"; // ✅ v7: Metadata preview
import { appConfig } from "../lib/env";
import { decodeEventLog, isAddress, formatUnits } from "viem";
import { useContractAddress, useHasContract } from "../lib/useContractAddress";
// EMELMARKET PATTERN - Using useFhe hook
import { useFhe } from "./FheProvider";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const DEFAULT_RECEIVER = "" as const;
const EUINT256_BYTE_CAP = 32;
const utf8Encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : undefined;

const truncateToUtf8Bytes = (value: string, byteLimit: number) => {
  if (!value) {
    return { value: "", truncated: false } as const;
  }

  if (!utf8Encoder) {
    const fallback = value.slice(0, byteLimit);
    return { value: fallback, truncated: fallback.length < value.length } as const;
  }

  const encoded = utf8Encoder.encode(value);
  if (encoded.length <= byteLimit) {
    return { value, truncated: false } as const;
  }

  let total = 0;
  let result = "";
  for (const char of Array.from(value)) {
    const chunk = utf8Encoder.encode(char);
    if (total + chunk.length > byteLimit) {
      break;
    }
    result += char;
    total += chunk.length;
  }

  return { value: result, truncated: true } as const;
};

const SHORT_HASH_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SHORT_HASH_LENGTH = 6;

const generateShortHash = () => {
  let result = "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const randomBytes = new Uint8Array(SHORT_HASH_LENGTH);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < SHORT_HASH_LENGTH; i++) {
      const index = randomBytes[i] % SHORT_HASH_ALPHABET.length;
      result += SHORT_HASH_ALPHABET[index];
    }
  } else {
    for (let i = 0; i < SHORT_HASH_LENGTH; i++) {
      const index = Math.floor(Math.random() * SHORT_HASH_ALPHABET.length);
      result += SHORT_HASH_ALPHABET[index];
    }
  }
  return result;
};

const toHex = (input: string | Uint8Array | number[] | undefined): `0x${string}` => {
  if (!input) {
    return "0x" as `0x${string}`;
  }

  if (typeof input === "string") {
    return (input.startsWith("0x") ? input : `0x${input}`) as `0x${string}`;
  }

  const arrayLike = input instanceof Uint8Array ? input : Uint8Array.from(input);
  const hex = Array.from(arrayLike)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return (`0x${hex}`) as `0x${string}`;
};

interface MessageFormProps {
  onSubmitted?: () => void;
}

export function MessageForm({ onSubmitted }: MessageFormProps) {
  const { isConnected, address: userAddress } = useAccount();
  const { chain } = useNetwork();
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const hasContract = useHasContract();
  
  // EMELMARKET PATTERN - Get FHE instance from context
  const fhe = useFhe();
  
  // Zama FHE only - No version switching needed
  const isZamaContract = true; // Her zaman Zama kullan

  const [receiver, setReceiver] = useState<string>(DEFAULT_RECEIVER);
  const [content, setContent] = useState("");
  const [unlockMode, setUnlockMode] = useState<"preset" | "custom">("preset");
  const [presetDuration, setPresetDuration] = useState<number>(300); // 5 dakika varsayılan
  const [unlock, setUnlock] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // 💰 Payment koşulu (isteğe bağlı)
  const [paymentAmount, setPaymentAmount] = useState<string>(""); // Wei cinsinden (internal)
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentInputMode, setPaymentInputMode] = useState<"ETH" | "Wei">("ETH"); // User-friendly input
  const [paymentInputValue, setPaymentInputValue] = useState<string>(""); // Görünen değer
  const [mounted, setMounted] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [userTimezone, setUserTimezone] = useState<string>("UTC");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("Europe/Istanbul");
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  
  // Dosya ekleri için state (IPFS - gelecekte kullanılacak)
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [contentType, setContentType] = useState<0 | 1>(0); // 0=TEXT, 1=IPFS_HASH
  const [metadataHash, setMetadataHash] = useState<string>(""); // Full metadata IPFS hash
  const [metadataShortHash, setMetadataShortHash] = useState<string>(""); // 6-char reference stored on-chain
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentPreviewMime, setAttachmentPreviewMime] = useState<string>("image/webp");
  const [previewIpfsHash, setPreviewIpfsHash] = useState<string>(""); // IPFS hash of preview image
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPersistedHashRef = useRef<string | null>(null);
  const lastSentPreviewRef = useRef<{ payload: string; truncated: boolean; original?: string | null } | null>(null);
  const [plannedUnlockTimestamp, setPlannedUnlockTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000) + 300);
  
  // Zama FHE state
  const [fheInstance, setFheInstance] = useState<any>(null);
  const [encryptedData, setEncryptedData] = useState<{ handles: string[]; inputProof: string; metadataHash?: string; metadataShortHash?: string } | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [fheInitialized, setFheInitialized] = useState(false); // Track if FHE was initialized
  const [chainTimestamp, setChainTimestamp] = useState<number | null>(null);
  const [txUnlockTime, setTxUnlockTime] = useState<number | null>(null);
  const UNLOCK_BUFFER_SECONDS = 0; // No forced buffer - use user's exact time selection

  const computeSafeUnlockTime = (
    chainSeconds: number | null,
    desiredSeconds: number | null,
    options: { includeWallClock?: boolean } = {}
  ) => {
    const { includeWallClock = true } = options;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const sanitizedDesired = typeof desiredSeconds === "number" && Number.isFinite(desiredSeconds)
      ? desiredSeconds
      : nowSeconds;
    // Just return the desired time - no forced buffer
    return sanitizedDesired;
  };
  
  // Form validation state
  const [isFormValid, setIsFormValid] = useState(false);

  // Prevent hydration mismatch & Set default time on client side
  useEffect(() => {
    setMounted(true);
    // Client-side'da local timezone ile default değer ata
    // datetime-local input tarayıcının lokal saatinde değer bekler
    const localTime = new Date();
    // +2 saat ekleme - şu anki saati göster
    
    // YYYY-MM-DDTHH:mm formatında lokal saat (UTC'ye çevirme!)
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hours = String(localTime.getHours()).padStart(2, '0');
    const minutes = String(localTime.getMinutes()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    setUnlock(formatted);
    setPlannedUnlockTimestamp(Math.floor(Date.now() / 1000) + presetDuration);
    // Kullanıcının timezone'unu al
    setUserTimezone(dayjs.tz.guess());
    
    console.log("✅ MessageForm mounted", {
      chainId: chain?.id,
      isConnected,
      contractAddress,
      isZamaContract: true
    });
  }, []);

  // Refresh chain timestamp periodically to guard against client clock drift
  useEffect(() => {
    let cancelled = false;

    if (!publicClient) {
      return;
    }

    const updateTimestamp = async () => {
      try {
        const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
        if (!cancelled) {
          setChainTimestamp(Number(latestBlock.timestamp));
        }
      } catch (err) {
        console.error("⚠️ Chain timestamp fetch failed", err);
      }
    };

    updateTimestamp();
    const intervalId = setInterval(updateTimestamp, 30_000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [publicClient]);

  // Lazy FHE Initialization - using proven fhevmjs SDK
  const initializeFHE = async () => {
    if (fheInitialized) return fheInstance; // Already initialized
    
    console.log("🚀 Lazy FHE Init starting (fhevmjs SDK)...", {
      hasContractAddress: !!contractAddress,
      contractAddress,
      chainId: chain?.id,
      chainName: chain?.name,
    });
    
    if (!contractAddress || !chain?.id) {
      throw new Error("Missing contract or chain");
    }
    
    // Only Sepolia supported
    if (chain.id !== 11155111) {
      throw new Error(`Zama FHE only supports Sepolia (chainId: 11155111), current: ${chain.id}`);
    }
    
    try {
      console.log("🔐 Checking FHE SDK from context (EmelMarket pattern)...");
      
      // EMELMARKET PATTERN - FHE instance comes from context, not manual init
      if (!fhe) {
        console.log("⏳ FHE SDK still loading from FheProvider...");
        throw new Error("FHE SDK not ready yet - button should be disabled!");
      }
      
      setFheInstance(fhe);
      setFheInitialized(true);
      console.log("✅ FHE SDK ready from context!");
      
      return fhe;
    } catch (err) {
      console.error("❌ FHE SDK error:", err);
      throw err;
    }
  };

  // Encrypt content on-demand (when user clicks send) - EMELMARKET PATTERN
  const encryptContent = async (instance: any) => {
    if (!contractAddress || !userAddress) {
      throw new Error("Missing contract or user address");
    }

    console.log("🔐 Starting encryption with:");
    console.log("  Contract Address:", contractAddress);
    console.log("  User Address (msg.sender):", userAddress);
    console.log("  ⚠️ IMPORTANT: inputProof will be valid ONLY for this userAddress!");

  // Şifrelenecek veri: 
  // 1. Eğer dosya varsa: Metadata IPFS'e yükle → short hash şifrele
  // 2. Eğer sadece mesaj varsa: uzun içerikler otomatik olarak metadata'ya taşınır
  let dataToEncrypt = "";
  let uploadedMetadataHash = ""; // Track metadata hash for return
  let resolvedShortHash = metadataShortHash; // Track short hash for return

    const uploadMetadataJson = async (
      payload: Record<string, unknown>,
      shortHash: string,
      options: {
        label?: string;
        fileInfo?: { fileName?: string | null; fileSize?: number | null; mimeType?: string | null };
        debugType?: string;
      } = {}
    ): Promise<string> => {
      const label = options.label ?? "message-meta";
      const payloadType = typeof (payload as any)?.type === "string" ? (payload as any).type : label;

      const metadataJson = JSON.stringify(payload);
      const metadataBlob = new Blob([metadataJson], { type: "application/json" });
      const metadataFile = new File([metadataBlob], `${label}.json`, { type: "application/json" });

      const formData = new FormData();
      formData.append("file", metadataFile);
      formData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `${label}-${shortHash}`,
          keyvalues: {
            shortHash,
            type: "message-metadata",
            category: payloadType
          }
        })
      );

      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

      if (!pinataApiKey || !pinataSecretKey) {
        throw new Error("IPFS credentials not configured");
      }

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Metadata upload failed");
      }

      const data = await response.json();
      const metadataHashValue = data.IpfsHash as string;

      console.log("✅ Metadata uploaded to IPFS:", metadataHashValue);
      console.log("📦 Full metadata payload:", payload);
      console.log("🔗 Metadata URL:", `https://gateway.pinata.cloud/ipfs/${metadataHashValue}`);

      const mappingKey = `file-metadata-${shortHash}`;
      try {
        localStorage.setItem(mappingKey, metadataHashValue);
        console.log(`💾 Saved mapping: ${mappingKey} → ${metadataHashValue}`);
      } catch (err) {
        console.warn("⚠️ Failed to save metadata mapping to localStorage:", err);
      }

      try {
        const response = await fetch("/api/metadata-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shortHash,
            fullHash: metadataHashValue,
            fileName: options.fileInfo?.fileName ?? undefined,
            fileSize: options.fileInfo?.fileSize ?? undefined,
            mimeType: options.fileInfo?.mimeType ?? undefined
          })
        });

        if (!response.ok) {
          console.warn("⚠️ Backend mapping POST failed:", response.status, response.statusText);
        }
      } catch (err) {
        console.warn("⚠️ Failed to call metadata mapping API:", err);
      }

      try {
        const entry = {
          ts: Date.now(),
          type: options.debugType ?? "sent-metadata-upload",
          shortHash,
          metadataHashValue,
          fileName: options.fileInfo?.fileName ?? null
        };
        const existing = JSON.parse(localStorage.getItem("msg-debug-log") || "[]");
        existing.push(entry);
        localStorage.setItem("msg-debug-log", JSON.stringify(existing));
        console.log("🐛 Debug saved (metadata upload):", entry);
      } catch (e) {
        console.warn("Failed to write debug log:", e);
      }

      return metadataHashValue;
    };

    if (ipfsHash && attachedFile) {
      let shortHash = metadataShortHash;
      if (!shortHash) {
        shortHash = generateShortHash();
        setMetadataShortHash(shortHash);
        console.log("🆔 Generated short hash inside encryptContent:", shortHash);
      }
      resolvedShortHash = shortHash;

      const fileData = {
        type: "file",
        ipfs: ipfsHash,
        name: attachedFile.name,
        size: attachedFile.size,
        mimeType: attachedFile.type,
        message: content.trim() || "",
        shortHash
      };

      console.log("📎 Uploading file metadata to IPFS...", fileData);

      const metadataHashValue = await uploadMetadataJson(fileData, shortHash, {
        label: "message-meta",
        fileInfo: {
          fileName: attachedFile.name,
          fileSize: attachedFile.size,
          mimeType: attachedFile.type
        },
        debugType: "sent-metadata-upload"
      });

      setMetadataHash(metadataHashValue);
      uploadedMetadataHash = metadataHashValue;

      dataToEncrypt = `F:${shortHash}`;
      lastSentPreviewRef.current = {
        payload: dataToEncrypt,
        truncated: false,
        original: content.trim() || attachedFile?.name || null
      };

      console.log("🔐 Data to encrypt (file attachment):", dataToEncrypt);
      console.log("📝 Short hash:", shortHash);
      console.log("💾 Full metadata hash saved to state:", metadataHashValue);
    } else {
      const plainText = content.trim();
      if (!plainText) {
        throw new Error("Message content cannot be empty");
      }

      const encoderInstance = utf8Encoder ?? new TextEncoder();
      const plainBytes = encoderInstance.encode(plainText);

      if (plainBytes.length > EUINT256_BYTE_CAP) {
        let shortHash = metadataShortHash;
        if (!shortHash) {
          shortHash = generateShortHash();
          setMetadataShortHash(shortHash);
          console.log("🆔 Generated short hash for long text:", shortHash);
        }
        resolvedShortHash = shortHash;

        const textMetadata = {
          type: "text",
          version: 1,
          shortHash,
          message: plainText,
          length: plainBytes.length,
          preview: plainText.slice(0, 160),
          createdAt: new Date().toISOString()
        };

        console.log("📝 Message exceeds 32-byte limit, offloading to metadata:", {
          utf8Bytes: plainBytes.length,
          shortHash
        });

        const metadataHashValue = await uploadMetadataJson(textMetadata, shortHash, {
          label: "message-text",
          fileInfo: {
            fileName: `${shortHash}.txt`,
            fileSize: plainBytes.length,
            mimeType: "text/plain; charset=utf-8"
          },
          debugType: "sent-text-metadata-upload"
        });

        setMetadataHash(metadataHashValue);
        uploadedMetadataHash = metadataHashValue;

        dataToEncrypt = `F:${shortHash}`;
        lastSentPreviewRef.current = {
          payload: dataToEncrypt,
          truncated: false,
          original: plainText
        };

        console.log("🔐 Data to encrypt (text metadata):", dataToEncrypt);
        console.log("💾 Text metadata hash:", metadataHashValue);
      } else {
        const { value: truncatedContent, truncated: wasTruncated } = truncateToUtf8Bytes(plainText, EUINT256_BYTE_CAP);
        if (wasTruncated) {
          console.warn("⚠️ Message truncated unexpectedly despite length check");
        }
        dataToEncrypt = truncatedContent;
        lastSentPreviewRef.current = {
          payload: truncatedContent,
          truncated: wasTruncated,
          original: plainText
        };
        console.log("📝 Encrypting inline text message (≤32 bytes)");
      }
    }
    
    if (!dataToEncrypt) {
      throw new Error("No content to encrypt");
    }

    console.log("🔐 Starting encryption with FHE SDK (EmelMarket pattern)...");
    console.log("📝 Data to encrypt:", dataToEncrypt);
    
    // Convert content to BigInt (256-bit for euint256)
  const encoder = utf8Encoder ?? new TextEncoder();
  const contentBytes = encoder.encode(dataToEncrypt);
    const paddedBytes = new Uint8Array(EUINT256_BYTE_CAP);
    paddedBytes.set(contentBytes.slice(0, EUINT256_BYTE_CAP));
    
    let value = 0n;
    for (let i = 0; i < EUINT256_BYTE_CAP; i++) {
      value = (value << 8n) | BigInt(paddedBytes[i]);
    }
  console.log("✅ BigInt value ready (256-bit):", value.toString());
    
    console.log("🔐 Encryption parameters (only content encrypted):", {
      contentValue: value.toString(),
      unlockTime: plannedUnlockTimestamp,
      paymentAmount: paymentAmount || '0',
      paymentEnabled
    });
    
    // EMELMARKET PATTERN - Only encrypt content (time+payment are plain text)
    const encryptedValue = await instance
      .createEncryptedInput(contractAddress, userAddress)
      .add256(value)  // Encrypted content only
      .encrypt();
    
    console.log("✅ FHE SDK encryption complete!", {
      handlesLength: encryptedValue.handles?.length,
      handlesType: typeof encryptedValue.handles?.[0],
      contentHandle: encryptedValue.handles?.[0],
      proofType: typeof encryptedValue.inputProof,
      proof: encryptedValue.inputProof,
      fullResult: encryptedValue
    });

    // Convert to hex strings if needed
    const handleHex = toHex(encryptedValue.handles[0] as any);
    const proofHex = toHex(encryptedValue.inputProof as any);

    return {
      handles: [handleHex],
      inputProof: proofHex,
      metadataHash: uploadedMetadataHash, // Return metadata hash if file was uploaded
      metadataShortHash: resolvedShortHash
    };
  };

  // Form validation
  useEffect(() => {
    let valid = false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const customValid = unlockMode === "custom"
      ? (() => {
          try {
            const parsed = dayjs.tz(unlock, selectedTimezone);
            return parsed.isValid() && parsed.unix() > nowSeconds;
          } catch {
            return false;
          }
        })()
      : true;

    // Base validations - NO encryption check (will encrypt on submit)
    valid = isConnected &&
      !!receiver &&
      isAddress(receiver) &&
      receiver.toLowerCase() !== userAddress?.toLowerCase() &&
      (content.trim().length > 0 || ipfsHash.length > 0) && // Mesaj VEYA dosya olmalı
      plannedUnlockTimestamp > nowSeconds &&
      customValid;
    
    setIsFormValid(valid);
  }, [
    isConnected,
    receiver,
    userAddress,
    content,
    ipfsHash,
    plannedUnlockTimestamp,
    unlockMode,
    unlock,
    selectedTimezone
  ]);
  
  const generateAttachmentPreview = useCallback((file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(null);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          const CANVAS_SIZE = 56;
          canvas.width = CANVAS_SIZE;
          canvas.height = CANVAS_SIZE;

          const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
          const drawWidth = Math.max(1, img.width * scale);
          const drawHeight = Math.max(1, img.height * scale);
          const dx = (CANVAS_SIZE - drawWidth) / 2;
          const dy = (CANVAS_SIZE - drawHeight) / 2;

          ctx.fillStyle = "#0f172a"; // midnight background
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

          try {
            const dataUrl = canvas.toDataURL("image/webp", 0.65);
            resolve(dataUrl);
          } catch (err) {
            console.warn("Preview generation failed", err);
            resolve(null);
          }
        };

        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);
  
  useEffect(() => {
    if (unlockMode !== "custom") {
      return;
    }
    if (!unlock) {
      return;
    }

    try {
      const parsed = dayjs.tz(unlock, selectedTimezone);
      if (!parsed.isValid()) {
        return;
      }
      const unix = parsed.unix();
      if (unix !== plannedUnlockTimestamp) {
        setPlannedUnlockTimestamp(unix);
      }
    } catch (err) {
      console.warn("⚠️ Unable to parse custom unlock", err);
    }
  }, [unlockMode, unlock, selectedTimezone, plannedUnlockTimestamp]);
  
  // Dosya yükleme fonksiyonu (IPFS - şu an kullanılmıyor)
  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Dosya boyutu kontrolü (max 25MB - güvenlik için düşürüldü)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setError(`❌ Dosya çok büyük! Maksimum: 25MB (Seçilen: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    
    // GÜVENLİK: Desteklenen dosya tipleri (beyaz liste)
    const allowedTypes = {
      // Resimler
      'image/png': '.png',
      'image/jpeg': '.jpg/.jpeg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      // Dökümanlar
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      // Arşivler (izin verildi)
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      // Video (küçük boyutlar için)
      'video/mp4': '.mp4',
      'video/webm': '.webm'
      // NOT: APK kaldırıldı (güvenlik riski)
    };
    
    // GÜVENLİK: Dosya uzantısı ve MIME type kontrolü
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    const isTypeAllowed = Object.keys(allowedTypes).includes(file.type);
    
    if (!isTypeAllowed) {
      const allowedFormats = Object.values(allowedTypes).join(', ');
      setError(`❌ Desteklenmeyen dosya tipi!\n\n✅ İzin verilen formatlar:\n${allowedFormats}\n\n⚠️ Güvenlik nedeniyle sadece bu formatlar kabul edilir.`);
      return;
    }
    
    // Uzantı doğrulaması (MIME type spoofing önlemi)
    const expectedExt = allowedTypes[file.type as keyof typeof allowedTypes];
    if (expectedExt && !expectedExt.split('/').some(ext => fileExtension === ext)) {
      setError(`⚠️ Dosya uzantısı (${fileExtension}) dosya tipi ile uyuşmuyor! Olası güvenlik riski.`);
      return;
    }
    
    const generatedShortHash = generateShortHash();
    setMetadataShortHash(generatedShortHash);
    console.log("🆔 Generated short hash for attachment:", generatedShortHash);
    setAttachedFile(file);
    setError(null);

    if (file.type.startsWith('image/')) {
      generateAttachmentPreview(file)
        .then(async (preview) => {
          if (preview) {
            setAttachmentPreview(preview);
            setAttachmentPreviewMime("image/webp");
            
            // 📤 Upload preview to IPFS
            await uploadPreviewToIPFS(preview);
          } else {
            setAttachmentPreview(null);
          }
        })
        .catch((err) => {
          console.warn("⚠️ Unable to generate preview", err);
          setAttachmentPreview(null);
        });
    } else {
      setAttachmentPreview(null);
    }
    
    // IPFS'e yükle
    await uploadToIPFS(file);
  };
  
  // 📤 Upload preview image to IPFS
  const uploadPreviewToIPFS = async (base64Data: string) => {
    setIsUploadingPreview(true);
    try {
      // Base64'ü blob'a çevir
      const response = await fetch(base64Data);
      const blob = await response.blob();
      const file = new File([blob], "preview.webp", { type: "image/webp" });
      
      const formData = new FormData();
      formData.append("file", file);
      
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
      
      if (!pinataApiKey || !pinataSecretKey) {
        console.warn("⚠️ IPFS credentials not configured, preview won't be uploaded");
        return;
      }
      
      const uploadResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Preview upload failed: ${uploadResponse.statusText}`);
      }
      
      const data = await uploadResponse.json();
      const hash = data.IpfsHash;
      
      console.log("✅ Preview uploaded to IPFS:", hash);
      setPreviewIpfsHash(hash);
    } catch (err) {
      console.warn("⚠️ Preview upload failed:", err);
    } finally {
      setIsUploadingPreview(false);
    }
  };
  
  const uploadToIPFS = async (file: File) => {
    setUploadingFile(true);
    setError(null);
    
    try {
      // Pinata ücretsiz IPFS servisi
      const formData = new FormData();
      formData.append("file", file);
      
      // Demo için public Pinata gateway kullan (production'da kendi API key'inizi ekleyin)
      // NOT: Bu demo amaçlıdır, production için .env.local dosyasına ekleyin:
      // NEXT_PUBLIC_PINATA_API_KEY=your_key
      // NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret
      
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
      
      if (!pinataApiKey || !pinataSecretKey) {
        throw new Error("⚠️ IPFS credentials not configured. Please add NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY to .env.local");
      }
      
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      const hash = data.IpfsHash;
      
      console.log("✅ Uploaded to IPFS:", hash);
      setIpfsHash(hash);
      setContentType(1); // IPFS_HASH
      
      // NOT: Mesajı silme! IPFS hash'i ayrı state'te sakla
      // Kullanıcı hem mesaj hem dosya gönderebilsin
      
    } catch (err) {
      console.error("❌ IPFS upload error:", err);
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(`IPFS Upload Error: ${errorMsg}`);
      setAttachedFile(null);
      setMetadataShortHash("");
      setIpfsHash("");
      setAttachmentPreview(null);
      setAttachmentPreviewMime("image/webp");
    } finally {
      setUploadingFile(false);
    }
  };
  
  const removeAttachment = () => {
    setAttachedFile(null);
    setMetadataShortHash("");
    setIpfsHash("");
    setContentType(0); // TEXT
    setContent(""); // İçeriği temizle
    setAttachmentPreview(null);
    setAttachmentPreviewMime("image/webp");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Prepare contract write with proper parameters
  const basePrepareReady = isFormValid && !!contractAddress;
  const preparedUnlockTime = useMemo(() => {
    if (txUnlockTime == null) {
      return null;
    }
    return computeSafeUnlockTime(chainTimestamp, txUnlockTime, { includeWallClock: false });
  }, [chainTimestamp, txUnlockTime]);

  const shouldPrepare = basePrepareReady && !!encryptedData && !isEncrypting && preparedUnlockTime !== null;
  
  // Calculate mask: 0x01=time, 0x02=payment, 0x03=both
  const conditionMask = useMemo(() => {
    let mask = 0;
    if (preparedUnlockTime && preparedUnlockTime > 0) mask |= 0x01; // Time condition
    if (paymentEnabled && paymentAmount && BigInt(paymentAmount) > 0n) mask |= 0x02; // Payment condition
    return mask > 0 ? mask : 0x01; // Default to time-only if nothing selected
  }, [preparedUnlockTime, paymentEnabled, paymentAmount]);
  
  // Zama Contract Write - FHE encrypted with payment support
  const { config: configZama, error: prepareError } = usePrepareContractWrite({
    address: contractAddress as `0x${string}`,
    abi: chronoMessageZamaAbi, // ✅ v7: Metadata preview ABI
    functionName: "sendMessage",
    args: encryptedData && isZamaContract && preparedUnlockTime !== null
      ? [
          receiver as `0x${string}`,
          encryptedData.handles[0] as `0x${string}`, // externalEuint256 (content handle)
          encryptedData.inputProof as `0x${string}`, // bytes inputProof
          BigInt(preparedUnlockTime), // unlockTime (plain text)
          BigInt(paymentAmount || '0'), // requiredPayment (plain text, wei)
          conditionMask, // uint8 mask (0x01=time, 0x02=payment, 0x03=both)
          // 📋 METADATA: File preview information (visible even when locked)
          attachedFile?.name || "", // fileName
          BigInt(attachedFile?.size || 0), // fileSize
          attachedFile?.type || "", // contentType (MIME)
          previewIpfsHash || "" // previewImageHash (IPFS hash for preview image)
        ]
      : undefined,
    enabled: shouldPrepare && isZamaContract,
    onSuccess: (config: any) => {
      console.log("✅ usePrepareContractWrite SUCCESS - config ready:", config);
    },
    onError: (error: any) => {
      console.error("❌ usePrepareContractWrite ERROR:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error cause:", error.cause);
      try {
        const payload = JSON.stringify(error, (_key, value) => typeof value === "bigint" ? value.toString() : value, 2);
        console.error("❌ Error details:", payload);
      } catch (jsonErr) {
        console.error("❌ Error details stringify failed:", jsonErr);
      }
    }
  });

  // Log prepareError if it exists
  useEffect(() => {
    if (prepareError) {
      console.error("❌❌❌ PREPARE ERROR DETECTED:", prepareError);
      console.error("Error shortMessage:", (prepareError as any).shortMessage);
      console.error("Error details:", (prepareError as any).details);
      console.error("Error metaMessages:", (prepareError as any).metaMessages);
      const shortMessage = (prepareError as any).shortMessage || prepareError.message;
      setError(
        shortMessage
          ? `⛔ On-chain simülasyon başarısız: ${shortMessage}`
          : "⛔ On-chain simülasyon başarısız oldu. Lütfen birkaç saniye sonra tekrar deneyin."
      );
    }
  }, [prepareError]);
  
  // Zama write hook
  const zamaWrite = useContractWrite(configZama);
  const { data, isLoading: isPending, write, error: writeError } = zamaWrite;
  
  // Debug logs
  useEffect(() => {
    console.log("🔍 Contract Write State:", {
      hasConfig: !!configZama,
      hasWrite: !!write,
      isPending,
      prepareError: prepareError?.message,
      writeError: writeError?.message,
      encryptedData: !!encryptedData
    });
  }, [configZama, write, isPending, prepareError, writeError, encryptedData]);
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({ 
    hash: data?.hash 
  });

  // UTC ve local time gösterimi
  const unlockTimeDisplay = useMemo(() => {
    if (!mounted) return { local: "", utc: "", relative: "", selected: "" };
    
    try {
      const activeUnlock = txUnlockTime ?? plannedUnlockTimestamp;
      const timestamp = activeUnlock * 1000;
      const localTime = dayjs(timestamp).format("DD MMM YYYY, HH:mm");
      const utcTime = dayjs(timestamp).utc().format("DD MMM YYYY, HH:mm");
      const selectedTime = dayjs(timestamp).tz(selectedTimezone).format("DD MMM YYYY, HH:mm");
      const relative = dayjs(timestamp).fromNow();
      
      return { local: localTime, utc: utcTime, selected: selectedTime, relative };
    } catch (err) {
      console.error("Tarih display hatası:", err);
      return { local: "---", utc: "---", selected: "---", relative: "---" };
    }
  }, [plannedUnlockTimestamp, mounted, selectedTimezone, txUnlockTime]);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    const txHash = data?.hash ?? null;
    if (txHash && lastPersistedHashRef.current === txHash) {
      return;
    }
    if (txHash) {
      lastPersistedHashRef.current = txHash;
    }

    let cancelled = false;

    const persistAndReset = async () => {
      console.log("✅ MessageForm: Message sent successfully");

      const hashToSave = encryptedData?.metadataHash || metadataHash;
      const shortHashToSave = encryptedData?.metadataShortHash || metadataShortHash || (hashToSave ? hashToSave.substring(0, 6) : "");
      if (hashToSave && shortHashToSave) {
        const mappingKey = `file-metadata-${shortHashToSave}`;
        localStorage.setItem(mappingKey, hashToSave);
        console.log(`💾 Saved metadata mapping: ${shortHashToSave} → ${hashToSave}`);
      }

      const latestAttachment = attachedFile;
      const latestShortHash = encryptedData?.metadataShortHash || metadataShortHash;

      let resolvedMessageId: string | undefined;
      if (publicClient && txHash) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          for (const log of receipt.logs) {
            if (contractAddress && log.address?.toLowerCase() !== contractAddress.toLowerCase()) {
              continue;
            }
            try {
              const decoded = decodeEventLog({
                abi: confidentialMessageAbi,
                data: log.data,
                topics: log.topics
              });
              if (decoded.eventName === "MessageSent") {
                const rawId = decoded.args?.messageId as bigint | string | undefined;
                if (rawId !== undefined && rawId !== null) {
                  resolvedMessageId = typeof rawId === "bigint" ? rawId.toString() : String(rawId);
                  break;
                }
              }
            } catch (err) {
              // Ignore logs that do not match the event shape we expect
            }
          }

          if (resolvedMessageId && attachmentPreview) {
            const previewPayload = {
              messageId: resolvedMessageId,
              previewDataUrl: attachmentPreview,
              mimeType: attachmentPreviewMime,
              shortHash: latestShortHash ?? null,
              fileName: latestAttachment?.name ?? null
            };

            const response = await fetch("/api/message-preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(previewPayload)
            });
            if (!response.ok) {
              console.warn("⚠️ Preview store responded with", response.status, response.statusText);
            } else {
              console.log("🖼️ Stored preview for message", resolvedMessageId);
            }
          }
        } catch (err) {
          console.warn("⚠️ Failed to load transaction receipt for preview", err);
        }
      }

      try {
        const previewPayload = lastSentPreviewRef.current;
        if (previewPayload && resolvedMessageId) {
          const storagePrefix = contractAddress ? `${contractAddress.slice(0, 10)}-msg` : 'msg';
          const storageKey = `${storagePrefix}-sent-preview-${resolvedMessageId}`;
          const payloadToStore = {
            payload: previewPayload.payload,
            truncated: previewPayload.truncated,
            original: previewPayload.original,
            fileMetadata: latestAttachment
              ? {
                  fileName: latestAttachment.name,
                  fileSize: latestAttachment.size,
                  mimeType: latestAttachment.type
                }
              : null
          };
          localStorage.setItem(storageKey, JSON.stringify(payloadToStore));
        }
      } catch (err) {
        console.warn('⚠️ Failed to write sent preview cache', err);
      }
      lastSentPreviewRef.current = null;

      if (cancelled) {
        return;
      }

      setReceiver(DEFAULT_RECEIVER);
      setContent("");
      setAttachedFile(null);
      setAttachmentPreview(null);
      setAttachmentPreviewMime("image/webp");
      setIpfsHash("");
      setMetadataHash("");
      setMetadataShortHash("");
      setContentType(0);
  setPresetDuration(300);
  setUnlockMode("preset");
  setIsPresetsOpen(false);
  const resetLocal = new Date();
  const resetYear = resetLocal.getFullYear();
  const resetMonth = String(resetLocal.getMonth() + 1).padStart(2, '0');
  const resetDay = String(resetLocal.getDate()).padStart(2, '0');
  const resetHours = String(resetLocal.getHours()).padStart(2, '0');
  const resetMinutes = String(resetLocal.getMinutes()).padStart(2, '0');
  const resetFormatted = `${resetYear}-${resetMonth}-${resetDay}T${resetHours}:${resetMinutes}`;
  setUnlock(resetFormatted);
  const defaultPlanned = Math.floor(Date.now() / 1000) + 300;
  setPlannedUnlockTimestamp(defaultPlanned);
      setEncryptedData(null);
      setTxUnlockTime(null);
      setError(null);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 5000);
      setTimeout(() => {
        onSubmitted?.();
      }, 100);
    };

    void persistAndReset();

    return () => {
      cancelled = true;
    };
  }, [
    isSuccess,
    encryptedData,
    metadataHash,
    metadataShortHash,
    attachmentPreview,
    attachmentPreviewMime,
    publicClient,
    data?.hash,
    contractAddress,
    attachedFile,
    onSubmitted
  ]);

  // Auto-send transaction after encryption completes AND write is ready
  useEffect(() => {
    console.log("🔍 Auto-send check:", {
      hasEncryptedData: !!encryptedData,
      isEncrypting,
      hasWrite: !!write,
    });
    
    // If encryption just completed and write is ready, auto-send
    if (encryptedData && !isEncrypting && write) {
      console.log("📤 Auto-sending transaction now that write() is ready...");
      setTimeout(() => {
        try {
          write();
        } catch (err) {
          console.error("❌ Transaction error:", err);
          setError(`Transaction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }, 100); // Small delay to ensure config is fully ready
    }
    
  }, [encryptedData, isEncrypting, write]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isConnected) {
      setError("Önce cüzdanınızı bağlayın.");
      return;
    }
    if (!receiver || !isAddress(receiver)) {
      setError("Geçerli bir alıcı adresi girin.");
      return;
    }
    if (receiver.toLowerCase() === userAddress?.toLowerCase()) {
      setError("❌ Kendine mesaj gönderemezsiniz! Lütfen farklı bir alıcı adresi girin.");
      return;
    }
    if (content.trim().length === 0) {
      setError("Mesaj içeriği boş olamaz.");
      return;
    }
    
    const nowSeconds = Math.floor(Date.now() / 1000);
    let desiredUnlock = plannedUnlockTimestamp;

    if (unlockMode === "preset") {
      desiredUnlock = nowSeconds + presetDuration;
      setPlannedUnlockTimestamp(desiredUnlock);
    } else {
      try {
        const parsed = dayjs.tz(unlock, selectedTimezone);
        if (!parsed.isValid()) {
          setError("Please select a valid date.");
          return;
        }
        desiredUnlock = parsed.unix();
        setPlannedUnlockTimestamp(desiredUnlock);
      } catch (err) {
        console.warn("Invalid custom date", err);
        setError("Please select a valid date.");
        return;
      }
    }

    if (desiredUnlock <= nowSeconds) {
      setError("Unlock time must be in the future.");
      return;
    }

    setError(null);
    
    // If already encrypted, do nothing (auto-send will handle it)
    if (encryptedData && !isEncrypting) {
      console.log("📤 Already encrypted, waiting for auto-send...");
      setError("⏳ Preparing transaction...");
      return;
    }
    
    // Encrypt content
    setIsEncrypting(true);
    
    try {
      console.log("📤 Starting Zama FHE encryption...");

      let latestChainTimestamp = chainTimestamp;
      if (publicClient) {
        try {
          const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
          latestChainTimestamp = Number(latestBlock.timestamp);
          setChainTimestamp(latestChainTimestamp);
        } catch (blockErr) {
          console.warn("⚠️ Unable to refresh chain timestamp before send", blockErr);
        }
      }

      const safeUnlockForTx = computeSafeUnlockTime(latestChainTimestamp ?? chainTimestamp, desiredUnlock);
      setTxUnlockTime(safeUnlockForTx);

      console.log("⏱️ Unlock time prepared", {
        userSelected: desiredUnlock,
        chainBase: latestChainTimestamp ?? chainTimestamp,
        enforcedUnlock: safeUnlockForTx,
        bufferSeconds: UNLOCK_BUFFER_SECONDS
      });
      
      // Initialize FHE if not already initialized
      let instance = fheInstance;
      if (!instance) {
        console.log("🔧 FHE not initialized, initializing now...");
        const initialized = await initializeFHE();
        if (!initialized) {
          throw new Error("Failed to initialize FHE");
        }
        instance = initialized;
      }
      
      // Encrypt content
      console.log("🔐 Encrypting content...");
      const encrypted = await encryptContent(instance as any);
      setEncryptedData(encrypted);
      // Debug: save encrypted payload entry
      try {
        const entry = {
          ts: Date.now(),
          type: 'sent-encrypted-complete',
          handles: encrypted.handles,
          proof: encrypted.inputProof,
          metadataHash: encrypted.metadataHash,
          metadataShortHash: encrypted.metadataShortHash
        };
        const existing = JSON.parse(localStorage.getItem('msg-debug-log') || '[]');
        existing.push(entry);
        localStorage.setItem('msg-debug-log', JSON.stringify(existing));
        console.log('🐛 Debug saved (sent-encrypted-complete):', entry);
      } catch (e) {
        console.warn('Failed to write debug log (sent-encrypted-complete):', e);
      }
      
      // Eğer dosya varsa metadata hash'i de kaydet
      if (encrypted.metadataHash) {
        setMetadataHash(encrypted.metadataHash);
        console.log("💾 Metadata hash set to state:", encrypted.metadataHash);
      }
      if (encrypted.metadataShortHash) {
        setMetadataShortHash(encrypted.metadataShortHash);
        console.log("🔖 Short hash set to state:", encrypted.metadataShortHash);
      }
      
      setIsEncrypting(false);
      
      console.log("✅ Encryption complete! Waiting for transaction to auto-send...");
      setError(null); // Clear error - success status will show in separate indicator
      
  } catch (err) {
      console.error("❌ Error:", err);
      setError(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsEncrypting(false);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-4 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue">
        <p className="text-sm text-text-light/60">Loading...</p>
      </div>
    );
  }

  // Connect your wallet
  if (!isConnected) {
    return (
      <div className="space-y-4 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue">
        <p className="text-sm text-text-light/60">Connect your wallet...</p>
      </div>
    );
  }

  // Show warning if no contract
  if (!hasContract || !contractAddress) {
    return (
      <div className="space-y-4 rounded-xl border border-orange-700/50 bg-orange-900/20 p-6 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-orange-300">No Contract on This Network</h3>
            <p className="mt-2 text-sm text-orange-200/80">
              SealedMessage is not deployed on this network yet. Please select one of the supported networks:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-orange-200/80">
              <li>✅ Sepolia Testnet</li>
              <li>✅ Base Sepolia</li>
              <li>✅ Monad Testnet</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="rounded-lg border border-green-500/50 bg-green-900/80 px-4 py-3 shadow-lg">
            <p className="text-green-100 flex items-center gap-2">
              <span>✅</span> Message sent successfully!
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-cyber-blue/30 bg-midnight/80 p-6 shadow-glow-blue"
      >
      {contractAddress && (
        <div className="rounded-lg border border-cyber-blue/40 bg-cyber-blue/10 px-4 py-2 text-xs text-cyber-blue">
          <p>
            Active contract: <span className="font-semibold">Zama FHE 🔐</span>
            {" "}
            (<span className="font-mono">{`${contractAddress.slice(0, 6)}…${contractAddress.slice(-4)}`}</span>)
          </p>
        </div>
      )}
      <div className="hidden rounded-lg border border-amber-400/50 bg-amber-900/20 px-4 py-2 text-xs text-amber-200">
        <p className="font-semibold">Heads-up: Zama relayer fees</p>
        <p className="mt-1 leading-relaxed">
          Proof validation, decrypt, and bridge operations require <span className="font-mono">$ZAMA</span> credits. Decide whether the app, the relayer, or end users cover these costs before going live.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="receiver" className="text-sm font-semibold uppercase tracking-wide text-cyber-blue">
          Receiver Address
        </label>
        <input
          id="receiver"
          type="text"
          value={receiver}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setReceiver(event.target.value)}
          placeholder="0x..."
          className={`rounded-lg border px-4 py-3 font-mono text-sm text-text-light outline-none transition focus:ring-2 ${
            receiver && receiver.toLowerCase() === userAddress?.toLowerCase()
              ? 'border-red-500 bg-red-950/30 focus:border-red-500 focus:ring-red-500/60'
              : 'border-cyber-blue/40 bg-midnight/60 focus:border-cyber-blue focus:ring-cyber-blue/60'
          }`}
        />
        {receiver && receiver.toLowerCase() === userAddress?.toLowerCase() ? (
          <p className="text-xs text-red-400">
            ⚠️ Bu sizin adresiniz! Kendine mesaj gönderemezsiniz.
          </p>
        ) : (
          <p className="text-xs text-text-light/60">
            🔒 Only this address can read the message (not even the sender!)
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className="text-sm font-semibold uppercase tracking-wide text-cyber-blue">
          Message
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)}
          placeholder="Write and Seal"
          disabled={!!attachedFile} // Dosya ekliyse mesaj yazılamaz
          className="min-h-[120px] rounded-lg border border-cyber-blue/40 bg-midnight/60 px-4 py-3 text-text-light outline-none transition focus:border-cyber-blue focus:ring-2 focus:ring-cyber-blue/60 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {/* Dosya Ekleme Butonu */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,text/plain,application/zip,application/x-rar-compressed,application/x-7z-compressed,video/mp4,video/webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {!attachedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-900/20 px-4 py-2 text-sm font-medium text-purple-300 transition hover:bg-purple-900/30 hover:border-purple-500/60 disabled:opacity-50"
            >
              <span>📎</span>
              {uploadingFile ? "Yükleniyor..." : "Dosya Ekle"}
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-between rounded-lg border border-green-500/40 bg-green-900/20 px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-green-300">
                <span>
                  {attachedFile.type.startsWith('image/') ? '🖼️' : 
                   attachedFile.type === 'application/pdf' ? '📄' :
                   attachedFile.type.startsWith('video/') ? '🎬' :
                   attachedFile.type === 'application/vnd.android.package-archive' ? '📱' : '📎'}
                </span>
                <span className="font-medium">{attachedFile.name}</span>
                <span className="text-xs text-green-400/60">
                  ({(attachedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                {ipfsHash && (
                  <span className="text-xs text-green-400 font-mono">
                    ✅ IPFS: {ipfsHash.slice(0, 8)}...
                  </span>
                )}
              </div>
              {attachmentPreview && (
                <img
                  src={attachmentPreview}
                  alt="Attachment preview"
                  className="ml-3 h-12 w-12 rounded border border-purple-500/40 object-cover"
                />
              )}
              <button
                type="button"
                onClick={removeAttachment}
                className="text-red-400 hover:text-red-300 transition"
              >
                ❌
              </button>
            </div>
          )}
        </div>
        
        <p className="text-xs text-text-light/60">
          {attachedFile 
            ? "📎 Ekli dosya mesajınızla birlikte IPFS'e yüklendi ve blockchain'e kaydedilecek"
            : "💡 İsteğe bağlı: Resim, PDF, Video veya APK dosyası ekleyebilirsiniz (max 50MB)"
          }
        </p>
      </div>
      
      {/* Condition Type Selection - Tab Buttons */}
      <div className="flex flex-col">
        <label className="text-sm font-semibold uppercase tracking-wide text-text-light/80 mb-3">
          Unlock Time
        </label>
        
        {/* Unlock Time Form */}
        <div className="rounded-lg border-2 border-neon-green bg-neon-green/10 p-4">
          <div className="flex flex-col gap-3">
            {/* Mode Selection */}
            <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setUnlockMode("preset");
              setIsPresetsOpen(!isPresetsOpen);
              setPlannedUnlockTimestamp(Math.floor(Date.now() / 1000) + presetDuration);
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              unlockMode === "preset"
                ? "bg-aurora/20 border-2 border-aurora text-aurora"
                : "bg-midnight/40 border border-cyber-blue/30 text-text-light/60 hover:text-text-light"
            }`}
          >
            ⚡ Quick Select {unlockMode === "preset" && (isPresetsOpen ? "▼" : "▶")}
          </button>
          <button
            type="button"
            onClick={() => {
              setUnlockMode("custom");
              setIsPresetsOpen(false); // Custom'a geçince preset'leri kapat
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              unlockMode === "custom"
                ? "bg-aurora/20 border-2 border-aurora text-aurora"
                : "bg-midnight/40 border border-cyber-blue/30 text-text-light/60 hover:text-text-light"
            }`}
          >
            📅 Custom Date
          </button>
        </div>

        {/* Preset Durations */}
        {unlockMode === "preset" && isPresetsOpen && (
          <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top duration-200">
            {[
              { label: "⚡ Now (10s)", value: 10 },
              { label: "30 seconds", value: 30 },
              { label: "1 minute", value: 60 },
              { label: "5 minutes", value: 300 },
              { label: "15 minutes", value: 900 },
              { label: "1 hour", value: 3600 },
              { label: "2 hours", value: 7200 },
              { label: "6 hours", value: 21600 },
              { label: "1 day", value: 86400 },
              { label: "3 days", value: 259200 },
              { label: "1 week", value: 604800 },
              { label: "1 month", value: 2592000 }
            ].map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPresetDuration(value);
                  setPlannedUnlockTimestamp(Math.floor(Date.now() / 1000) + value);
                  setIsPresetsOpen(false); // Dropdown'ı kapat
                }}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  presetDuration === value
                    ? "bg-neon-orange/20 border-2 border-neon-orange text-neon-orange shadow-glow-orange"
                    : "bg-midnight/40 border border-cyber-blue/30 text-text-light hover:border-cyber-blue/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Custom Date Picker */}
        {unlockMode === "custom" && (
          <div className="space-y-3">
            <input
              id="unlock"
              type="datetime-local"
              value={unlock}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setUnlock(event.target.value)}
              className="w-full rounded-lg border border-cyber-blue/40 bg-midnight/60 px-4 py-3 text-text-light outline-none transition focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/60"
            />
            
            {/* Timezone Seçici */}
            <div className="flex flex-col gap-2">
              <label htmlFor="timezone" className="text-xs font-medium text-text-light/60">
                🌐 Saat Dilimi (Timezone)
              </label>
              <select
                id="timezone"
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/60"
              >
                <optgroup label="🇹🇷 Türkiye">
                  <option value="Europe/Istanbul">İstanbul (UTC+3)</option>
                </optgroup>
                <optgroup label="🇪🇺 Avrupa">
                  <option value="Europe/London">London (UTC+0)</option>
                  <option value="Europe/Paris">Paris (UTC+1)</option>
                  <option value="Europe/Berlin">Berlin (UTC+1)</option>
                  <option value="Europe/Moscow">Moscow (UTC+3)</option>
                </optgroup>
                <optgroup label="🇺🇸 Amerika">
                  <option value="America/New_York">New York (UTC-5)</option>
                  <option value="America/Chicago">Chicago (UTC-6)</option>
                  <option value="America/Denver">Denver (UTC-7)</option>
                  <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
                </optgroup>
                <optgroup label="🌏 Asya">
                  <option value="Asia/Dubai">Dubai (UTC+4)</option>
                  <option value="Asia/Kolkata">Kolkata (UTC+5:30)</option>
                  <option value="Asia/Singapore">Singapore (UTC+8)</option>
                  <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                  <option value="Asia/Shanghai">Shanghai (UTC+8)</option>
                </optgroup>
                <optgroup label="🌍 Other">
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="Australia/Sydney">Sydney (UTC+10)</option>
                </optgroup>
              </select>
              <p className="text-xs text-text-light/50 italic">
                💡 The date/time you enter will be interpreted in this timezone
              </p>
            </div>
          </div>
        )}

        {/* Time Display */}
        {mounted && (
          <div className="rounded-lg bg-midnight/40 border border-cyber-blue/30 p-3 space-y-2 text-xs">
            {unlockMode === "custom" && (
              <div className="flex items-center justify-between">
                <span className="text-text-light/60">🕒 Selected Timezone:</span>
                <span className="text-sunset font-mono font-semibold">{unlockTimeDisplay.selected}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-text-light/60">🌍 Your Time:</span>
              <span className="text-slate-200 font-mono">{unlockTimeDisplay.local}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-light/60">🌐 Universal Time (UTC):</span>
              <span className="text-slate-200 font-mono">{unlockTimeDisplay.utc}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-light/60">⏱️ Time Remaining:</span>
              <span className="text-green-400 font-semibold">{unlockTimeDisplay.relative}</span>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <p className="text-text-light/50 italic">
                ℹ️ Blockchain uses UTC time. The message will unlock at this UTC time regardless of the recipient's location.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
      </div>
      
      {/* 💰 Payment Condition (Optional) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="paymentEnabled"
            checked={paymentEnabled}
            onChange={(e) => setPaymentEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-cyber-blue/40 bg-midnight/60 text-purple-500 focus:ring-2 focus:ring-purple-500/60"
          />
          <label htmlFor="paymentEnabled" className="text-sm font-semibold uppercase tracking-wide text-purple-400">
            💰 Require Payment to Unlock (Optional)
          </label>
        </div>
        
        {paymentEnabled && (
          <div className="rounded-lg border-2 border-purple-500/40 bg-purple-900/10 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="paymentAmount" className="text-xs font-medium text-purple-300">
                  💵 Required Payment Amount
                </label>
                {/* ETH/Wei Toggle */}
                <div className="flex gap-1 rounded-lg bg-midnight/60 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentInputMode("ETH");
                      // Convert current Wei to ETH
                      if (paymentAmount) {
                        const ethValue = formatUnits(BigInt(paymentAmount), 18);
                        setPaymentInputValue(ethValue);
                      }
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded transition ${
                      paymentInputMode === "ETH"
                        ? "bg-purple-500 text-white"
                        : "text-purple-300 hover:text-purple-200"
                    }`}
                  >
                    ETH
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentInputMode("Wei");
                      // Show current Wei value
                      setPaymentInputValue(paymentAmount || "0");
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded transition ${
                      paymentInputMode === "Wei"
                        ? "bg-purple-500 text-white"
                        : "text-purple-300 hover:text-purple-200"
                    }`}
                  >
                    Wei
                  </button>
                </div>
              </div>
              
              <input
                id="paymentAmount"
                type="text"
                value={paymentInputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  
                  if (paymentInputMode === "ETH") {
                    // Allow decimal numbers for ETH
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setPaymentInputValue(value);
                      
                      // Convert to Wei
                      if (value && value !== '.') {
                        try {
                          const weiValue = Math.floor(parseFloat(value) * 1e18).toString();
                          setPaymentAmount(weiValue);
                        } catch {
                          setPaymentAmount('0');
                        }
                      } else {
                        setPaymentAmount('0');
                      }
                    }
                  } else {
                    // Wei mode: only integers
                    if (value === '' || /^\d+$/.test(value)) {
                      setPaymentInputValue(value);
                      setPaymentAmount(value || '0');
                    }
                  }
                }}
                placeholder={paymentInputMode === "ETH" ? "0.001" : "1000000000000000"}
                className="rounded-lg border border-purple-500/40 bg-midnight/60 px-4 py-3 font-mono text-sm text-text-light outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/60"
              />
              
              {/* Helper Text */}
              <p className="text-xs text-purple-300/60">
                {paymentInputMode === "ETH" 
                  ? "💡 Örnek: 0.001 ETH (küsurat kabul edilir)"
                  : "💡 Örnek: 1000000000000000 Wei (1 ETH = 10¹⁸ Wei)"
                }
              </p>
              
              {/* Preview Box */}
              {paymentAmount && paymentAmount !== '0' && (
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300/80">ETH:</span>
                    <span className="font-mono text-purple-200">
                      {formatUnits(BigInt(paymentAmount), 18)} ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300/80">Wei:</span>
                    <span className="font-mono text-purple-200 text-[10px]">
                      {paymentAmount}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-purple-300/80 italic">
              🔒 Alıcı, mesajı okuyabilmek için bu miktarı ödeyecek. Ödeme otomatik olarak size (gönderici) aktarılır.
            </p>
          </div>
        )}
        
        {!paymentEnabled && (
          <p className="text-xs text-text-light/60">
            💡 İsteğe bağlı: Mesajın okunması için ödeme koşulu ekleyebilirsiniz
          </p>
        )}
      </div>
      
      {/* Zama FHE encryption status */}
      {isEncrypting && (
        <div className="rounded-lg bg-neon-green/10 border border-neon-green/40 p-3 text-sm text-neon-green flex items-center gap-2">
          <span className="animate-spin">⟳</span>
          <span>🔐 Encrypting message with Zama FHE...</span>
        </div>
      )}
      {encryptedData && !isEncrypting && !write && (
        <div className="rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-400/40 p-3 text-sm flex items-center gap-2">
          <span className="text-green-300">✅ Message encrypted!</span>
          <span className="text-blue-300 animate-pulse">Preparing transaction...</span>
        </div>
      )}
      {encryptedData && !isEncrypting && write && (
        <div className="rounded-lg bg-green-500/10 border border-green-400/40 p-3 text-sm text-green-300">
          ✅ Message encrypted successfully with Zama FHE
        </div>
      )}
      
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      
      {/* FHE SDK Loading Indicator */}
      {!fhe && (
        <div className="text-sm text-yellow-400 mb-2">
          ⏳ Loading FHE encryption system...
        </div>
      )}
      
      <button
        type="submit"
        disabled={!fhe || isPending || isConfirming || isEncrypting || (!!encryptedData && !write)}
        className="w-full rounded-lg bg-gradient-to-r from-aurora via-sky-500 to-sunset px-4 py-3 text-center text-sm font-semibold uppercase tracking-widest text-slate-900 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!fhe
          ? "⏳ Initializing FHE..."
          : isEncrypting 
          ? "🔐 Encrypting..." 
          : isPending || isConfirming 
            ? "📤 Sending transaction..." 
            : encryptedData && !write
              ? "⏳ Preparing transaction..."
              : "🔐 Send Message"}
      </button>
      {data?.hash ? (
        <p className="text-xs text-text-light/60">
          İşlem hash&apos;i: {data.hash.slice(0, 10)}...{data.hash.slice(-6)}
        </p>
      ) : null}
    </form>
    </>
  );
}
