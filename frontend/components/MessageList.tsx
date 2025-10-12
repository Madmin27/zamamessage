"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import { usePublicClient, useAccount, useNetwork } from "wagmi";
import type { PublicClient } from "viem";
import { chronoMessageZamaAbi } from "../lib/abi-zama";
import { appConfig } from "../lib/env";
import { useContractAddress, useHasContract } from "../lib/useContractAddress";
import { MessageCard } from "./MessageCard";

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
  
  // Artık sadece Zama kullanıyoruz
  const isZamaContract = true;
  
  // Sadece Zama ABI kullan
  const contractAbi = chronoMessageZamaAbi;
  
  const [items, setItems] = useState<MessageViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unlockedMessageIds, setUnlockedMessageIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unread' | 'unlocked' | 'locked' | 'paid' | 'unpaid' | 'pending' | 'files'>('all');
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenMessages');
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

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
      // Zama contract için farklı yükleme stratejisi
      if (isZamaContract) {
        console.log('📡 Loading Zama FHE messages...');
        
        // Zama contract: messageCount ile iterate et
        try {
          const messageCountResult = await client.readContract({
            address: contractAddress,
            abi: contractAbi as any,
            functionName: "messageCount",
            args: []
          });
          
          const messageCount = Number(messageCountResult);
          console.log(`📊 Total messages in Zama contract: ${messageCount}`);
          
          const allMessages: MessageViewModel[] = [];
          
          // Her mesajın metadata'sını yükle
          for (let i = 0; i < messageCount; i++) {
            try {
              const metadata = await client.readContract({
                address: contractAddress,
                abi: contractAbi as any,
                functionName: "getMessageMetadata",
                args: [BigInt(i)]
              }) as [string, string, bigint, boolean];
              
              const [sender, receiver, unlockTime, isUnlocked] = metadata;
              
              // Kullanıcının gönderdiği VEYA aldığı mesajları filtrele
              const isSender = sender.toLowerCase() === userAddress.toLowerCase();
              const isReceiver = receiver.toLowerCase() === userAddress.toLowerCase();
              
              if (isSender || isReceiver) {
                allMessages.push({
                  id: BigInt(i),
                  sender: sender,
                  receiver: receiver,
                  unlockTime: unlockTime,
                  unlockDate: dayjs.unix(Number(unlockTime)).format('YYYY-MM-DD HH:mm:ss'),
                  unlocked: isUnlocked,
                  isRead: false,
                  isSent: isSender,
                  conditionType: 0, // TIME_LOCK only
                  contentType: 2, // ENCRYPTED
                  relative: dayjs.unix(Number(unlockTime)).fromNow(),
                  content: "[Encrypted with FHE 🔐]"
                });
              }
            } catch (err) {
              console.warn(`⚠️ Couldn't load message ${i}:`, err);
            }
          }
          
          console.log(`✅ Loaded ${allMessages.length} Zama messages`);
          setItems(allMessages);
          setLastUpdated(new Date());
        } catch (err) {
          console.error('❌ Error loading Zama messages:', err);
          setError('Failed to load messages');
        }
        setLoading(false);
        return; // EXIT early - don't run V2/V3.2 code
      }
      
      // V3.2 / V2 contract için artık destek yok - sadece Zama
      console.log('⚠️ Non-Zama contract detected - this should not happen!');
      setItems([]);
      setLastUpdated(new Date());
      setLoading(false);

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
    }, 300000); // 5 dakika (300000 ms)

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
          {contractAddress && (
            <p className="text-xs text-slate-400">
              Viewing data from <span className="text-sky-300 font-semibold">Zama FHE</span>
              {" "}
              (<span className="font-mono text-slate-500">{`${contractAddress.slice(0, 6)}…${contractAddress.slice(-4)}`}</span>)
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

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-slate-400 mr-2">Filter:</span>
        {['all', 'unread', 'locked', 'unlocked', 'pending', 'paid', 'unpaid', 'files'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${filter === filterOption 
                ? 'bg-aurora text-white shadow-lg shadow-aurora/20' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }
            `}
          >
            {filterOption === 'all' && '📋 All'}
            {filterOption === 'unread' && '🆕 Unread'}
            {filterOption === 'locked' && '🔒 Locked'}
            {filterOption === 'unlocked' && '🔓 Unlocked'}
            {filterOption === 'pending' && '⏳ Pending'}
            {filterOption === 'paid' && '✅ Paid'}
            {filterOption === 'unpaid' && '❌ Unpaid'}
            {filterOption === 'files' && '📎 Files'}
            {filterOption === 'files' && '📎 Files'}
          </button>
        ))}
        {hiddenMessages.size > 0 && (
          <button
            onClick={() => setHiddenMessages(new Set())}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            🔄 Show Hidden ({hiddenMessages.size})
          </button>
        )}
      </div>

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
          {items
            .filter((item) => {
              // Filter by hidden status
              if (hiddenMessages.has(item.id.toString())) return false;
              
              // Filter by type
              if (filter === 'all') return true;
              
              // Unread: Unlocked ve henüz okunmamış (sadece alıcılar için)
              if (filter === 'unread') return !item.isSent && item.unlocked && !item.isRead;
              
              // Locked: Henüz unlock olmamış
              if (filter === 'locked') return !item.unlocked;
              
              // Unlocked: Unlock olmuş
              if (filter === 'unlocked') return item.unlocked;
              
              // Pending: Time-locked ve süresi dolmamış (alıcı için)
              if (filter === 'pending') {
                return !item.isSent && !item.unlocked && item.conditionType === 0 && item.unlockTime > BigInt(Math.floor(Date.now() / 1000));
              }
              
              // Paid: Payment-locked VE ödeme yapılmış (paidAmount > 0)
              if (filter === 'paid') {
                return item.conditionType === 1 && item.paidAmount && item.paidAmount > 0n;
              }
              
              // Unpaid: Payment-locked ANCAK henüz ödeme yapılmamış
              if (filter === 'unpaid') {
                return item.conditionType === 1 && (!item.paidAmount || item.paidAmount === 0n);
              }
              
              // Files: IPFS dosya içeren
              if (filter === 'files') return item.contentType === 1;
              
              return true;
            })
            .map((item, index) => {
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
                onHide={() => {
                  const newHidden = new Set(hiddenMessages);
                  newHidden.add(item.id.toString());
                  setHiddenMessages(newHidden);
                  // Save to localStorage
                  localStorage.setItem('hiddenMessages', JSON.stringify(Array.from(newHidden)));
                }}
                // onMessageRead kaldırıldı - mesaj okununca sayfayı yenilemesin
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
