"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import { usePublicClient, useAccount, useNetwork } from "wagmi";
import type { PublicClient } from "viem";
import { chronoMessageV2Abi } from "../lib/abi-v2";
import { chronoMessageV3_2Abi } from "../lib/abi-v3.2";
import { appConfig } from "../lib/env";
import { useContractAddress, useHasContract } from "../lib/useContractAddress";
import { MessageCard } from "./MessageCard";
import { useVersioning } from "./VersionProvider";

dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

interface MessageListProps {
  refreshKey?: number;
}

interface MessageViewModel {
  id: bigint;
  sender: string;
  receiver: string;
  unlockTime: bigint;
  unlockDate: string;
  relative: string;
  unlocked: boolean;
  content: string | null;
  isRead: boolean;
  isSent: boolean;
  timestamp?: bigint; // Mesajın gönderilme zamanı
  transactionHash?: string; // İşlem hash'i (mesaj gönderilirken)
  // V3 ödeme bilgileri
  requiredPayment?: bigint;
  paidAmount?: bigint;
  conditionType?: number; // 0: TIME_LOCK, 1: PAYMENT
  paymentTxHash?: string; // Ödeme yapıldığında transaction hash
  // Dosya desteği
  contentType?: number; // 0: TEXT, 1: IPFS_HASH, 2: ENCRYPTED
  fileMetadata?: {
    name: string;
    size: number;
    type: string;
  };
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

async function fetchMessage(
  client: PublicClient,
  contractAddress: `0x${string}`,
  contractAbi: any, // Type union çok karmaşık, any kullan
  id: bigint,
  userAddress: string,
  account?: `0x${string}`,
  isV3?: boolean // V3 contract mu?
): Promise<MessageViewModel | null> {
  try {
    const result = await client.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getMessageMetadata",
      args: [id],
      account: account // Kullanıcı adresini msg.sender olarak gönder
    });

    let sender: string, receiver: string, unlockTime: bigint, isRead: boolean;
    let requiredPayment: bigint | undefined;
    let paidAmount: bigint | undefined;
    let conditionType: number | undefined;
    let timestamp: bigint | undefined;
    let contentType: number | undefined;

    if (isV3) {
      // V3: Tuple (struct) olarak döner
      const metadata = result as any;
      sender = metadata.sender ?? metadata[0];
      receiver = metadata.receiver ?? metadata[1];
      unlockTime = metadata.unlockTime ?? metadata[2] ?? 0n; // 0n fallback
      requiredPayment = metadata.requiredPayment ?? metadata[3];
      paidAmount = metadata.paidAmount ?? metadata[4];
      conditionType = metadata.conditionType !== undefined ? metadata.conditionType : metadata[5];
      contentType = metadata.contentType !== undefined ? metadata.contentType : metadata[6]; // 6. index
      isRead = metadata.isRead ?? metadata[7]; // 7. index
      timestamp = metadata.timestamp ?? metadata[8]; // timestamp son alan (index 8)
      console.log('📦 V3 metadata:', metadata);
    } else {
      // V2: Array olarak döner
      contentType = undefined; // V2'de contentType yok
      [sender, receiver, unlockTime, isRead] = result as [string, string, bigint, boolean];
      timestamp = undefined; // V2'de timestamp yok
      console.log('📦 V2 metadata:', [sender, receiver, unlockTime, isRead]);
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    
    // Unlock kontrolü: V3'te condition type'a göre
    let unlocked = false;
    if (isV3 && conditionType !== undefined) {
      // V3: conditionType var
      if (conditionType === 0) {
        // TIME_LOCK (0)
        unlocked = now >= unlockTime;
      } else if (conditionType === 1) {
        // PAYMENT (1)
        unlocked = (paidAmount ?? 0n) >= (requiredPayment ?? 0n);
      }
    } else {
      // V2: sadece time-based
      unlocked = now >= unlockTime;
    }
    
    const isSent = sender.toLowerCase() === userAddress.toLowerCase();

    let content: string | null = null;
    if (unlocked && !isSent) {
      content = "[Click to read message]";
    }

    // Payment mesajları için tarih formatlaması özel (unlockTime=0)
    const isPaymentLocked = isV3 && conditionType === 1; // PAYMENT mode
    const unlockDate = isPaymentLocked 
      ? dayjs() // Payment mesajlar için şu anki zamanı göster (anlamsız zaten)
      : dayjs(Number(unlockTime) * 1000);
    
    const relative = isPaymentLocked
      ? (unlocked ? "Payment received" : "Waiting for payment")
      : (unlocked ? "Açıldı" : unlockDate.fromNow());
    
    // Dosya metadata parse et (contentType=1 ise)
    let fileMetadata: { name: string; size: number; type: string } | undefined;
    if (contentType === 1 && !unlocked) {
      // Metadata'yı almak için content çekmemiz gerekir
      // Ama bu sadece unlocked durumda mümkün, bu yüzden daha önce kaydedilmiş metadata lazım
      // ŞİMDİLİK: Mesaj açılmadan önce tam bilgiyi gösteremeyiz
      // Alternatif: Smart contract'ta ayrı metadata mapping tutmak
      fileMetadata = undefined; // TODO: Metadata storage eklenecek
    }
    
    return {
      id,
      sender,
      receiver,
      unlockTime,
      unlockDate: isPaymentLocked ? "Payment-locked" : unlockDate.format("DD MMM YYYY HH:mm"),
      relative,
      unlocked,
      content,
      isRead,
      isSent,
      timestamp, // Mesajın gönderilme zamanı
      requiredPayment,
      paidAmount,
      conditionType,
      contentType, // Dosya tipi
      fileMetadata // Dosya bilgileri (şimdilik undefined)
    };
  } catch (err: any) {
    // Authorization hatası durumunda null dön (bu mesaj kullanıcıya ait değil)
    if (err.message?.includes("Not authorized")) {
      console.warn(`Mesaj #${id} için yetki yok, atlaniyor...`);
      return null;
    }
    // Diğer hatalar için throw et
    console.error(`❌ fetchMessage error for #${id}:`, err);
    throw err;
  }
}

