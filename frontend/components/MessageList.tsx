"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import { usePublicClient, useAccount, useNetwork } from "wagmi";
import type { PublicClient } from "viem";
import { chronoMessageV2Abi } from "../lib/abi-v2";
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
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

async function fetchMessage(
  client: PublicClient,
  contractAddress: `0x${string}`,
  id: bigint,
  userAddress: string,
  account?: `0x${string}`
): Promise<MessageViewModel | null> {
  try {
    const [sender, receiver, unlockTime, isRead] = (await client.readContract({
      address: contractAddress,
      abi: chronoMessageV2Abi,
      functionName: "getMessageMetadata",
      args: [id],
      account: account // Kullanıcı adresini msg.sender olarak gönder
    })) as [string, string, bigint, boolean];

    const now = BigInt(Math.floor(Date.now() / 1000));
    const unlocked = now >= unlockTime;
    const isSent = sender.toLowerCase() === userAddress.toLowerCase();

    let content: string | null = null;
    if (unlocked && !isSent) {
      content = "[Mesajı okumak için tıklayın]";
    }

    const unlockDate = dayjs(Number(unlockTime) * 1000);
    return {
      id,
      sender,
      receiver,
      unlockTime,
      unlockDate: unlockDate.format("DD MMM YYYY HH:mm"),
      relative: unlocked ? "Açıldı" : unlockDate.fromNow(),
      unlocked,
      content,
      isRead,
      isSent
    };
  } catch (err: any) {
    // Authorization hatası durumunda null dön (bu mesaj kullanıcıya ait değil)
    if (err.message?.includes("Not authorized")) {
      console.warn(`Mesaj #${id} için yetki yok, atlaniyor...`);
      return null;
    }
    // Diğer hatalar için throw et
    throw err;
  }
}

export function MessageList({ refreshKey }: MessageListProps) {
  const client = usePublicClient();
  const { address: userAddress } = useAccount();
  const { chain } = useNetwork();
  const contractAddress = useContractAddress();
  const hasContract = useHasContract();
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
      const sentIds = (await client.readContract({
        address: contractAddress,
        abi: chronoMessageV2Abi,
        functionName: "getSentMessages",
        args: [userAddress as `0x${string}`]
      })) as bigint[];

      const receivedIds = (await client.readContract({
        address: contractAddress,
        abi: chronoMessageV2Abi,
        functionName: "getReceivedMessages",
        args: [userAddress as `0x${string}`]
      })) as bigint[];

      // Tüm mesaj ID'lerini birleştir ve tekrar edenleri çıkar
      const allIds = [...new Set([...sentIds, ...receivedIds])];

      if (allIds.length === 0) {
        setItems([]);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // Mesajları yükle - userAddress'i account parametresi olarak geç
      const results = await Promise.all(
        allIds.map((id) => fetchMessage(client, contractAddress, id, userAddress, userAddress as `0x${string}`))
      );
      
      // Null değerleri filtrele (yetki hatası olanlar)
      const validMessages = results.filter((msg): msg is MessageViewModel => msg !== null);
      
      // Tarihe göre sırala (en yeni önce)
      validMessages.sort((a, b) => Number(b.unlockTime - a.unlockTime));
      
      // Yeni unlock olan mesajları kontrol et (SADECE henüz okunmamış olanlar)
      const newlyUnlocked = validMessages.filter(msg => 
        msg.unlocked && !msg.isSent && !msg.isRead && !unlockedMessageIds.has(msg.id.toString())
      );
      
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(msg => {
          showToast(`🔓 Mesaj #${msg.id} açıldı! Okuyabilirsiniz.`, 'success');
          setUnlockedMessageIds(prev => new Set(prev).add(msg.id.toString()));
        });
      }
      
      setItems(validMessages);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("MessageList error:", err);
      setError(`Hata: ${err.message || "Mesajlar yüklenirken hata oluştu"}. Lütfen sayfayı yenileyin.`);
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

  if (!mounted || !userAddress) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
        <p>Cüzdanınızı bağlayın...</p>
      </div>
    );
  }

  // Kontrat deploy edilmemiş ağ için uyarı
  if (!hasContract || !contractAddress) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-semibold text-yellow-200">
              Bu ağda kontrat henüz deploy edilmedi
            </h3>
            <p className="mt-2 text-sm text-yellow-300/80">
              <strong>{chain?.name || "Bu ağ"}</strong> ağında ChronoMessage kontratı bulunmuyor.
            </p>
            <p className="mt-2 text-sm text-yellow-300/80">
              Mesaj göndermek ve görüntülemek için kontratın deploy edildiği bir ağa geçin:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-yellow-200">
              <li>✅ <strong>Sepolia</strong> - Kontrat aktif</li>
              <li>✅ <strong>Base Sepolia</strong> - Kontrat aktif</li>
              <li>✅ <strong>Monad Testnet</strong> - Kontrat aktif</li>
              <li>❌ Diğer ağlar - Henüz deploy edilmedi</li>
            </ul>
            <p className="mt-3 text-xs text-yellow-400/70">
              💡 Üstteki <strong>Ağ Seçimi</strong> dropdown'ından Sepolia veya Base Sepolia'ya geçebilirsiniz.
            </p>
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
              rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm
              ${toast.type === 'success' ? 'border-green-500/50 bg-green-900/80 text-green-100' : ''}
              ${toast.type === 'info' ? 'border-blue-500/50 bg-blue-900/80 text-blue-100' : ''}
              ${toast.type === 'warning' ? 'border-yellow-500/50 bg-yellow-900/80 text-yellow-100' : ''}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-aurora">Mesajlar</h2>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="
            rounded-lg border border-aurora/40 bg-aurora/10 px-4 py-2 text-sm text-aurora 
            transition-all hover:bg-aurora/20 hover:border-aurora/60
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? "⟳" : "Yenile"}
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
          <p>Henüz mesaj yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <MessageCard
              key={item.id.toString()}
              id={item.id}
              sender={item.sender}
              receiver={item.receiver}
              unlockTime={item.unlockTime}
              unlockDate={item.unlockDate}
              unlocked={item.unlocked}
              isRead={item.isRead}
              isSent={item.isSent}
              index={index}
              // onMessageRead kaldırıldı - mesaj okununca sayfayı yenilemesin
            />
          ))}
        </div>
      )}
    </section>
  );
}
