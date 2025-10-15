"use client";

import { useState, useEffect, useCallback } from "react";
import { useContractWrite, useWaitForTransaction, usePublicClient, useAccount, usePrepareContractWrite, useWalletClient } from "wagmi";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { chronoMessageZamaAbi } from "../lib/abi-zama";
import { appConfig } from "../lib/env";
import { useContractAddress } from "../lib/useContractAddress";
import { useNetwork } from "wagmi";
import { IPFSFileDisplay } from "./IPFSFileDisplay";
import { useFhe, useFheStatus } from "./FheProvider";

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
    const printable = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
    return printable.trim().length > 0 ? raw.trimEnd() : "";
  } catch (err) {
    console.error("⚠️ ASCII decode failed", err);
    return "";
  }
};

const formatBigintContent = (value: bigint): string => {
  const bytes = new Uint8Array(8);
  let working = value;
  for (let cursor = 7; cursor >= 0; cursor--) {
    bytes[cursor] = Number(working & 0xffn);
    working >>= 8n;
  }
  const decoded = decodeAscii(bytes);
  if (decoded) {
    return decoded;
  }
  return `0x${value.toString(16).padStart(16, "0")}`;
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
  // localStorage'dan initial state yükle
  const [messageContent, setMessageContent] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`msg-content-${id}`) || null;
  });
  const [fileMetadataState, setFileMetadataState] = useState<any>(null);
  const [isLoadingFileMetadata, setIsLoadingFileMetadata] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`msg-expanded-${id}`) === 'true';
  });
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState(unlocked);
  const [localIsRead, setLocalIsRead] = useState(() => {
    if (typeof window === 'undefined') return isRead;
    return localStorage.getItem(`msg-read-${id}`) === 'true' || isRead;
  });
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPollAttempts, setPreviewPollAttempts] = useState(0);
  const [previewPollingDisabled, setPreviewPollingDisabled] = useState(false);
  const fhe = useFhe();
  const { isLoading: isFheLoading, isReady: isFheReady } = useFheStatus();
  const client = usePublicClient();
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const contractAddress = useContractAddress();
  const { chain } = useNetwork();

  useEffect(() => {
    setPreviewPollAttempts(0);
    setPreviewPollingDisabled(false);
    setPreviewDataUrl(null);
    setPreviewError(null);
  }, [id]);

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
      return true;
    }
    try {
      const metadata = await client.readContract({
        address: contractAddress,
        abi: chronoMessageZamaAbi as any,
        functionName: "getMessageMetadata",
        args: [id]
      }) as [string, string, bigint, boolean];

      const onchainUnlocked = Boolean(metadata[3]);
      if (onchainUnlocked && !localUnlocked) {
        setLocalUnlocked(true);
      }
      if (!onchainUnlocked && localUnlocked) {
        setLocalUnlocked(false);
      }
      return onchainUnlocked;
    } catch (err) {
      console.warn("⚠️ On-chain unlock check failed", err);
      return true;
    }
  }, [client, contractAddress, id, isSent, localUnlocked]);

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

    // Zama returns euint64 as bigint
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
          setFileMetadataState(data);
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
      let ciphertext: string | null = null;
      try {
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi as any,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        }) as unknown as string;

        ciphertext = content;
        const decrypted = await decryptCiphertext(content);
        setMessageContent(decrypted);
        setIsExpanded(true);
        setLocalUnlocked(true);
        setLocalIsRead(true);
        
        // ✅ localStorage'a kaydet
        localStorage.setItem(`msg-content-${id}`, decrypted);
        localStorage.setItem(`msg-read-${id}`, 'true');
        localStorage.setItem(`msg-expanded-${id}`, 'true');
        // Debug: record received decrypted
        try {
          const entry = {
            ts: Date.now(),
            type: 'received-decrypted',
            id: id.toString(),
            decrypted,
            ciphertext: String(ciphertext?.toString?.() ?? ciphertext)
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
        const fallback = ciphertext ?? "⚠️ Encrypted payload unavailable";
        setMessageContent(fallback);
        setDecryptError(`Unable to decrypt message: ${toReadableError(err)}`);
      } finally {
        setIsLoadingContent(false);
      }
    };
    
    loadContentIfRead();
  }, [isRead, isSent, localUnlocked, client, userAddress, id, messageContent, contractAddress, fhe, isFheReady, decryptCiphertext]);

  // readMessage transaction
  const { data: txData, isLoading: isReading, write: readMessage } = useContractWrite({
    address: contractAddress,
    abi: chronoMessageZamaAbi,
    functionName: "readMessage" as any, // Type issue - will be fixed
    args: [id]
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: txData?.hash
  });

  // Transaction başarılı olunca içeriği çek
  useEffect(() => {
    const fetchContent = async () => {
      if (!isSuccess || !client || !userAddress || !contractAddress || !fhe) return;

      setIsLoadingContent(true);
      setDecryptError(null);

      await new Promise((resolve) => setTimeout(resolve, 3000)); // Gateway'in ACL'i güncellemesini bekle

      let handleValue: unknown = null;
      try {
        console.log('📡 Fetching handle after readMessage transaction...');
        
        // Transaction yaptık, şimdi handle'ı view call ile al
        const handle = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        });

        console.log('✅ Got handle:', handle);
        handleValue = handle;
        
        const decrypted = await decryptCiphertext(handle);
        setMessageContent(decrypted);
        setIsExpanded(true);
        setLocalIsRead(true);
        setLocalUnlocked(true);
        
        // localStorage cache
        localStorage.setItem(`msg-content-${id}`, decrypted);
        localStorage.setItem(`msg-read-${id}`, 'true');
        localStorage.setItem(`msg-expanded-${id}`, 'true');
        
        onMessageRead?.();
      } catch (err) {
        console.error("❌ Content could not be fetched:", err);
        const fallback = handleValue ? String(handleValue) : "⚠️ Content could not be loaded";
        setMessageContent(fallback);
        setDecryptError(`Unable to decrypt message: ${toReadableError(err)}`);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [isSuccess, client, id, onMessageRead, userAddress, contractAddress, fhe, decryptCiphertext]);

  // Payment success olduğunda içeriği yükle
  useEffect(() => {
    const fetchContentAfterPayment = async () => {
      if (!isPaymentSuccess || !client || !userAddress || !contractAddress || !fhe) return;
      
      setIsLoadingContent(true);
      setDecryptError(null);
      setLocalUnlocked(true);
      setLocalIsRead(true);
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      let ciphertext: string | null = null;
      try {
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        }) as unknown as string;

        ciphertext = content;
        const decrypted = await decryptCiphertext(content);
        setMessageContent(decrypted);
        setIsExpanded(true);
        onMessageRead?.(); // Parent'ı bilgilendir
      } catch (err) {
        console.error("❌ Content could not be fetched after payment:", err);
        const fallback = ciphertext ?? "⚠️ Content could not be loaded";
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
    if (!readMessage) {
      console.error("❌ readMessage function not available");
      return;
    }
    if (!isFheReady) {
      setDecryptError("FHE system is still loading. Please wait a moment and try again.");
      console.warn("⏳ FHE SDK not ready yet, isLoading:", isFheLoading);
      return;
    }

    const isActuallyUnlocked = await ensureOnchainUnlocked();
    if (!isActuallyUnlocked) {
      setDecryptError("Waiting for the next block to unlock this message. Please try again shortly.");
      return;
    }

    if (!localUnlocked) {
      setLocalUnlocked(true);
    }

    setDecryptError(null);
    console.log("✅ Reading message...");
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
          setTimeLeft(`${days}g ${hours}s ${minutes}d`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}s ${minutes}d ${seconds}sn`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}d ${seconds}sn`);
        } else {
          setTimeLeft(`${seconds}sn`);
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
            {/* Koşul Tipi Badge */}
            {conditionType !== undefined && (
              <div className={`
                px-2 py-0.5 rounded text-xs font-semibold
                ${conditionType === 0 
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' 
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30'
                }
              `}>
                {conditionType === 0 ? '⏰ TIME' : '💰 PAYMENT'}
              </div>
            )}
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
                const cached = localStorage.getItem(`msg-content-${id}`);
                if (cached && cached.startsWith('F:')) {
                  // Short hash'ten full hash'i bul
                  const shortHash = cached.substring(2, 8);
                  const fullHash = localStorage.getItem(`file-metadata-${shortHash}`);
                  return (
                    <div className="mt-2 p-2 rounded-lg bg-purple-900/20 border border-purple-400/30">
                      <p className="text-xs text-purple-300 flex items-center gap-1">
                        <span>📎</span> Dosya eklendi (hash: {shortHash}...)
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
              <span className="text-slate-400">Kalan:</span>
              <CountdownTimer />
            </div>
          )}
          
          {/* Ekli Dosya Göstergesi - Mesaj açılmadan önce */}
          {contentType === 1 && !localUnlocked && !isSent && (
            <div className="mt-3 pt-3 border-t border-purple-400/30">
              <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-3 space-y-2">
                <p className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <span>📎</span> Ekli Dosya
                </p>
                {fileMetadata && (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400/70">Dosya adı:</span>
                      <span className="font-mono text-purple-200 break-all">{fileMetadata.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400/70">Boyut:</span>
                      <span className="text-purple-200">{(fileMetadata.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400/70">Tip:</span>
                      <span className="text-purple-200">{fileMetadata.type}</span>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-purple-400/20">
                  <p className="text-xs text-purple-300/70 italic">
                    ⚠️ Verify sender before opening the file
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* V3 Ödeme Bilgisi */}
          {requiredPayment && requiredPayment > 0n && (
            <div className="mt-3 pt-3 border-t border-cyan-400/30">
              <p className="text-sm font-semibold text-cyan-400 mb-2">💰 Payment Condition</p>
              
              {/* Alıcı için ödeme talimatı */}
              {!isSent && !unlocked && (
                <div className="mb-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/40 space-y-2">
                  <p className="text-sm text-cyan-200">
                    📤 To unlock this message, send{' '}
                    <span className="font-mono text-yellow-400 font-bold">{(Number(requiredPayment) / 1e18).toFixed(4)} ETH</span>{' '}
                    to the following address:
                  </p>
                  <div className="pt-2 border-t border-cyan-400/30">
                    <p className="text-xs text-cyan-300 mb-1">Sender</p>
                    <p className="font-mono text-cyan-100 text-sm bg-midnight/60 px-3 py-2 rounded border border-cyan-400/30 break-all">
                      {sender}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Gerekli Ödeme:</span>
                <span className="font-mono text-yellow-400 font-semibold">
                  {(Number(requiredPayment) / 1e18).toFixed(4)} ETH
                </span>
              </div>
              {paidAmount !== undefined && paidAmount > 0n && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-400">✅ Ödenen:</span>
                  <span className="font-mono text-green-400 font-semibold">
                    {(Number(paidAmount) / 1e18).toFixed(4)} ETH
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Unlock Condition Type */}
          {conditionType !== undefined && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Unlock Type:</span>
                <span className={`font-semibold ${
                  conditionType === 0 ? 'text-neon-green' : 'text-cyan-400'
                }`}>
                  {conditionType === 0 ? '⏰ Time' :
                   conditionType === 1 ? '💰 Payment' :
                   '🔀 Hybrid (Deprecated)'}
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
        {isSent ? (
          <div>
            <p className="italic text-blue-300/70 flex items-center gap-2 mb-3">
              <span>🚫</span> You cannot view the message you sent.
            </p>
            
            {/* Dosya indicator - gönderici tarafı */}
            {(() => {
              try {
                const cached = localStorage.getItem(`msg-content-${id}`);
                if (cached && cached.startsWith('F:')) {
                  // Short hash'ten full hash'i bul
                  const shortHash = cached.substring(2, 8);
                  const fullHash = localStorage.getItem(`file-metadata-${shortHash}`);
                  return (
                    <div className="mt-2 p-2 rounded-lg bg-purple-900/20 border border-purple-400/30">
                      <p className="text-xs text-purple-300 flex items-center gap-1">
                        <span>📎</span> Dosya eklendi (hash: {shortHash}...)
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
                    <span>🔓 Click to read message</span>
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
                      <span className="animate-spin">⟳</span> Dosya bilgileri yükleniyor...
                    </div>
                  ) : fileMetadataState?.error ? (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-yellow-900/10 border border-yellow-400/20 p-3">
                        <p className="text-sm text-yellow-300">Dosya metadata bulunamadı.</p>
                        <p className="text-xs text-yellow-400 font-mono break-all">Short: {fileMetadataState.shortHash ?? messageContent?.substring(2, 8)}</p>
                        <p className="text-xs text-yellow-400">Gönderen cihazda mapping yoksa, aşağıdaki seçeneklerle çözmeyi deneyebilirsiniz.</p>
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
                                    setFileMetadataState(d);
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
                    <div className="space-y-3">
                      {/* Güvenlik Uyarısı */}
                      <div className="rounded-lg bg-red-900/20 border border-red-400/40 p-3">
                        <p className="text-xs text-red-300 font-semibold flex items-center gap-2 mb-2">
                          <span>🛡️</span> Güvenlik Uyarısı
                        </p>
                        <ul className="text-xs text-red-200 space-y-1">
                          <li>⚠️ <strong>Gönderen adresini teyit edin:</strong></li>
                          <li className="font-mono text-xs bg-red-950/40 px-2 py-1 rounded ml-4 break-all">
                            {sender}
                          </li>
                          <li>🦠 Dosyayı indirmeden önce virüs taraması yapın</li>
                          <li>❌ Bilinmeyen kaynaklardan gelen dosyaları açmayın</li>
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
                          <span>📎</span> Ekli Dosya
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="text-purple-400/70 min-w-[60px]">Dosya adı:</span>
                            <span className="text-purple-200 break-all font-mono">{fileMetadataState.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-purple-400/70 min-w-[60px]">Boyut:</span>
                            <span className="text-purple-200">{(fileMetadataState.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-purple-400/70 min-w-[60px]">Tip:</span>
                            <span className="text-purple-200">{fileMetadataState.mimeType}</span>
                          </div>
                        </div>
                        
                        {/* Resim önizlemesi */}
                        {fileMetadataState.mimeType?.startsWith('image/') && (
                          <div className="pt-3 border-t border-purple-400/30">
                            <p className="text-xs text-purple-400 mb-2">Önizleme:</p>
                            <img 
                              src={`/api/ipfs/${fileMetadataState.ipfs}`}
                              alt={fileMetadataState.name}
                              className="max-w-full h-auto rounded border border-purple-400/30 max-h-64 object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}
                        
                        {/* İndirme Butonu */}
                        <div className="pt-3 border-t border-purple-400/30">
                          <a
                            href={`/api/ipfs/${fileMetadataState.ipfs}`}
                            download={fileMetadataState.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 
                              border border-purple-500/30 text-purple-200 transition-colors text-sm"
                          >
                            📥 Dosyayı İndir
                          </a>
                          <p className="text-xs text-purple-300/60 mt-2 text-center">
                            ⚠️ İndirmeden önce virüs taraması yapın
                          </p>
                        </div>
                      </div>
                    </div>
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
                const cached = localStorage.getItem(`msg-content-${id}`);
                if (cached && cached.startsWith('FILE:')) {
                  return (
                    <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-purple-300">
                        <span>📎</span>
                        <span className="font-semibold">Ekli Dosya</span>
                      </div>
                      <p className="text-xs text-purple-200 italic">
                        {isSent 
                          ? "Bu mesaja dosya eklediniz."
                          : "⚠️ Bu mesajda dosya var. Açmadan önce göndereni teyit edin."
                        }
                      </p>
                      {!isSent && (
                        <div className="text-xs text-slate-300 space-y-1">
                          <div>
                            <span className="text-slate-500">Gönderen:</span>{' '}
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
                    💰 Pay {requiredPayment ? (Number(requiredPayment) / 1e18).toFixed(4) : '0'} ETH to Unlock
                  </span>
                )}
              </button>
            ) : (
              // Time-locked mesaj
              <p className="text-slate-400 italic flex items-center gap-2">
                <span>⏳</span> Message is still locked
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