// Transaction hash'lerini event log'larından çek
async function fetchTransactionHashes(
  client: PublicClient,
  contractAddress: `0x${string}`,
  contractAbi: any,
  messageIds: bigint[]
): Promise<Map<string, { sentTxHash?: string; paymentTxHash?: string }>> {
  const txHashMap = new Map<string, { sentTxHash?: string; paymentTxHash?: string }>();
  
  if (messageIds.length === 0) return txHashMap;

  try {
    // Son bloğu al
    const latestBlock = await client.getBlockNumber();
    
    // Son 10000 bloğu tara (yeni contract için yeterli)
    // Daha eski mesajlar için gerekirse artırılabilir
    const LOOKBACK_BLOCKS = 10000n;
    const startBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;
    
    // Block range'i parçalara böl (Scroll Sepolia için max 5000 block)
    const BLOCK_CHUNK_SIZE = 5000n;
    const chunks: Array<{ from: bigint; to: bigint }> = [];
    
    for (let from = startBlock; from <= latestBlock; from += BLOCK_CHUNK_SIZE) {
      const to = from + BLOCK_CHUNK_SIZE - 1n > latestBlock 
        ? latestBlock 
        : from + BLOCK_CHUNK_SIZE - 1n;
      chunks.push({ from, to });
    }

    console.log(`📊 Fetching TX hashes in ${chunks.length} chunks (blocks ${startBlock} to ${latestBlock})`);

    // MessageSent event'lerini chunk chunk çek
    for (const chunk of chunks) {
      try {
        const sentLogs = await client.getLogs({
          address: contractAddress,
          event: {
            type: 'event',
            name: 'MessageSent',
            inputs: [
              { type: 'uint256', name: 'messageId', indexed: true },
              { type: 'address', name: 'sender', indexed: true },
              { type: 'address', name: 'receiver', indexed: true },
            ]
          },
          fromBlock: chunk.from,
          toBlock: chunk.to
        });

        // MessageSent event'lerinden transaction hash'leri çıkar
        sentLogs.forEach((log: any) => {
          const messageId = log.args?.messageId?.toString();
          if (messageId && messageIds.some(id => id.toString() === messageId)) {
            const existing = txHashMap.get(messageId) || {};
            txHashMap.set(messageId, { 
              ...existing, 
              sentTxHash: log.transactionHash 
            });
          }
        });
        
        console.log(`✅ Chunk ${chunk.from}-${chunk.to}: Found ${sentLogs.length} MessageSent events`);
      } catch (chunkErr) {
        console.warn(`⚠️ Error fetching MessageSent logs for blocks ${chunk.from}-${chunk.to}:`, chunkErr);
      }
    }

    // PaymentReceived event'lerini çek (ödeme yapılırken)
    for (const chunk of chunks) {
      try {
        const paymentLogs = await client.getLogs({
          address: contractAddress,
          event: {
            type: 'event',
            name: 'PaymentReceived',
            inputs: [
              { type: 'uint256', name: 'messageId', indexed: true },
              { type: 'address', name: 'payer', indexed: true },
              { type: 'uint256', name: 'amount', indexed: false },
            ]
          },
          fromBlock: chunk.from,
          toBlock: chunk.to
        });

        paymentLogs.forEach((log: any) => {
          const messageId = log.args?.messageId?.toString();
          if (messageId && messageIds.some(id => id.toString() === messageId)) {
            const existing = txHashMap.get(messageId) || {};
            txHashMap.set(messageId, { 
              ...existing, 
              paymentTxHash: log.transactionHash 
            });
          }
        });
        
        if (paymentLogs.length > 0) {
          console.log(`✅ Chunk ${chunk.from}-${chunk.to}: Found ${paymentLogs.length} PaymentReceived events`);
        }
      } catch (chunkErr) {
        // PaymentReceived event yoksa veya hata varsa (sessiz geç)
      }
    }
    
    console.log(`✅ Total TX hashes found: ${txHashMap.size}`);

  } catch (err) {
    console.error('❌ fetchTransactionHashes error:', err);
  }

  return txHashMap;
}

