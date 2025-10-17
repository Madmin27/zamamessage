"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useContractWrite, useWaitForTransaction, usePublicClient, useAccount, usePrepareContractWrite, useWalletClient } from "wagmi";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { chronoMessageZamaAbi } from "../lib/abi-zama";
import { appConfig } from "../lib/env";
import { useContractAddress } from "../lib/useContractAddress";
import { useNetwork } from "wagmi";
import { IPFSFileDisplay } from "./IPFSFileDisplay";
import { useFhe, useFheStatus } from "./FheProvider";
import { formatUnits } from "viem";

dayjs.extend(duration);

interface MessageCardProps {
  id: bigint;
  sender: string;
  receiver: string;
  unlockTime: bigint;
  unlockDate: string;
  unlocked: boolean;
  isRead: boolean;
  isSent: boolean;
  index: number;
  contractAddress?: string; // ✅ Mesajın hangi contract'tan geldiği (override için)
  onMessageRead?: () => void;
  onHide?: () => void; // Hide message callback
  // V3 ödeme bilgileri
  requiredPayment?: bigint;
  paidAmount?: bigint;
  conditionType?: number;
  // Transaction hash'leri
  transactionHash?: string;
  paymentTxHash?: string;
  // Dosya desteği
  contentType?: number; // 0=TEXT, 1=IPFS_HASH, 2=ENCRYPTED
  fileMetadata?: {
    name: string;
    size: number;
    type: string;
  };
}

interface SentPreviewCache {
  payload?: string;
  truncated?: boolean;
  original?: string | null;
  fileMetadata?: {
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
  } | null;
}

const globalTextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : undefined;

const stripHexPrefix = (value: string) => (value.startsWith("0x") ? value.slice(2) : value);

const hexToBytes = (hexValue: string): Uint8Array => {
  const sanitized = stripHexPrefix(hexValue).toLowerCase();
  if (sanitized.length === 0) {
    return new Uint8Array();
  }
  const length = Math.ceil(sanitized.length / 2);
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index++) {
    const sliceStart = sanitized.length - (index + 1) * 2;
    const byteHex = sanitized.slice(Math.max(0, sliceStart), sliceStart + 2);
    const parsed = parseInt(byteHex.padStart(2, "0"), 16);
    if (Number.isNaN(parsed)) {
      throw new Error("Ciphertext contains non-hex characters");
    }
    bytes[length - index - 1] = parsed;
  }
  return bytes;
};

const decodeAscii = (bytes: Uint8Array): string => {
  if (!globalTextDecoder) {
    return "";
  }
  try {
    const raw = globalTextDecoder.decode(bytes).replace(/\0+$/g, "");
    const sanitized = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    return sanitized.trim().length > 0 ? sanitized.trimEnd() : "";
  } catch (err) {
    console.error("⚠️ ASCII decode failed", err);
    return "";
  }
};

interface NormalizedMetadata {
  type: string;
  shortHash?: string;
  fullHash?: string;
  message?: string;
  ipfs?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  preview?: string;
  createdAt?: string;
}

const normaliseMetadataPayload = (
  raw: any,
  context: { shortHash?: string; fullHash?: string } = {}
): NormalizedMetadata => {
  if (!raw || typeof raw !== "object") {
    return {
      type: "unknown",
      shortHash: context.shortHash,
      fullHash: context.fullHash
    };
  }

  const inferredType =
    typeof raw.type === "string"
      ? raw.type
      : raw.ipfs || raw.ipfsHash
      ? "file"
      : "text";

  const normalized: NormalizedMetadata = {
    type: inferredType,
    shortHash:
      typeof raw.shortHash === "string"
        ? raw.shortHash
        : context.shortHash,
    fullHash: context.fullHash,
    message:
      typeof raw.message === "string"
        ? raw.message
        : typeof raw.content === "string"
        ? raw.content
        : undefined,
    preview: typeof raw.preview === "string" ? raw.preview : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined
  };

  if (normalized.type === "file") {
    const ipfsHash =
      typeof raw.ipfs === "string"
        ? raw.ipfs
        : typeof raw.ipfsHash === "string"
        ? raw.ipfsHash
        : undefined;
    normalized.ipfs = ipfsHash;

    const fileName =
      typeof raw.name === "string"
        ? raw.name
        : typeof raw.fileName === "string"
        ? raw.fileName
        : undefined;
    normalized.name = fileName;

    const sizeValue =
      typeof raw.size === "number"
        ? raw.size
        : typeof raw.fileSize === "number"
        ? raw.fileSize
        : undefined;
    normalized.size =
      typeof sizeValue === "number" && Number.isFinite(sizeValue)
        ? sizeValue
        : undefined;

    const mimeType =
      typeof raw.mimeType === "string"
        ? raw.mimeType
        : typeof raw.fileType === "string"
        ? raw.fileType
        : undefined;
    normalized.mimeType = mimeType ?? "application/octet-stream";
  } else {
    normalized.mimeType =
      typeof raw.mimeType === "string"
        ? raw.mimeType
        : "text/plain; charset=utf-8";
    if (!normalized.message && typeof raw === "string") {
      normalized.message = raw;
    }
  }

  return normalized;
};

const formatBigintContent = (value: bigint): string => {
  const bytes = new Uint8Array(32);
  let working = value;
  for (let cursor = bytes.length - 1; cursor >= 0; cursor--) {
    bytes[cursor] = Number(working & 0xffn);
    working >>= 8n;
  }
  const decoded = decodeAscii(bytes);
  if (decoded) {
    return decoded;
  }
  return `0x${value.toString(16).padStart(64, "0")}`;
};

