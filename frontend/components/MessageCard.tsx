"use client";

import { useState, useEffect } from "react";
import { useContractWrite, useWaitForTransaction, usePublicClient, useAccount } from "wagmi";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { chronoMessageV2Abi } from "../lib/abi-v2";
import { appConfig } from "../lib/env";

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
}

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
  onMessageRead
}: MessageCardProps) {
  const [messageContent, setMessageContent] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const client = usePublicClient();
  const { address: userAddress } = useAccount();

  // Debug: State değişimlerini logla
  useEffect(() => {
    console.log("🔄 MessageCard render - state:", { 
      id: id.toString(), 
      messageContent, 
      isExpanded,
      isLoadingContent,
      isRead // Contract'tan gelen
    });
  }, [id, messageContent, isExpanded, isLoadingContent, isRead]);

  // Eğer mesaj zaten okunmuşsa (ısRead: true), direkt içeriği yükle
  useEffect(() => {
    const loadContentIfRead = async () => {
      if (!isRead || isSent || !unlocked || !client || !userAddress) return;
      if (messageContent) return; // Zaten yüklenmiş
      
      setIsLoadingContent(true);
      try {
        console.log("📚 Mesaj zaten okunmuş, içerik yüklenyor...", id.toString());
        const content = await client.readContract({
          address: appConfig.contractAddress as `0x${string}`,
          abi: chronoMessageV2Abi,
          functionName: "getMessageContent",
          args: [id],
          account: userAddress as `0x${string}`
        }) as string;
        
        console.log("✅ İçerik yüklendi (isRead):", content);
        setMessageContent(content);
        setIsExpanded(true);
      } catch (err) {
        console.error("❌ İçerik yüklenemedi (isRead):", err);
      } finally {
        setIsLoadingContent(false);
      }
    };
    
    loadContentIfRead();
  }, [isRead, isSent, unlocked, client, userAddress, id, messageContent]);

  // readMessage transaction
  const { data: txData, isLoading: isReading, write: readMessage } = useContractWrite({
    address: appConfig.contractAddress as `0x${string}`,
    abi: chronoMessageV2Abi,
    functionName: "readMessage",
    args: [id]
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: txData?.hash
  });

  // Transaction başarılı olunca içeriği çek
  useEffect(() => {
    const fetchContent = async () => {
      if (!isSuccess || !client || !userAddress) return;
      
      setIsLoadingContent(true);
      
      // Transaction confirm olduktan sonra biraz bekle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        console.log("🔍 getMessageContent çağrılıyor...", {
          messageId: id.toString(),
          userAddress,
          contractAddress: appConfig.contractAddress
        });
        
        // getMessageContent ile içeriği al (VIEW - gas yok)
        const content = await client.readContract({
          address: appConfig.contractAddress as `0x${string}`,
          abi: chronoMessageV2Abi,
          functionName: "getMessageContent",
          args: [id],
          account: userAddress as `0x${string}`
        }) as string;

        console.log("✅ İçerik alındı:", content);
        setMessageContent(content);
        setIsExpanded(true);
        console.log("📝 State güncellendi:", { content, isExpanded: true });
        onMessageRead?.();
      } catch (err: any) {
        console.error("❌ İçerik alınamadı:", err);
        console.error("Hata detayı:", {
          message: err.message,
          cause: err.cause,
          shortMessage: err.shortMessage
        });
        setMessageContent("⚠️ İçerik yüklenemedi. Lütfen sayfayı yenileyin.");
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [isSuccess, client, id, onMessageRead, userAddress]);

  const handleReadClick = () => {
    if (!unlocked) return;
    if (isSent) return;
    readMessage?.();
  };

  // Countdown Timer
  const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = Number(unlockTime) - now;
        
        if (diff <= 0) {
          setTimeLeft("🔓 Açıldı!");
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
          : unlocked
          ? 'border-green-600/50 bg-gradient-to-br from-green-900/30 to-emerald-800/10'
          : 'border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-800/30'
        }
      `}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">#{id.toString()}</div>
          {!isSent && (
            <div className={`
              px-2 py-1 rounded-full text-xs font-semibold
              ${unlocked 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }
            `}>
              {unlocked ? '🔓 Açık' : '🔒 Kilitli'}
            </div>
          )}
        </div>
        
        {isSent ? (
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">📤 Alıcı</p>
            <p className="font-mono text-xs text-blue-200/80 break-all">{receiver}</p>
            <p className="mt-2 text-xs text-blue-400/70 flex items-center gap-1">
              <span>🔒</span> Sadece alıcı görebilir
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-1">📥 Gönderen</p>
            <p className="font-mono text-xs text-slate-400 break-all">{sender}</p>
          </div>
        )}
        
        <div className="border-t border-slate-700/50 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Kilit:</span>
            <span className="text-slate-300">{unlockDate}</span>
          </div>
          {!unlocked && !isSent && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Kalan:</span>
              <CountdownTimer />
            </div>
          )}
        </div>
      </div>
      
      <div className={`
        mt-4 rounded-lg border p-4 text-sm
        ${isSent 
          ? 'border-blue-800/30 bg-blue-950/40' 
          : unlocked
          ? 'border-green-800/30 bg-green-950/40'
          : 'border-slate-800/30 bg-slate-950/60'
        }
      `}>
        {isSent ? (
          <p className="italic text-blue-300/70 flex items-center gap-2">
            <span>🚫</span> Gönderdiğiniz mesajı göremezsiniz.
          </p>
        ) : unlocked ? (
          <div className="space-y-2">
            {isRead && !messageContent && isLoadingContent ? (
              // Okunan mesaj yükleniyor
              <div className="text-slate-400 italic flex items-center gap-2">
                <span className="animate-spin">⟳</span> İçerik yükleniyor...
              </div>
            ) : !messageContent && !isExpanded && !isRead ? (
              // Henüz okunmamış, butonu göster
              <button
                onClick={handleReadClick}
                disabled={isReading || isConfirming || isLoadingContent}
                className="w-full text-left px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 
                  border border-green-500/30 text-green-300 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReading || isConfirming || isLoadingContent ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span> 
                    {isLoadingContent ? "İçerik yükleniyor..." : "Okunuyor..."}
                  </span>
                ) : (
                  <span>🔓 Mesajı okumak için tıklayın</span>
                )}
              </button>
            ) : messageContent ? (
              // İçerik yüklenmiş, göster
              <div className="space-y-2">
                <p className="text-slate-200 whitespace-pre-wrap">{messageContent}</p>
                {isRead && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span>✓</span> Okundu
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-400 italic flex items-center gap-2">
            <span>⏳</span> Mesaj henüz kilitli
          </p>
        )}
      </div>
    </div>
  );
}