export function MessageList({ refreshKey }: MessageListProps) {
  const client = usePublicClient();
  const { address: userAddress } = useAccount();
  const { chain } = useNetwork();
  const contractAddress = useContractAddress();
  const hasContract = useHasContract();
  const { getSelectedVersion } = useVersioning();
  const activeVersion = getSelectedVersion(chain?.id);
  
  // V3.2 contract mu kontrol et
  const isV3_2Contract = activeVersion?.key === 'v3.2';
  
  // ABI seçimi: v3.2 veya v2
  const contractAbi = isV3_2Contract ? chronoMessageV3_2Abi : chronoMessageV2Abi;
  
  const [items, setItems] = useState<MessageViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unlockedMessageIds, setUnlockedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Toast bildirimi göster
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!client || !hasContract || !contractAddress || !userAddress) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Kullanıcının gönderdiği ve aldığı mesaj ID'lerini al
      console.log('📡 Fetching messages with ABI:', isV3_2Contract ? 'SealedMessage v3.2' : 'SealedMessage v2');
      
      let sentIds: any = [];
      let receivedIds: any = [];
      
      try {
        const result = await client.readContract({
          address: contractAddress,
          abi: contractAbi as any,
          functionName: "getSentMessages",
          args: [userAddress as `0x${string}`]
        });
        sentIds = result;
        console.log('✅ getSentMessages raw result:', result);
      } catch (err) {
        console.error('❌ getSentMessages error:', err);
        sentIds = [];
      }

      try {
        const result = await client.readContract({
          address: contractAddress,
          abi: contractAbi as any,
          functionName: "getReceivedMessages",
          args: [userAddress as `0x${string}`]
        });
        receivedIds = result;
        console.log('✅ getReceivedMessages raw result:', result);
      } catch (err) {
        console.error('❌ getReceivedMessages error:', err);
        receivedIds = [];
      }

      // Array validation BEFORE any spread operations
      if (!sentIds || !Array.isArray(sentIds)) {
        console.warn('⚠️ sentIds is not an array:', sentIds);
        sentIds = [];
      }
      if (!receivedIds || !Array.isArray(receivedIds)) {
        console.warn('⚠️ receivedIds is not an array:', receivedIds);
        receivedIds = [];
      }

      console.log('📦 Validated arrays - Sent:', sentIds.length, 'Received:', receivedIds.length);

      // NOW safe to spread
      const allIds = [...new Set([...(sentIds as bigint[]), ...(receivedIds as bigint[])])];

      if (allIds.length === 0) {
        setItems([]);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // Mesajları yükle - userAddress'i account parametresi olarak geç + isV3 flag
      const results = await Promise.all(
        allIds.map((id) => fetchMessage(
          client, 
          contractAddress, 
          contractAbi, 
          id, 
          userAddress, 
          userAddress as `0x${string}`,
          isV3_2Contract // V3.2 contract mu?
        ))
      );
      
      // Null değerleri filtrele (yetki hatası olanlar)
      const validMessages = results.filter((msg): msg is MessageViewModel => msg !== null);
      
      // Transaction hash'lerini çek
      const txHashMap = await fetchTransactionHashes(
        client,
        contractAddress,
        contractAbi,
        allIds
      );
      
      // Transaction hash'lerini mesajlara ekle
      validMessages.forEach(msg => {
        const txData = txHashMap.get(msg.id.toString());
        if (txData) {
          msg.transactionHash = txData.sentTxHash;
          msg.paymentTxHash = txData.paymentTxHash;
        }
      });
      
      // Tarihe göre sırala (EN YENİ ÖNCE - descending order)
      // Payment mesajları (unlockTime=0) için özel davranış: message ID'ye göre sırala (ID büyük = yeni)
      validMessages.sort((a, b) => {
        // Payment mesajları (conditionType=1, unlockTime=0) için özel mantık
        const aIsPayment = a.conditionType === 1 || (a.unlockTime === 0n && a.timestamp === undefined);
        const bIsPayment = b.conditionType === 1 || (b.unlockTime === 0n && b.timestamp === undefined);
        
        // Her iki mesaj da payment ise: ID'ye göre sırala (ID büyük = yeni mesaj)
        if (aIsPayment && bIsPayment) {
          return Number(b.id) - Number(a.id);
        }
        
        // Payment mesajlar her zaman en üstte (öncelikli)
        if (aIsPayment) return -1; // a önce gelsin
        if (bIsPayment) return 1;  // b önce gelsin
        
        // Normal mesajlar için: timestamp veya unlockTime'a göre
        const aTime = a.timestamp ?? a.unlockTime ?? 0n;
        const bTime = b.timestamp ?? b.unlockTime ?? 0n;
        
        return Number(bTime) - Number(aTime); // Büyükten küçüğe (yeni → eski)
      });
      
      // Yeni unlock olan mesajları kontrol et (SADECE henüz okunmamış olanlar)
      const newlyUnlocked = validMessages.filter(msg => 
        msg.id && // id undefined değilse
        msg.unlocked && 
        !msg.isSent && 
        !msg.isRead && 
        !unlockedMessageIds.has(msg.id.toString())
      );
      
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(msg => {
          showToast(`🔓 Message #${msg.id} unlocked! You can read it now.`, 'success');
          setUnlockedMessageIds(prev => new Set(prev).add(msg.id.toString()));
        });
      }
      
      setItems(validMessages);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("MessageList error:", err);
      setError(`Error: ${err.message || "An error occurred while loading messages"}. Please refresh the page.`);
    } finally {
      setLoading(false);
    }
  }, [client, hasContract, contractAddress, userAddress, unlockedMessageIds, showToast]);

  useEffect(() => {
    if (mounted && client && hasContract && contractAddress && userAddress) {
      loadMessages();
    }
  }, [refreshKey, mounted, client, hasContract, contractAddress, userAddress, loadMessages]);

  // Otomatik yenileme (30 saniyede bir unlock kontrolü)
  useEffect(() => {
    if (!mounted || !client || !hasContract || !contractAddress || !userAddress) return;
    
    const interval = setInterval(() => {
      loadMessages();
    }, 30000); // 30 saniye

    return () => clearInterval(interval);
  }, [mounted, client, hasContract, contractAddress, userAddress, loadMessages]);

  if (!mounted) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
        <p>Loading...</p>
      </div>
    );
  }

  if (!userAddress) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
        <p>Connect your wallet...</p>
      </div>
    );
  }

  // Warning for networks without deployed contract
  if (!hasContract || !contractAddress) {
    return (
      <div className="rounded-xl border border-orange-700/50 bg-orange-900/20 p-6 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-orange-300">Contract not deployed on this network yet</h3>
            <p className="mt-2 text-sm text-orange-200/80">
              SealedMessage is active on these networks:
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
    <section className="space-y-4">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              animate-in slide-in-from-right duration-300
              rounded-lg border px-4 py-3 shadow-lg
              ${toast.type === 'success' ? 'border-green-500/50 bg-green-900/80 text-green-100' : ''}
              ${toast.type === 'info' ? 'border-blue-500/50 bg-blue-900/80 text-blue-100' : ''}
              ${toast.type === 'warning' ? 'border-yellow-500/50 bg-yellow-900/80 text-yellow-100' : ''}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-aurora">Messages</h2>
          {activeVersion && (
            <p className="text-xs text-slate-400">
              Viewing data from <span className="text-sky-300 font-semibold">{activeVersion.label}</span>
              {" "}
              (<span className="font-mono text-slate-500">{`${activeVersion.address.slice(0, 6)}…${activeVersion.address.slice(-4)}`}</span>)
            </p>
          )}
        </div>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="
            rounded-lg border border-aurora/40 bg-aurora/10 px-4 py-2 text-sm text-aurora 
            transition-all hover:bg-aurora/20 hover:border-aurora/60
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? "⟳" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-aurora border-t-transparent"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-300">
          <p className="mb-2 text-4xl">📭</p>
          <p>No messages yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => {
            // Safeguard: undefined değerleri kontrol et (0n geçerli!)
            if (item.id === undefined || item.unlockTime === undefined) {
              console.warn('⚠️ Invalid message item:', item);
              return null;
            }
            return (
              <MessageCard
                key={`msg-${item.id.toString()}-${item.unlockTime.toString()}-${item.isSent ? 's' : 'r'}-${index}`}
                id={item.id}
                sender={item.sender}
                receiver={item.receiver}
                unlockTime={item.unlockTime}
                unlockDate={item.unlockDate}
                unlocked={item.unlocked}
                isRead={item.isRead}
                isSent={item.isSent}
                index={index}
                requiredPayment={item.requiredPayment}
                paidAmount={item.paidAmount}
                conditionType={item.conditionType}
                transactionHash={item.transactionHash}
                paymentTxHash={item.paymentTxHash}
                contentType={item.contentType}
                // onMessageRead kaldırıldı - mesaj okununca sayfayı yenilemesin
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