const convertDecryptedValue = (payload: unknown, contentType?: number): string => {
  if (typeof payload === "bigint") {
    if (contentType === 1) {
      return `0x${payload.toString(16)}`;
    }
    const formatted = formatBigintContent(payload);
    
    // ✅ Try to parse as JSON (file metadata)
    try {
      const parsed = JSON.parse(formatted);
      if (parsed && typeof parsed === 'object' && parsed.type === 'file') {
        // Return as is - will be handled in component
        return formatted;
      }
    } catch {
      // Not JSON, return as text
    }
    
    return formatted;
  }
  if (typeof payload === "boolean") {
    return payload ? "true" : "false";
  }
  if (typeof payload === "string") {
    if (!payload) {
      return "";
    }
    if ((contentType === 0 || contentType === undefined) && payload.startsWith("0x")) {
      try {
        const ascii = decodeAscii(hexToBytes(payload));
        return ascii || payload;
      } catch {
        return payload;
      }
    }
    return payload;
  }
  if (payload == null) {
    return "";
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
};

const formatFileSize = (size: bigint | null | undefined): string => {
  if (!size || size <= 0n) {
    return "Belirtilmedi";
  }
  let bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return `${size.toString()} B`;
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  while (bytes >= 1024 && unitIndex < units.length - 1) {
    bytes /= 1024;
    unitIndex++;
  }
  const precision = unitIndex === 0 ? 0 : 2;
  return `${bytes.toFixed(precision)} ${units[unitIndex]}`;
};

const trimDecimalString = (raw: string): string => {
  if (!raw.includes(".")) {
    return raw;
  }
  return raw.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
};

const formatPaymentAmount = (
  value: bigint | null | undefined,
  options?: { includeUnit?: boolean; zeroLabel?: string }
): string => {
  const includeUnit = options?.includeUnit ?? true;
  const zeroLabel = options?.zeroLabel ?? (includeUnit ? "Bedelsiz" : "0");

  if (!value || value === 0n) {
    return zeroLabel;
  }

  try {
    const formatted = trimDecimalString(formatUnits(value, 18));
    return includeUnit ? `${formatted} ETH` : formatted;
  } catch {
    const fallback = value.toString();
    return includeUnit ? `${fallback} wei` : fallback;
  }
};

const toReadableError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

export function MessageCard({
  id,
  sender,
  receiver,
  unlockTime,
  unlockDate,
  unlocked,
  isRead,
  isSent,
  index,
  contractAddress: propsContractAddress, // ✅ Props'tan gelen (varsa)
  onMessageRead,
  onHide,
  requiredPayment,
  paidAmount,
  conditionType,
  transactionHash,
  paymentTxHash,
  contentType,
  fileMetadata
}: MessageCardProps) {
  const client = usePublicClient();
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const hookContractAddress = useContractAddress(); // Hook'tan gelen (current)
  const { chain } = useNetwork();
  const fhe = useFhe();
  const { isLoading: isFheLoading, isReady: isFheReady } = useFheStatus();
  const [prefetchedHandle, setPrefetchedHandle] = useState<unknown | null>(null);
  
  // ✅ Props'tan gelen varsa onu kullan, yoksa hook'tan gelenı kullan
  const contractAddress = (propsContractAddress || hookContractAddress) as `0x${string}` | undefined;
  
  // 🔑 Cache key: contract address bazlı (eski contract'larla karışmasın)
  const cacheKey = useMemo(() => 
    contractAddress ? `${contractAddress.slice(0, 10)}-msg` : 'msg',
    [contractAddress]
  );
  
  // localStorage'dan initial state yükle (basit key, sonra cacheKey ile güncellenecek)
  const [messageContent, setMessageContent] = useState<string | null>(null);
  const [fileMetadataState, setFileMetadataState] = useState<any>(null);
  const [isLoadingFileMetadata, setIsLoadingFileMetadata] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState(unlocked);
  const [localIsRead, setLocalIsRead] = useState(isRead);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  
  // 📋 PREVIEW METADATA: Locked mesaj bilgileri
  const [previewMetadata, setPreviewMetadata] = useState<{
    fileName: string;
    fileSize: bigint;
    contentType: string;
    previewImageHash: string;
  } | null>(null);
  const [isLoadingPreviewMeta, setIsLoadingPreviewMeta] = useState(false);
  
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPollAttempts, setPreviewPollAttempts] = useState(0);
  const [previewPollingDisabled, setPreviewPollingDisabled] = useState(false);
  const [sentPreviewInfo, setSentPreviewInfo] = useState<SentPreviewCache | null>(null);
  
  // ✅ YENİ: Payment bilgisi state
  const [requiredPaymentAmount, setRequiredPaymentAmount] = useState<bigint | null>(null);
  const [conditionMask, setConditionMask] = useState<number>(0);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false);
  const [onchainUnlocked, setOnchainUnlocked] = useState<boolean | null>(null);
  const metadataReadyRef = useRef(false);

  useEffect(() => {
    setConditionMask(0);
    setRequiredPaymentAmount(null);
    setMetadataLoaded(false);
    setOnchainUnlocked(null);
    metadataReadyRef.current = false;
  }, [id, contractAddress]);

  // 🔄 localStorage'dan cache'i yükle (cacheKey hazır olduğunda)
  useEffect(() => {
    if (typeof window === 'undefined' || !cacheKey) return;
    
    const sentPreview = localStorage.getItem(`${cacheKey}-sent-preview-${id}`);
    if (sentPreview) {
      try {
        const parsed = JSON.parse(sentPreview) as SentPreviewCache;
        if (parsed && typeof parsed === 'object') {
          setSentPreviewInfo(parsed);
          if (parsed.fileMetadata) {
            const { fileName, fileSize, mimeType } = parsed.fileMetadata;
            setPreviewMetadata((current) => {
              if (current) {
                return current;
              }
              return {
                fileName: fileName ?? '',
                fileSize: BigInt(Math.max(0, Math.floor(fileSize ?? 0))),
                contentType: mimeType ?? '',
                previewImageHash: ''
              };
            });
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to parse sent preview cache', err);
      }
    }

    const cachedContent = localStorage.getItem(`${cacheKey}-content-${id}`);
    const cachedExpanded = localStorage.getItem(`${cacheKey}-expanded-${id}`) === 'true';
    const cachedRead = localStorage.getItem(`${cacheKey}-read-${id}`) === 'true';
    const cachedUnlocked = localStorage.getItem(`${cacheKey}-unlocked-${id}`) === 'true';
    
    if (cachedContent) setMessageContent(cachedContent);
    if (cachedExpanded) setIsExpanded(true);
    if (cachedRead) setLocalIsRead(true);
    if (cachedUnlocked) setLocalUnlocked(true);
  }, [cacheKey, id]);

  useEffect(() => {
    setPreviewPollAttempts(0);
    setPreviewPollingDisabled(false);
    setPreviewDataUrl(null);
    setPreviewError(null);
    setSentPreviewInfo(null);
  }, [id]);

  useEffect(() => {
    metadataReadyRef.current = metadataLoaded;
  }, [metadataLoaded, metadataReadyRef]);

  useEffect(() => {
    if (unlocked) {
      setLocalUnlocked(true);
    }
  }, [unlocked]);

  useEffect(() => {
    if (isRead) {
      setLocalIsRead(true);
    }
  }, [isRead]);

  const ensureOnchainUnlocked = useCallback(async (): Promise<boolean> => {
    if (!client || !contractAddress || isSent) {
      setMetadataLoaded(true);
      metadataReadyRef.current = true;
      return true;
    }

    const cachedUnlocked = typeof window !== 'undefined' && cacheKey
      ? localStorage.getItem(`${cacheKey}-unlocked-${id}`) === 'true'
      : false;

    try {
      const metadata = await client.readContract({
        address: contractAddress,
        abi: chronoMessageZamaAbi as any,
        functionName: "getMessageMetadata",
        args: [id]
      }) as [string, string, bigint, boolean, number, bigint];

      const metadataUnlockedRaw = Boolean(metadata[3]);
      const fetchedConditionMask = Number(metadata[4]);
      const paymentAmount = metadata[5];

      const effectiveUnlocked = metadataUnlockedRaw || cachedUnlocked;

      setConditionMask(fetchedConditionMask);
      setRequiredPaymentAmount(paymentAmount);
      setMetadataLoaded(true);
      metadataReadyRef.current = true;
      setOnchainUnlocked(metadataUnlockedRaw);

      console.log("📋 Message metadata:", {
        sender: metadata[0],
        receiver: metadata[1],
        unlockTime: metadata[2].toString(),
        isUnlocked: metadataUnlockedRaw,
        cachedUnlocked,
        effectiveUnlocked,
        conditionMask: fetchedConditionMask,
        hasTimeCondition: (fetchedConditionMask & 0x01) !== 0,
  paymentFlag: (fetchedConditionMask & 0x02) !== 0,
  paymentInWei: paymentAmount.toString(),
        paymentEnforced: (fetchedConditionMask & 0x02) !== 0 && paymentAmount > 0n
      });

      setLocalUnlocked((prev) => {
        const next = effectiveUnlocked || prev;
        if (next && typeof window !== 'undefined' && cacheKey) {
          localStorage.setItem(`${cacheKey}-unlocked-${id}`, 'true');
        }
        return next;
      });

      return effectiveUnlocked;
    } catch (err) {
      console.warn("⚠️ On-chain unlock check failed", err);
      if (cachedUnlocked) {
        setLocalUnlocked(true);
        setMetadataLoaded(true);
        metadataReadyRef.current = true;
        return true;
      }
      metadataReadyRef.current = false;
      return false;
    }
  }, [client, contractAddress, id, isSent, cacheKey]);

  useEffect(() => {
    if (isSent) {
      return;
    }

    const unlockSeconds = Number(unlockTime);
    if (!Number.isFinite(unlockSeconds) || unlockSeconds <= 0) {
      return;
    }

    const unlockMs = unlockSeconds * 1000;
    const triggerCheck = () => {
      void ensureOnchainUnlocked();
    };

    if (Date.now() >= unlockMs) {
      triggerCheck();
    }

    const msUntilUnlock = unlockMs - Date.now();
    const timeoutId = msUntilUnlock > 0 ? window.setTimeout(triggerCheck, msUntilUnlock) : undefined;
    const intervalId = window.setInterval(triggerCheck, 15000);

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      clearInterval(intervalId);
    };
  }, [unlockTime, ensureOnchainUnlocked, isSent]);

  // ✅ Ödeme bilgisi artık getMessageMetadata üzerinden geliyor; ayrı bir fetch yok
  useEffect(() => {
    if (!metadataLoaded) {
      setIsLoadingPaymentInfo(true);
      return;
    }
    if ((conditionMask & 0x02) === 0) {
      setIsLoadingPaymentInfo(false);
      return;
    }
    setIsLoadingPaymentInfo(requiredPaymentAmount == null);
  }, [metadataLoaded, conditionMask, requiredPaymentAmount]);

  // 📋 PREVIEW METADATA: Fetch file preview info (always public)
  const fetchPreviewMetadata = useCallback(async () => {
    if (!client || !contractAddress) return;
    
    setIsLoadingPreviewMeta(true);
    try {
      const preview = await client.readContract({
        address: contractAddress,
        abi: chronoMessageZamaAbi as any,
        functionName: "getMessagePreview",
        args: [id]
      }) as [string, bigint, string, string];
      
      const [fileName, fileSize, contentType, previewImageHash] = preview;
      setPreviewMetadata({ fileName, fileSize, contentType, previewImageHash });
      console.log("📋 Preview metadata:", { fileName, fileSize: fileSize.toString(), contentType, previewImageHash });
    } catch (err) {
      console.warn("⚠️ Failed to fetch preview metadata", err);
      setPreviewMetadata(null);
    } finally {
      setIsLoadingPreviewMeta(false);
    }
  }, [client, contractAddress, id]);

  // Preview metadata fetch et (mesaj card render edildiğinde)
  useEffect(() => {
    void fetchPreviewMetadata();
  }, [fetchPreviewMetadata]);

  // ✅ Component mount olduğunda metadata'yı hemen yükle
  useEffect(() => {
    if (isSent) return;
    void ensureOnchainUnlocked();
  }, [ensureOnchainUnlocked, isSent]);

  useEffect(() => {
    if (isSent || localUnlocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void ensureOnchainUnlocked();
    }, 12000);

    void ensureOnchainUnlocked();

    return () => {
      clearInterval(intervalId);
    };
  }, [ensureOnchainUnlocked, isSent, localUnlocked]);

  useEffect(() => {
    if (localUnlocked || isSent || previewDataUrl || previewPollingDisabled) {
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    const attemptFetch = async () => {
      if (cancelled) {
        return;
      }
      try {
        setIsLoadingPreview(true);
        setPreviewError(null);
        const res = await fetch(`/api/message-preview/${id.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            setPreviewPollAttempts((prev) => {
              const next = prev + 1;
              if (next >= 3) {
                setPreviewPollingDisabled(true);
              }
              return next;
            });
            return;
          }
          throw new Error(`Preview fetch failed with status ${res.status}`);
        }
        const json = await res.json();
        const candidate = (json?.record?.previewDataUrl ?? json?.previewDataUrl) as string | undefined;
        if (!cancelled && candidate) {
          setPreviewDataUrl(candidate);
          setPreviewError(null);
          setPreviewPollingDisabled(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Preview fetch failed', err);
          setPreviewError('Preview unavailable');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      }
    };

    void attemptFetch();
    intervalId = window.setInterval(() => {
      if (!cancelled && !previewDataUrl && !previewPollingDisabled) {
        void attemptFetch();
      }
    }, 15000);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [id, localUnlocked, isSent, previewDataUrl, previewPollingDisabled]);

  // Zama userDecrypt requires signed permission - this helper manages the keypair session
  const decryptWithUser = useCallback(async (handleBigInt: bigint) => {
    if (!fhe || !walletClient || !userAddress || !contractAddress) {
      throw new Error("Missing FHE SDK, wallet, or contract address");
    }

    console.log('🔐 Starting userDecrypt flow for handle:', handleBigInt.toString(16));

    // Generate or reuse keypair
    let session: any;
    try {
      const stored = localStorage.getItem('fhe-decrypt-session');
      if (stored) {
        session = JSON.parse(stored);
        const expires = session.startTimestamp + session.durationDays * 86400;
        if (expires < Math.floor(Date.now() / 1000) + 60) {
          session = null; // expired
        }
      }
    } catch {}

    if (!session) {
      const keypair = fhe.generateKeypair();
      session = {
        publicKey: keypair.publicKey,
        privateKey: keypair.privateKey,
        startTimestamp: Math.floor(Date.now() / 1000),
        durationDays: 7,
      };
      localStorage.setItem('fhe-decrypt-session', JSON.stringify(session));
    }

    // Create EIP712 typed data
    const typedData = fhe.createEIP712(
      session.publicKey,
      [contractAddress],
      session.startTimestamp,
      session.durationDays
    );

    console.log('🖋️ Requesting wallet signature for decrypt permission...');

    // Sign with wallet
    const signature = await walletClient.signTypedData({
      account: userAddress as `0x${string}`,
      ...typedData,
    });

    // Convert bigint handle to hex
    const handleHex = `0x${handleBigInt.toString(16).padStart(64, '0')}`;

    console.log('📡 Calling userDecrypt...', { handleHex });

    // Call userDecrypt
    const result = await fhe.userDecrypt(
      [{ handle: handleHex, contractAddress }],
      session.privateKey,
      session.publicKey,
      signature,
      [contractAddress],
      userAddress,
      session.startTimestamp,
      session.durationDays
    );

    console.log('✅ userDecrypt result:', result);

    const keys = Object.keys(result ?? {});
    if (!keys.length) {
      throw new Error("Decryption returned no values");
    }

    return convertDecryptedValue(result[keys[0]], contentType);
  }, [fhe, walletClient, userAddress, contractAddress, contentType]);

  const decryptCiphertext = useCallback(async (handleValue: unknown) => {
    console.log('🔓 Decrypt attempt:', { type: typeof handleValue, value: handleValue });

  // Zama returns euint256 handles as bigint
    if (typeof handleValue === 'bigint') {
      return await decryptWithUser(handleValue);
    }

    // Fallback for hex string (legacy)
    if (typeof handleValue !== 'string') {
      throw new Error(`Expected bigint or string, got ${typeof handleValue}`);
    }

    const sanitized = stripHexPrefix(handleValue);
    if (!sanitized) {
      throw new Error("Ciphertext is empty");
    }

    // Prefer user decrypt path for handles encoded as hex strings
    try {
      const asBigint = BigInt(handleValue);
      return await decryptWithUser(asBigint);
    } catch (userDecryptErr) {
      console.warn('⚠️ Hex handle userDecrypt failed, falling back to public decrypt', userDecryptErr);
    }

    const bytes = hexToBytes(handleValue);
    const decryptedResults = await fhe.publicDecrypt([bytes]);
    const keys = Object.keys(decryptedResults ?? {});
    if (!keys.length) {
      throw new Error("Decryption returned no values");
    }

    const firstKey = keys[0];
    return convertDecryptedValue(decryptedResults[firstKey], contentType);
  }, [fhe, contentType, decryptWithUser]);

  // Helper: try resolving shortHash via backend, proxy, or Pinata keyvalue search
  const tryResolveShortHash = async (shortHash: string): Promise<string | null> => {
    console.log('🔎 tryResolveShortHash:', shortHash);
    const persistMapping = async (fullHash: string) => {
      try {
        await fetch('/api/metadata-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortHash, fullHash })
        });
      } catch (err) {
        console.warn('⚠️ Failed to persist mapping after resolve:', err);
      }
    };

    // 0) Backend mapping service
    try {
      const res = await fetch(`/api/metadata-mapping/${shortHash}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const candidate = data?.record?.fullHash as string | undefined;
        if (candidate) {
          return candidate;
        }
      }
    } catch (err) {
      console.warn('Backend lookup failed:', err);
    }

    // 1) Try direct proxy fetch assuming the sender stored full metadata under same shortHash as filename
    try {
      const probeUrl = `/api/ipfs/${shortHash}`;
      const probe = await fetch(probeUrl);
          if (probe.ok) {
            try {
              const candidate = await probe.json();
              if (candidate?.ipfs) {
                const fullHash = candidate.ipfs as string;
                await persistMapping(fullHash);
                return fullHash;
              }
            } catch {}
      }
    } catch (e) {
      console.warn('Probe via proxy failed:', e);
    }

    // 2) Try Pinata keyvalue search (if keys present)
    try {
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
      if (!pinataApiKey || !pinataSecretKey) return null;

      const headers: Record<string, string> = {
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretKey,
        Accept: 'application/json'
      };

      const params = new URLSearchParams({ status: 'pinned', pageLimit: '5' });
      params.append('hashContains', shortHash);
      const res = await fetch(`https://api.pinata.cloud/data/pinList?${params.toString()}`, { headers });
      if (!res.ok) return null;
      const json = await res.json();
      const rows: any[] = json?.rows ?? [];
      const match = rows.find((r) => r?.metadata?.keyvalues?.shortHash === shortHash || (r?.metadata?.name || '').toLowerCase().includes('meta'));
      if (match?.ipfs_pin_hash) {
        const fullHash = match.ipfs_pin_hash as string;
        await persistMapping(fullHash);
        return fullHash;
      }
    } catch (e) {
      console.warn('Pinata search failed:', e);
    }

    return null;
  };
  
  // Fetch file metadata if messageContent starts with "F:"
  useEffect(() => {
    const fetchFileMetadata = async () => {
      if (!messageContent || !messageContent.startsWith('F:')) {
        console.log('📝 Not a file message, content:', messageContent?.substring(0, 50));
        return;
      }
      if (fileMetadataState) return;

      // Extract full hash after "F:" prefix (could be 6-char short or full IPFS hash)
      const hashPart = messageContent.substring(2).trim();
      console.log('📎 Detected file message! Hash part:', hashPart);

      // Determine if it's a short hash (<=8 chars) or full IPFS hash (46+ chars)
      const isShortHash = hashPart.length <= 8;
      const shortHash = isShortHash ? hashPart : hashPart.substring(0, 6);
      const mappingKey = `file-metadata-${shortHash}`;
      let fullHash: string | null = null;
      try {
        fullHash = localStorage.getItem(mappingKey);
      } catch (err) {
        console.warn('⚠️ localStorage unavailable while resolving metadata hash:', err);
      }

      const fetchMappingFromServer = async (hash: string): Promise<string | null> => {
        try {
          const response = await fetch(`/api/metadata-mapping/${hash}`, { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            const candidate = data?.record?.fullHash as string | undefined;
            if (candidate) {
              return candidate;
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch mapping from backend:', err);
        }
        return null;
      };

      const resolveMetadataHashFromNetwork = async (hashFragment: string): Promise<string | null> => {
        const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
        const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

        if (!pinataApiKey || !pinataSecretKey) {
          console.warn('⚠️ Pinata credentials missing; cannot resolve metadata hash for:', hashFragment);
          return null;
        }

        const headers: Record<string, string> = {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
          Accept: 'application/json'
        };

        try {
          const params = new URLSearchParams({ status: 'pinned', pageLimit: '1' });
          const keyvalues = {
            shortHash: { value: hashFragment, op: 'eq' },
            type: { value: 'message-metadata', op: 'eq' }
          };
          params.append('metadata[keyvalues]', JSON.stringify(keyvalues));

          const primaryResponse = await fetch(`https://api.pinata.cloud/data/pinList?${params.toString()}`, {
            headers
          });

          if (primaryResponse.ok) {
            const json = await primaryResponse.json();
            const rows: any[] = json?.rows ?? [];
            const match = rows.find((row) => row?.metadata?.keyvalues?.shortHash === hashFragment);
            if (match?.ipfs_pin_hash) {
              console.log('🌐 Resolved metadata hash via Pinata (keyvalues):', match.ipfs_pin_hash);
              return match.ipfs_pin_hash as string;
            }
          } else {
            console.warn('⚠️ Pinata keyvalue lookup failed:', primaryResponse.status, primaryResponse.statusText);
          }
        } catch (err) {
          console.error('❌ Pinata keyvalue lookup error:', err);
        }

        try {
          const fallbackParams = new URLSearchParams({ status: 'pinned', pageLimit: '5' });
          fallbackParams.append('hashContains', hashFragment);

          const fallbackResponse = await fetch(`https://api.pinata.cloud/data/pinList?${fallbackParams.toString()}`, {
            headers
          });

          if (fallbackResponse.ok) {
            const json = await fallbackResponse.json();
            const rows: any[] = json?.rows ?? [];
            const match = rows.find((row) => {
              if (!row?.ipfs_pin_hash) return false;
              if (row?.metadata?.keyvalues?.type === 'message-metadata') return true;
              const name = row?.metadata?.name as string | undefined;
              return typeof name === 'string' && name.toLowerCase().includes('metadata');
            });

            if (match?.ipfs_pin_hash) {
              console.log('🌐 Resolved metadata hash via Pinata (fallback):', match.ipfs_pin_hash);
              return match.ipfs_pin_hash as string;
            }
          } else {
            console.warn('⚠️ Pinata fallback lookup failed:', fallbackResponse.status, fallbackResponse.statusText);
          }
        } catch (err) {
          console.error('❌ Pinata fallback lookup error:', err);
        }

        return null;
      };

      setIsLoadingFileMetadata(true);

      // If it's already a full IPFS hash, use it directly
      if (!isShortHash && hashPart.length >= 46) {
        console.log('✅ Using full IPFS hash from message content:', hashPart);
        fullHash = hashPart;
      }

      if (!fullHash && isShortHash) {
        const serverHash = await fetchMappingFromServer(shortHash);
        if (serverHash) {
          console.log('✅ Resolved metadata hash via backend:', serverHash);
          fullHash = serverHash;
          try {
            localStorage.setItem(mappingKey, serverHash);
          } catch (err) {
            console.warn('⚠️ Failed to persist backend mapping to localStorage:', err);
          }
        }
      }

      if (!fullHash && isShortHash) {
        console.warn('⚠️ Metadata mapping missing locally and backend unavailable; attempting Pinata lookup for:', shortHash);
        fullHash = await resolveMetadataHashFromNetwork(shortHash);
        if (fullHash) {
          try {
            localStorage.setItem(mappingKey, fullHash);
          } catch (err) {
            console.warn('⚠️ Failed to persist Pinata mapping to localStorage:', err);
          }

          try {
            await fetch('/api/metadata-mapping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shortHash, fullHash })
            });
          } catch (err) {
            console.warn('⚠️ Failed to persist Pinata mapping to backend:', err);
          }
        }
      }

      if (fullHash) {
        console.log('✅ Full metadata hash resolved:', fullHash);
        try {
          const url = `/api/ipfs/${fullHash}`;
          console.log('📡 Fetching metadata from:', url);
          const response = await fetch(url);
          if (!response.ok) {
            console.error('❌ Metadata fetch failed:', response.status, response.statusText);
            throw new Error('Metadata fetch failed');
          }
          const data = await response.json();
          console.log('✅ File metadata loaded:', data);
          const normalized = normaliseMetadataPayload(data, { shortHash, fullHash: fullHash ?? (isShortHash ? undefined : hashPart) });
          setFileMetadataState(normalized);
          setIsLoadingFileMetadata(false);
          return;
        } catch (err) {
          console.error('❌ Failed to fetch file metadata using full hash:', err);
          // fallthrough to interactive resolve UI
        }
      }

      // If we reach here, no fullHash was available or fetch failed. Provide interactive resolve options to the user.
      console.warn('⚠️ Full metadata hash not found for short hash:', shortHash);
      setFileMetadataState({ error: true, message: 'Metadata hash not found locally.', shortHash, hashPart, attempts: 0 });
      setIsLoadingFileMetadata(false);
    };

    fetchFileMetadata();
  }, [messageContent, fileMetadataState]);
  
  // Artık sadece Zama kullanıyoruz
  const isZamaContract = true;
  
  // Sadece Zama ABI kullan
  const selectedAbi = chronoMessageZamaAbi;
  
  // Zama'da payment yok, sadece time-lock
  const isPaymentLocked = false; // Zama supports only time-lock
  const canUnlockWithPayment = false;
  
  const { config: paymentConfig } = usePrepareContractWrite({
    address: contractAddress,
    abi: chronoMessageZamaAbi as any,
    functionName: "readMessage" as any, // Zama'da payToUnlock yok
    args: undefined,
    value: undefined,
    enabled: false // Payment unlock disabled for Zama
  });
  
  const { 
    data: paymentTxData, 
    isLoading: isPaymentPending, 
    write: unlockWithPayment 
  } = useContractWrite(paymentConfig);
  
  const { 
    isLoading: isPaymentConfirming, 
    isSuccess: isPaymentSuccess 
  } = useWaitForTransaction({
    hash: paymentTxData?.hash
  });

  // Eğer mesaj zaten okunmuşsa (isRead: true), direkt içeriği yükle
  useEffect(() => {
    const loadContentIfRead = async () => {
      if (!isRead || isSent || !localUnlocked || !client || !userAddress || !contractAddress) return;
      
      // ✅ Cache'de varsa hiçbir şey yapma (state'te zaten yüklü)
      if (messageContent) {
        console.log('✅ Message content already loaded from cache');
        return;
      }
      
      if (!fhe || !isFheReady) {
        console.log('⏳ Waiting for FHE to be ready before loading read message...');
        return;
      }

      console.log('📡 Loading previously read message (no cache found)...');
      setIsLoadingContent(true);
      setDecryptError(null);
      let ciphertext: unknown = null;
      try {
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi as any,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        });

        ciphertext = content;
        const decrypted = await decryptCiphertext(content);
        setMessageContent(decrypted);
        setIsExpanded(true);
        setLocalUnlocked(true);
        setLocalIsRead(true);
        
        // ✅ localStorage'a kaydet
        localStorage.setItem(`${cacheKey}-content-${id}`, decrypted);
        localStorage.setItem(`${cacheKey}-read-${id}`, 'true');
        localStorage.setItem(`${cacheKey}-expanded-${id}`, 'true');
        localStorage.setItem(`${cacheKey}-unlocked-${id}`, 'true');
        // Debug: record received decrypted
        try {
          const entry = {
            ts: Date.now(),
            type: 'received-decrypted',
            id: id.toString(),
            decrypted,
            ciphertext: String((ciphertext as any)?.toString?.() ?? ciphertext)
          };
          const existing = JSON.parse(localStorage.getItem('msg-debug-log') || '[]');
          existing.push(entry);
          localStorage.setItem('msg-debug-log', JSON.stringify(existing));
          console.log('🐛 Debug saved (received-decrypted):', entry);
        } catch (e) {
          console.warn('Failed to write debug log (received-decrypted):', e);
        }
      } catch (err) {
  console.error("❌ Content could not be loaded (isRead):", err);
  const fallback = ciphertext != null ? String((ciphertext as any)?.toString?.() ?? ciphertext) : "⚠️ Encrypted payload unavailable";
  setMessageContent(fallback);
        setDecryptError(`Unable to decrypt message: ${toReadableError(err)}`);
      } finally {
        setIsLoadingContent(false);
      }
    };
    
    loadContentIfRead();
  }, [isRead, isSent, localUnlocked, client, userAddress, id, messageContent, contractAddress, fhe, isFheReady, decryptCiphertext]);

  const hasTimeCondition = metadataLoaded && (conditionMask & 0x01) !== 0;
  const paymentFlagIsSet = metadataLoaded && (conditionMask & 0x02) !== 0;
  const paymentAmountResolved = requiredPaymentAmount !== null;
  const paymentAmountValue = paymentAmountResolved ? (requiredPaymentAmount as bigint) : null;
  const hasPaymentCondition = paymentFlagIsSet && paymentAmountValue !== null && paymentAmountValue > 0n;
  const paymentReady = !paymentFlagIsSet || paymentAmountResolved;
  
  // ✅ Zaman kontrolü: on-chain unlocked veya client-side zaman dolmuş
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const unlockTimestamp = Number(unlockTime);
  const clientTimeReady = unlockTimestamp > 0 && currentTimestamp >= unlockTimestamp;
  const timeReady = !hasTimeCondition || onchainUnlocked === true || clientTimeReady;
  
  const shouldAttachPayment = hasPaymentCondition;
  const canPrepareRead = !!contractAddress && !!userAddress && !!chain?.id && !isSent && !messageContent && metadataLoaded && paymentReady && timeReady;
  const paymentIsFree = !requiredPaymentAmount || requiredPaymentAmount === 0n;
  const paymentDisplay = metadataLoaded ? formatPaymentAmount(requiredPaymentAmount) : null;
  const paymentBadgeClass = metadataLoaded ? (paymentIsFree ? "text-emerald-300" : "text-amber-300") : "text-slate-500 animate-pulse";
  const paymentRequirementLabel = hasPaymentCondition && paymentAmountValue !== null
    ? formatPaymentAmount(paymentAmountValue, { includeUnit: true, zeroLabel: "0 ETH" })
    : null;
  const fallbackConditionMask = conditionType ?? 0;
  const fallbackHasTime = (fallbackConditionMask & 0x01) !== 0;
  const fallbackHasPayment = (fallbackConditionMask & 0x02) !== 0 && typeof requiredPayment === 'bigint' && requiredPayment > 0n;
  const headerBadges = useMemo(() => {
    const badges: { key: string; label: string; className: string }[] = [];
    const timeBadge = {
      key: 'time',
      label: '⏰ Time Lock',
      className: 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
    };
    const paymentBadge = {
      key: 'payment',
      label: paymentRequirementLabel ? `💰 Payment · ${paymentRequirementLabel}` : '💰 Payment Required',
      className: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
    };
    const instantBadge = {
      key: 'instant',
      label: '⚡ Instant Access',
      className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
    };

    if (metadataLoaded) {
      if (hasTimeCondition) {
        badges.push(timeBadge);
      }
      if (hasPaymentCondition) {
        badges.push(paymentBadge);
      }
      if (!hasTimeCondition && !hasPaymentCondition) {
        badges.push(instantBadge);
      }
      return badges;
    }

    if (fallbackHasTime) {
      badges.push(timeBadge);
    }
    if (fallbackHasPayment) {
      badges.push(paymentBadge);
    }
    if (!fallbackHasTime && !fallbackHasPayment) {
      badges.push(instantBadge);
    }
    return badges;
  }, [metadataLoaded, hasTimeCondition, hasPaymentCondition, paymentFlagIsSet, conditionType, paymentRequirementLabel, fallbackHasTime, fallbackHasPayment]);
  const fileNameLabel = previewMetadata?.fileName?.trim() ? previewMetadata.fileName.trim() : null;
  const fileSizeLabel = previewMetadata && previewMetadata.fileSize > 0n ? formatFileSize(previewMetadata.fileSize) : null;
  const contentTypeLabel = previewMetadata?.contentType?.trim() ? previewMetadata.contentType.trim() : null;
  const previewImageUrl = previewMetadata?.previewImageHash ? `/api/ipfs/${previewMetadata.previewImageHash}` : null;
  const hasAnyPreviewInfo = Boolean(fileNameLabel || fileSizeLabel || contentTypeLabel || previewMetadata?.previewImageHash);

  // ✅ readMessage transaction - payment desteği ile (usePrepareContractWrite)
  const { config: preparedReadConfig, error: prepareReadError, status: prepareReadStatus } = usePrepareContractWrite({
    address: contractAddress,
    abi: chronoMessageZamaAbi,
    functionName: "readMessage",
    args: [id],
    // Payment koşulu varsa value ekle
    value: shouldAttachPayment ? (requiredPaymentAmount as bigint) : undefined,
    // Zaman kilidi açılmışsa veya ödeme gereği varsa (ve miktar biliniyorsa) hazırlansın
    enabled: canPrepareRead,
    chainId: chain?.id,
    account: userAddress as `0x${string}` | undefined,
  });
  
  // 🐛 DEBUG: Config'i logla
  useEffect(() => {
    console.log("📋 readMessage prepare state:", {
      messageId: id.toString(),
      metadataLoaded,
  onchainUnlocked,
      conditionMaskHex: conditionMask.toString(16).padStart(2, '0'),
      hasTimeCondition,
      hasPaymentCondition,
      paymentReady,
      timeReady,
      requiredPaymentAmount: requiredPaymentAmount != null ? requiredPaymentAmount.toString() : null,
      willSendValue: shouldAttachPayment && requiredPaymentAmount != null ? requiredPaymentAmount.toString() : 'NO VALUE',
      enabled: canPrepareRead,
      chainId: chain?.id,
      account: userAddress,
      requestPresent: !!(preparedReadConfig as any)?.request,
      prepareStatus: prepareReadStatus,
      prepareError: prepareReadError ? toReadableError(prepareReadError) : null
    });
  }, [id, metadataLoaded, onchainUnlocked, conditionMask, hasTimeCondition, hasPaymentCondition, paymentReady, timeReady, requiredPaymentAmount, shouldAttachPayment, canPrepareRead, preparedReadConfig, prepareReadStatus, prepareReadError, chain?.id, userAddress]);

  useEffect(() => {
    if (prepareReadError) {
      console.error("❌ readMessage prepare error:", prepareReadError);
    }
  }, [prepareReadError]);

  const { data: txData, isLoading: isReading, write: readMessage } = useContractWrite(preparedReadConfig);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: txData?.hash
  });
  // Transaction başarılı olunca içeriği çek
  useEffect(() => {
    if (!isSuccess || !client || !userAddress || !contractAddress || !fhe) return;
    const fetchContent = async () => {
      setIsLoadingContent(true);
      setDecryptError(null);
      // Kısa bekleme (ACL ve state)
      await new Promise((resolve) => setTimeout(resolve, 2000));

  let handleValue: unknown = prefetchedHandle;
      try {
        const needsPayment = (conditionMask & 0x02) !== 0;
        // Eğer ödeme gereksinimi varsa ve prefetched yoksa, yine de bir kez dene:
        // Ödeme "claimed" olduktan sonra sözleşme state’indeki engel kalkmış olabilir.
        if (handleValue == null) {
          console.log('📡 No prefetched handle; attempting view read (time-lock path)...');
          const handle = await client.readContract({
            address: contractAddress,
            abi: chronoMessageZamaAbi,
            functionName: "readMessage" as any,
            args: [id],
            account: userAddress as `0x${string}`
          });
          console.log('✅ Got handle via view:', handle);
          handleValue = handle;
        } else {
          console.log('✅ Using prefetched handle from simulate');
        }

        const decrypted = await decryptCiphertext(handleValue);
        setMessageContent(decrypted);
        setIsExpanded(true);
        setLocalIsRead(true);
        setLocalUnlocked(true);
        
        // localStorage cache
        localStorage.setItem(`${cacheKey}-content-${id}`, decrypted);
        localStorage.setItem(`${cacheKey}-read-${id}`, 'true');
        localStorage.setItem(`${cacheKey}-expanded-${id}`, 'true');
        localStorage.setItem(`${cacheKey}-unlocked-${id}`, 'true');
        
        onMessageRead?.();
      } catch (err) {
        const fallback = handleValue != null ? String((handleValue as any)?.toString?.() ?? handleValue) : "⚠️ Content could not be loaded";
        setMessageContent(fallback);
        setDecryptError(`Unable to decrypt message: ${toReadableError(err)}`);
      } finally {
        setPrefetchedHandle(null);
        setIsLoadingContent(false);
      }
    };
    fetchContent();
  }, [isSuccess, client, id, onMessageRead, userAddress, contractAddress, fhe, decryptCiphertext, prefetchedHandle, cacheKey]);

  // Payment success olduğunda içeriği yükle
  useEffect(() => {
    const fetchContentAfterPayment = async () => {
      if (!isPaymentSuccess || !client || !userAddress || !contractAddress || !fhe) return;
      
      setIsLoadingContent(true);
      setDecryptError(null);
      setLocalUnlocked(true);
      setLocalIsRead(true);
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      let ciphertext: unknown = null;
      try {
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        });

        ciphertext = content;
        const decrypted = await decryptCiphertext(content);
        setMessageContent(decrypted);
        setIsExpanded(true);
        
        // localStorage cache (payment sonrası)
        localStorage.setItem(`${cacheKey}-content-${id}`, decrypted);
        localStorage.setItem(`${cacheKey}-read-${id}`, 'true');
        localStorage.setItem(`${cacheKey}-expanded-${id}`, 'true');
        localStorage.setItem(`${cacheKey}-unlocked-${id}`, 'true');
        
        onMessageRead?.(); // Parent'ı bilgilendir
      } catch (err) {
        console.error("❌ Content could not be fetched after payment:", err);
        const fallback = ciphertext != null ? String((ciphertext as any)?.toString?.() ?? ciphertext) : "⚠️ Content could not be loaded";
        setMessageContent(fallback);
        setDecryptError(`Unable to decrypt message: ${toReadableError(err)}`);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContentAfterPayment();
  }, [isPaymentSuccess, client, id, onMessageRead, userAddress, contractAddress, fhe, decryptCiphertext]);

  const handleReadClick = async () => {
    if (isSent) {
      console.warn("❌ Cannot read own message");
      return;
    }
    if (!contractAddress) {
      console.error("❌ Contract address not available");
      return;
    }
    if (!isFheReady) {
      setDecryptError("FHE system is still loading. Please wait a moment and try again.");
      console.warn("⏳ FHE SDK not ready yet, isLoading:", isFheLoading);
      return;
    }

    // ✅ Metadata yüklenmediyse, hemen yükle ve bekle
    if (!metadataReadyRef.current) {
      console.log("⏳ Metadata not loaded yet, loading now...");
      setDecryptError("Message info is loading...");
      const unlocked = await ensureOnchainUnlocked();
      if (!metadataReadyRef.current) {
        setDecryptError("Failed to load message metadata. Please try again.");
        return;
      }
      if (hasTimeCondition && !unlocked) {
        setDecryptError("Waiting for the next block to unlock this message. Please try again shortly.");
        return;
      }
    }

    if (!paymentReady) {
      setDecryptError("Payment info is still loading. Please try again in a moment.");
      console.warn("⏳ Payment metadata still loading for message", id.toString());
      return;
    }

    const preparedRequest = (preparedReadConfig as any)?.request;
    if (!preparedRequest) {
      const readableError = prepareReadError ? toReadableError(prepareReadError) : null;
      if (readableError) {
        if (readableError.includes('Time locked')) {
          setDecryptError('Time lock is still active. Please wait for the unlock time, then try again.');
        } else if (readableError.includes('Insufficient payment')) {
          setDecryptError('Payment value is missing. Please wait for the payment quote and retry.');
        } else {
          setDecryptError(`Unable to prepare transaction: ${readableError}`);
        }
      } else if (prepareReadStatus === 'loading') {
        setDecryptError('Transaction configuration is still being prepared. Please wait a moment and try again.');
      } else {
        setDecryptError('Transaction configuration unavailable. Please refresh and try again.');
      }
      console.error("❌ Prepared request unavailable", {
        preparedReadConfig,
        prepareReadStatus,
        prepareReadError
      });
      return;
    }

    if (!readMessage) {
      console.error("❌ readMessage function not available");
      console.error("❌ preparedConfig:", preparedReadConfig);
      console.error("❌ conditionMask:", conditionMask);
      console.error("❌ requiredPaymentAmount:", requiredPaymentAmount?.toString());
      return;
    }

    const isActuallyUnlocked = await ensureOnchainUnlocked();
    if (hasTimeCondition && !isActuallyUnlocked) {
      setDecryptError("Waiting for the next block to unlock this message. Please try again shortly.");
      return;
    }

    // Ödeme gerekiyorsa prepared value kontrolü
  const needsPayment = hasPaymentCondition;
    const preparedValue = preparedRequest?.value as bigint | undefined;
    console.log("🧪 preflight payment check", {
      needsPayment,
      requiredPaymentAmount: requiredPaymentAmount?.toString(),
      preparedValue: preparedValue?.toString()
    });
    if (needsPayment) {
      const paymentQuote = requiredPaymentAmount as bigint;
      if (!preparedValue || preparedValue < paymentQuote) {
        setDecryptError("Payment value not attached yet. Please wait a second and retry.");
        console.error("❌ Prepared request has no/insufficient value", { preparedValue: preparedValue?.toString(), required: paymentQuote.toString() });
        return;
      }

      // ÖNCE simulate ile handle'ı al (state değişmeden, payment koşulu ile)
      try {
        if (!client || !userAddress || !contractAddress) throw new Error('Missing client/account/address');
        console.log('🔬 Simulating readMessage to capture handle before payment...');
        const sim = await client.simulateContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi as any,
          functionName: 'readMessage',
          args: [id],
          account: userAddress as `0x${string}`,
          value: paymentQuote
        });
        console.log('✅ Simulate result (handle captured)');
        setPrefetchedHandle(sim.result as unknown);
      } catch (e) {
        const msg = toReadableError(e);
        console.error('❌ simulateContract failed:', e);
        if (msg.includes('Payment already claimed')) {
          setDecryptError('Payment was already claimed on-chain. You can only decrypt from the device that unlocked it. If needed, ask the sender to resend.');
          return;
        }
        if (msg.includes('Time locked')) {
          setDecryptError('Time lock is still active. Please wait for the unlock time, then try again.');
          return;
        }
        // One quick retry in case prepare state just updated
        await new Promise((r) => setTimeout(r, 1200));
        try {
          console.log('🔁 Retrying simulation...');
          const sim2 = await client.simulateContract({
            address: contractAddress,
            abi: chronoMessageZamaAbi as any,
            functionName: 'readMessage',
            args: [id],
            account: userAddress as `0x${string}`,
            value: paymentQuote
          });
          console.log('✅ Simulate retry success (handle captured)');
          setPrefetchedHandle(sim2.result as unknown);
        } catch (e2) {
          console.error('❌ simulateContract retry failed, aborting:', e2);
          setDecryptError(`Simulation failed: ${toReadableError(e2)}`);
          return;
        }
      }
    } else {
      setPrefetchedHandle(null);
    }

    setDecryptError(null);
    console.log("✅ Reading message...");
    console.log("💰 Payment info:", {
      hasPaymentCondition: needsPayment,
      requiredPayment: requiredPaymentAmount?.toString(),
      preparedValue: preparedValue?.toString(),
      preparedConfig: preparedReadConfig
    });
    readMessage();
  };

  // Countdown Timer
  const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = Number(unlockTime) - now;
        
        if (diff <= 0) {
          setTimeLeft("0");
          return;
        }

        const duration = dayjs.duration(diff, 'seconds');
        const days = Math.floor(duration.asDays());
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, []);

    return <span className="font-mono text-sm text-green-400">{timeLeft}</span>;
  };

  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className={`
        animate-in fade-in slide-in-from-bottom duration-500
        rounded-xl border p-5 transition-all hover:scale-[1.02] hover:shadow-xl
        ${isSent 
          ? 'border-blue-600/50 bg-gradient-to-br from-blue-900/30 to-blue-800/10' 
          : localUnlocked
          ? 'border-green-600/50 bg-gradient-to-br from-green-900/30 to-emerald-800/10'
          : 'border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-800/30'
        }
      `}
    >
      <div className="space-y-3">
        {/* Başlık: Mesaj ID ve Koşul Tipi */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-slate-400">#{id.toString()}</div>
            {headerBadges.map((badge) => (
              <div
                key={badge.key}
                className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.className}`}
              >
                {badge.label}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isSent && (
              <div className={`
                px-2 py-1 rounded-full text-xs font-semibold
                ${localUnlocked 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }
              `}>
                {localUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
              </div>
            )}
            {onHide && (
              <button
                onClick={onHide}
                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-all text-xs"
                title="Hide message"
              >
                ✖️
              </button>
            )}
          </div>
        </div>
        
        {isSent ? (
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">📤 Receiver</p>
            <p className="font-mono text-xs text-slate-300 break-all">{receiver}</p>
            
            {/* Dosya indicator - gönderici tarafı */}
            {(() => {
              try {
                const cached = localStorage.getItem(`${cacheKey}-content-${id}`);
                if (cached && cached.startsWith('F:')) {
                  // Short hash'ten full hash'i bul
                  const shortHash = cached.substring(2, 8);
                  const fullHash = localStorage.getItem(`file-metadata-${shortHash}`);
                  return (
                    <div className="mt-2 p-2 rounded-lg bg-purple-900/20 border border-purple-400/30">
                      <p className="text-xs text-purple-300 flex items-center gap-1">
                        <span>📎</span> File attached (hash: {shortHash}...)
                      </p>
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
            
            <p className="text-xs text-blue-200/60 mt-1">
              <span>🔒</span> Only receiver can view
            </p>

            {sentPreviewInfo?.payload && (
              <div className="mt-3 rounded-lg border border-blue-400/40 bg-blue-900/20 p-3 space-y-2">
                <div className="text-xs font-semibold text-blue-200 flex items-center gap-2">
                  <span>✉️</span>
                  <span>Message preview</span>
                </div>
                <p className="text-sm text-blue-100 whitespace-pre-wrap break-words">
                  {sentPreviewInfo.original && sentPreviewInfo.original.trim().length > 0
                    ? sentPreviewInfo.original
                    : sentPreviewInfo.payload}
                </p>
                {sentPreviewInfo.truncated && (
                  <p className="text-xs text-amber-300/80">
                    ⚠️ Content truncated to 32 UTF-8 bytes for on-chain encryption.
                  </p>
                )}
                <p className="text-xs text-slate-400 break-words">
                  Encrypted payload stored as: {" "}
                  <code className="font-mono text-blue-200">{sentPreviewInfo.payload}</code>
                </p>
              </div>
            )}

            {sentPreviewInfo?.fileMetadata && (
              <div className="mt-3 rounded-lg border border-purple-500/40 bg-purple-900/20 p-3 space-y-2">
                <div className="text-xs font-semibold text-purple-200 flex items-center gap-2">
                  <span>📎</span>
                  <span>Attached file summary</span>
                </div>
                <div className="text-xs text-purple-200 space-y-1">
                  {sentPreviewInfo.fileMetadata.fileName && (
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400/70 min-w-[70px]">Name:</span>
                      <span className="font-mono break-all">{sentPreviewInfo.fileMetadata.fileName}</span>
                    </div>
                  )}
                  {typeof sentPreviewInfo.fileMetadata.fileSize === 'number' && sentPreviewInfo.fileMetadata.fileSize > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400/70 min-w-[70px]">Size:</span>
                      <span>
                        {(sentPreviewInfo.fileMetadata.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                  {sentPreviewInfo.fileMetadata.mimeType && (
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400/70 min-w-[70px]">Type:</span>
                      <span>{sentPreviewInfo.fileMetadata.mimeType}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-purple-300/70">
                  Store this info if you need to resend or audit the attachment later.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-1">📥 Sender</p>
            <p className="font-mono text-xs text-slate-400 break-all">{sender}</p>
          </div>
        )}
        
        <div className="border-t border-slate-700/50 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Lock:</span>
            <span className="text-slate-300">{unlockDate}</span>
          </div>
          {!localUnlocked && !isSent && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Time left:</span>
              <CountdownTimer />
            </div>
          )}
          
          {/* Unlock requirement summary */}
          {(metadataLoaded || conditionType !== undefined) && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Unlock Requirements:</span>
                <span className="font-semibold text-slate-300">
                  {metadataLoaded
                    ? hasTimeCondition && hasPaymentCondition
                      ? 'Time lock + payment'
                      : hasTimeCondition
                        ? 'Time lock'
                        : hasPaymentCondition
                          ? 'Payment only'
                          : 'None'
                    : fallbackHasTime && fallbackHasPayment
                      ? 'Time lock + payment'
                      : fallbackHasTime
                        ? 'Time lock'
                        : fallbackHasPayment
                          ? 'Payment only'
                          : 'None'}
                </span>
              </div>
            </div>
          )}
          
          {/* Transaction Hash - Mesaj gönderimi */}
          {transactionHash && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 shrink-0">📝 Sent TX:</span>
                <a 
                  href={`${chain?.blockExplorers?.default?.url || 'https://sepolia.etherscan.io'}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-400 hover:text-blue-300 underline break-all"
                  title={transactionHash}
                >
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </a>
              </div>
            </div>
          )}
          
          {/* Payment Transaction Hash - Ödeme yapıldıysa */}
          {paymentTxHash && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <div className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 shrink-0">💰 Payment TX:</span>
                <a 
                  href={`${chain?.blockExplorers?.default?.url || 'https://sepolia.etherscan.io'}/tx/${paymentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-green-400 hover:text-green-300 underline break-all"
                  title={paymentTxHash}
                >
                  {paymentTxHash.slice(0, 10)}...{paymentTxHash.slice(-8)}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className={`
        mt-4 rounded-lg border p-4 text-sm
        ${isSent 
          ? 'border-blue-800/30 bg-blue-950/40' 
          : localUnlocked
          ? 'border-green-800/30 bg-green-950/40'
          : 'border-slate-800/30 bg-slate-950/60'
        }
      `}>
        {!isSent && (
          <div className="mb-4 rounded-lg border border-slate-800/40 bg-slate-900/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span>📦</span>
                <span>Message Summary</span>
              </div>
              <div className={`text-sm font-semibold ${paymentBadgeClass}`}>
                {paymentDisplay ?? "Loading payment info..."}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {metadataLoaded
                ? paymentIsFree
                  ? "No payment is required to read this message."
                  : `You must pay ${paymentDisplay} to open this message.`
                : "Loading payment info..."}
            </div>
            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <span>📎</span>
                <span>Attachment Details</span>
              </div>
              {isLoadingPreviewMeta ? (
                <p className="text-xs text-slate-500 animate-pulse">Loading attachment preview...</p>
              ) : hasAnyPreviewInfo ? (
                <div className="space-y-2 text-sm text-slate-300">
                  {fileNameLabel && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 min-w-[70px]">File name:</span>
                      <span className="break-all">{fileNameLabel}</span>
                    </div>
                  )}
                  {fileSizeLabel && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 min-w-[70px]">Size:</span>
                      <span>{fileSizeLabel}</span>
                    </div>
                  )}
                  {contentTypeLabel && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 min-w-[70px]">Type:</span>
                      <span className="break-all">{contentTypeLabel}</span>
                    </div>
                  )}
                  {previewImageUrl && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                        <span>🖼️</span>
                        <span>Preview</span>
                      </p>
                      <img
                        src={previewImageUrl}
                        alt="Attachment preview"
                        className="max-w-full h-auto rounded-md border border-slate-700/60"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No attachment metadata available.</p>
              )}
            </div>
          </div>
        )}
        
        {/* 🔐 Unlock Button - Kilitli mesajlar için */}
        {!isSent && !localUnlocked && (
          <div className="mb-4">
            <button
              onClick={() => {
                if (readMessage && timeReady && paymentReady) {
                  readMessage();
                } else {
                  handleReadClick();
                }
              }}
              disabled={isReading || isConfirming || !isFheReady}
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 
                text-white font-semibold transition-all transform hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center justify-center gap-2 shadow-lg"
            >
              {isReading || isConfirming ? (
                <>
                  <span className="animate-spin">⟳</span>
                  {isReading ? "Preparing..." : "Awaiting confirmation..."}
                </>
              ) : !metadataLoaded ? (
                <>
                  <span className="animate-pulse">⏳</span>
                  Loading metadata...
                </>
              ) : !timeReady ? (
                <>
                  <span>⏳</span>
                  Time lock still active
                </>
              ) : (
                <>
                  <span>🔓</span>
                  {paymentRequirementLabel
                    ? `Open Message (${paymentRequirementLabel})`
                    : "Open Message"}
                </>
              )}
            </button>
            {decryptError && (
              <p className="text-xs text-red-400 mt-2">{decryptError}</p>
            )}
          </div>
        )}
        
        {isSent ? (
          <div>
            <p className="italic text-blue-300/70 flex items-center gap-2 mb-3">
              <span>🚫</span> You cannot view the message you sent.
            </p>
            
            {/* Dosya indicator - gönderici tarafı */}
            {(() => {
              try {
                const cached = localStorage.getItem(`${cacheKey}-content-${id}`);
                if (cached && cached.startsWith('F:')) {
                  // Short hash'ten full hash'i bul
                  const shortHash = cached.substring(2, 8);
                  const fullHash = localStorage.getItem(`file-metadata-${shortHash}`);
                  return (
                    <div className="mt-2 p-2 rounded-lg bg-purple-900/20 border border-purple-400/30">
                      <p className="text-xs text-purple-300 flex items-center gap-1">
                        <span>📎</span> File attached (hash: {shortHash}...)
                      </p>
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
          </div>
        ) : localUnlocked ? (
          <div className="space-y-2">
            {localIsRead && !messageContent && isLoadingContent ? (
              // Okunan mesaj yükleniyor
              <div className="text-slate-400 italic flex items-center gap-2">
                <span className="animate-spin">⟳</span> Loading content...
              </div>
            ) : !localIsRead ? (
              // Henüz okunmamış, uyarı + butonu göster
              <>
                {/* File warning - Unlocked but not read yet */}
                {contentType === 1 && (
                  <div className="mb-3 rounded-lg bg-purple-900/20 border border-purple-400/40 p-3">
                    <p className="text-xs text-purple-300 italic flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Verify sender before opening the file. Sender: <code className="font-mono text-purple-200">{sender.substring(0, 10)}...{sender.substring(sender.length - 8)}</code></span>
                    </p>
                  </div>
                )}
                
                <button
                  onClick={handleReadClick}
                  disabled={isReading || isConfirming || isLoadingContent || !isFheReady}
                  className="w-full text-left px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 
                    border border-green-500/30 text-green-300 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReading || isConfirming || isLoadingContent ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span> 
                      {isLoadingContent ? "Loading content..." : "Reading..."}
                    </span>
                  ) : !isFheReady ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-pulse">⏳</span> 
                      FHE system loading...
                    </span>
                  ) : (
                    <span className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-left">
                      <span className="flex items-center gap-2 text-sm">
                        <span>🔓</span>
                        Read Message
                      </span>
                      {paymentRequirementLabel ? (
                        <span className="text-xs text-green-200/80">
                          Requires {paymentRequirementLabel} to open.
                        </span>
                      ) : (
                        <span className="text-xs text-green-200/80">No payment required.</span>
                      )}
                    </span>
                  )}
                </button>
              </>
            ) : messageContent ? (
              // İçerik yüklenmiş, göster
              <div className="space-y-2">
                {messageContent.startsWith('FILE:') || messageContent.startsWith('F:') ? (
                  // Dosya metadata göster
                  isLoadingFileMetadata ? (
                    <div className="text-slate-400 italic flex items-center gap-2">
                      <span className="animate-spin">⟳</span> Loading file metadata...
                    </div>
                  ) : fileMetadataState?.error ? (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-yellow-900/10 border border-yellow-400/20 p-3">
                        <p className="text-sm text-yellow-300">File metadata could not be found.</p>
                        <p className="text-xs text-yellow-400 font-mono break-all">Short: {fileMetadataState.shortHash ?? messageContent?.substring(2, 8)}</p>
                        <p className="text-xs text-yellow-400">If the sender&apos;s device does not have the mapping, try the options below.</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={async () => {
                              setIsLoadingFileMetadata(true);
                              try {
                                const fallbackContent = messageContent ?? '';
                                const sh = fileMetadataState.shortHash ?? (fallbackContent.startsWith('F:') ? fallbackContent.substring(2).trim().substring(0, 6) : undefined);
                                if (!sh) {
                                  setFileMetadataState({ error: true, message: 'Short hash not available' });
                                  setIsLoadingFileMetadata(false);
                                  return;
                                }
                                const resolved = await tryResolveShortHash(sh);
                                if (resolved) {
                                  try { localStorage.setItem(`file-metadata-${sh}`, resolved); } catch {}
                                  const resp = await fetch(`/api/ipfs/${resolved}`);
                                  if (resp.ok) {
                                    const d = await resp.json();
                                    const normalized = normaliseMetadataPayload(d, { shortHash: sh, fullHash: resolved });
                                    setFileMetadataState(normalized);
                                  } else {
                                    setFileMetadataState({ error: true, message: 'Resolved but fetch failed' });
                                  }
                                } else {
                                  setFileMetadataState({ error: true, message: 'Could not resolve short hash' });
                                }
                              } catch (e) {
                                setFileMetadataState({ error: true, message: String(e) });
                              } finally {
                                setIsLoadingFileMetadata(false);
                              }
                            }}
                            className="px-3 py-2 rounded bg-yellow-600/10 border border-yellow-500/20 text-yellow-200 text-sm"
                          >
                            Try resolve
                          </button>
                          <a
                            href={`https://app.pinata.cloud/search?query=${encodeURIComponent(fileMetadataState.shortHash ?? messageContent?.substring(2,8) ?? '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded bg-yellow-600/10 border border-yellow-500/20 text-yellow-200 text-sm"
                          >
                            Open Pinata
                          </a>
                        </div>
                        {fileMetadataState.message && (
                          <p className="text-xs text-yellow-300/70 mt-2">{fileMetadataState.message}</p>
                        )}
                      </div>
                    </div>
                  ) : fileMetadataState ? (
                    fileMetadataState.type === 'text' ? (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-slate-800/50 border border-slate-600/30 p-3">
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">
                            {fileMetadataState.message ?? 'No message content available.'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-blue-900/20 border border-blue-400/40 p-3 text-xs text-blue-100 space-y-2">
                          <div>
                            <span className="font-semibold">Storage pattern:</span> Content stored via encrypted metadata.
                          </div>
                          <div className="flex flex-col gap-1">
                            <span>
                              Short hash:
                              <code className="ml-2 font-mono text-blue-200">{fileMetadataState.shortHash ?? messageContent?.substring(2, 8)}</code>
                            </span>
                            {fileMetadataState.fullHash && (
                              <span className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span>Metadata hash:</span>
                                <code className="font-mono text-blue-200 break-all">{fileMetadataState.fullHash}</code>
                              </span>
                            )}
                            {fileMetadataState.createdAt && dayjs(fileMetadataState.createdAt).isValid() && (
                              <span>
                                Uploaded:
                                <span className="ml-2">
                                  {dayjs(fileMetadataState.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Güvenlik Uyarısı */}
                        <div className="rounded-lg bg-red-900/20 border border-red-400/40 p-3">
                          <p className="text-xs text-red-300 font-semibold flex items-center gap-2 mb-2">
                            <span>🛡️</span> Security Warning
                          </p>
                          <ul className="text-xs text-red-200 space-y-1">
                            <li>⚠️ <strong>Verify the sender address:</strong></li>
                            <li className="font-mono text-xs bg-red-950/40 px-2 py-1 rounded ml-4 break-all">
                              {sender}
                            </li>
                            <li>🦠 Scan the file for malware before downloading.</li>
                            <li>❌ Do not open files from unknown or untrusted sources.</li>
                          </ul>
                        </div>
                        
                        {/* Mesaj varsa göster */}
                        {fileMetadataState.message && (
                          <div className="rounded-lg bg-slate-800/50 border border-slate-600/30 p-3">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{fileMetadataState.message}</p>
                          </div>
                        )}
                        
                        {/* Dosya Bilgileri */}
                        <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-purple-300 font-semibold">
                            <span>📎</span> Attached File
                          </div>
                          
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400/70 min-w-[60px]">File name:</span>
                              <span className="text-purple-200 break-all font-mono">{fileMetadataState.name ?? 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400/70 min-w-[60px]">Size:</span>
                              <span className="text-purple-200">
                                {typeof fileMetadataState.size === 'number' && Number.isFinite(fileMetadataState.size)
                                  ? `${(fileMetadataState.size / 1024 / 1024).toFixed(2)} MB`
                                  : 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400/70 min-w-[60px]">Type:</span>
                              <span className="text-purple-200">{fileMetadataState.mimeType ?? 'Unknown'}</span>
                            </div>
                          </div>
                          
                          {/* Resim önizlemesi */}
                          {fileMetadataState.mimeType?.startsWith('image/') && fileMetadataState.ipfs && (
                            <div className="pt-3 border-t border-purple-400/30">
                              <p className="text-xs text-purple-400 mb-2">Preview:</p>
                              <img 
                                src={`/api/ipfs/${fileMetadataState.ipfs}`}
                                alt={fileMetadataState.name ?? 'Attachment preview'}
                                className="max-w-full h-auto rounded border border-purple-400/30 max-h-64 object-contain"
                                loading="lazy"
                              />
                            </div>
                          )}
                          
                          {/* İndirme Butonu */}
                          <div className="pt-3 border-t border-purple-400/30">
                            {fileMetadataState.ipfs ? (
                              <>
                                <a
                                  href={`/api/ipfs/${fileMetadataState.ipfs}`}
                                  download={fileMetadataState.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-full text-center px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 
                                border border-purple-500/30 text-purple-200 transition-colors text-sm"
                                >
                                  📥 Download File
                                </a>
                                <p className="text-xs text-purple-300/60 mt-2 text-center">
                                  ⚠️ Scan for malware before opening the download.
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-purple-300/70 text-center">
                                Unable to locate the file hash in metadata. Ask the sender to re-share the attachment.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ) : null
                ) : contentType === 1 ? (
                  <IPFSFileDisplay metadataHash={messageContent} />
                ) : (
                  <p className="text-slate-200 whitespace-pre-wrap">{messageContent}</p>
                )}
                {localIsRead && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span>✓</span> Read
                  </p>
                )}
              </div>
            ) : null}
            {decryptError && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-200">
                {decryptError}
              </div>
            )}
          </div>
        ) : (
          // Mesaj henüz unlock olmamış
          <div className="space-y-3">
            {!isSent && previewDataUrl && (
              <div className="rounded-lg border border-purple-400/50 bg-purple-900/30 p-3 flex items-center gap-3">
                <img
                  src={previewDataUrl}
                  alt="Attachment preview"
                  className="h-16 w-16 rounded border border-purple-500/40 object-cover"
                />
                <div className="text-xs text-purple-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <span>🖼️</span>
                    <span>Low-res preview</span>
                  </p>
                  <p className="text-purple-200/70">
                    Full image unlocks once the timer finishes.
                  </p>
                </div>
              </div>
            )}
            {!isSent && !previewDataUrl && isLoadingPreview && (
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                Preparing preview...
              </p>
            )}
            {!isSent && previewError && !previewDataUrl && !isLoadingPreview && (
              <p className="text-xs text-slate-500 italic">{previewError}</p>
            )}
            {/* File Preview - localStorage'dan veya contentType'dan kontrol */}
            {(() => {
              // Önce localStorage'a bak (gönderici için)
              try {
                const cached = localStorage.getItem(`${cacheKey}-content-${id}`);
                if (cached && cached.startsWith('FILE:')) {
                  return (
                    <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-purple-300">
                        <span>📎</span>
                        <span className="font-semibold">Attached File</span>
                      </div>
                      <p className="text-xs text-purple-200 italic">
                        {isSent 
                          ? "You attached a file to this message."
                          : "⚠️ This message includes a file. Confirm the sender before unlocking."
                        }
                      </p>
                      {!isSent && (
                        <div className="text-xs text-slate-300 space-y-1">
                          <div>
                            <span className="text-slate-500">Sender:</span>{' '}
                            <code className="font-mono text-purple-200">
                              {sender.substring(0, 10)}...{sender.substring(sender.length - 8)}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              } catch {}
              
              // contentType kontrolü (eski sistem)
              if (contentType === 1) {
                return (
                  <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-purple-300">
                      <span>📎</span>
                      <span className="font-semibold">File Attached</span>
                    </div>
                    <p className="text-xs text-purple-200 italic">
                      ⚠️ This message contains a file. Verify the sender before unlocking and opening.
                    </p>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div>
                        <span className="text-slate-500">Sender:</span>{' '}
                        <code className="font-mono text-purple-200">
                          {sender.substring(0, 10)}...{sender.substring(sender.length - 8)}
                        </code>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
            {canUnlockWithPayment ? (
              // Payment-locked mesaj için unlock butonu (Zama'da yok)
              <button
                onClick={() => unlockWithPayment?.()}
                disabled={isPaymentPending || isPaymentConfirming || !unlockWithPayment}
                className="w-full text-left px-4 py-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 
                  border-2 border-cyan-400/50 text-cyan-300 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isPaymentPending || isPaymentConfirming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span> 
                    {isPaymentPending ? "Confirming payment..." : "Processing..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    💰 Pay {formatPaymentAmount(requiredPayment, { zeroLabel: "0 ETH" })} to Unlock
                  </span>
                )}
              </button>
            ) : (
              // Time-locked mesaj
              <div className="space-y-3">
                <p className="text-slate-400 italic flex items-center gap-2">
                  <span>⏳</span> Message is still locked
                </p>
                
                {/* �📋 Preview Metadata (if available) */}
                {isLoadingPreviewMeta && (
                  <div className="text-slate-500 text-sm animate-pulse">Loading preview...</div>
                )}
                {previewMetadata && (previewMetadata.fileName || previewMetadata.fileSize > 0n) && (
                  <div className="hidden bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                      📋 Preview Information
                    </div>
                    {previewMetadata.fileName && (
                      <div className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-slate-500">📄 File:</span>
                        <span className="break-all">{previewMetadata.fileName}</span>
                      </div>
                    )}
                    {previewMetadata.fileSize > 0n && (
                      <div className="text-slate-400 text-sm flex items-center gap-2">
                        <span className="text-slate-500">📊 Size:</span>
                        <span>{(Number(previewMetadata.fileSize) / 1024).toFixed(2)} KB</span>
                      </div>
                    )}
                    {previewMetadata.contentType && (
                      <div className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-slate-500">🔖 Type:</span>
                        <span className="break-all">{previewMetadata.contentType}</span>
                      </div>
                    )}
                    {previewMetadata.previewImageHash && (
                      <div className="mt-2">
                        <img 
                          src={`/api/ipfs/${previewMetadata.previewImageHash}`} 
                          alt="Preview" 
                          className="rounded border border-slate-600 max-w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
