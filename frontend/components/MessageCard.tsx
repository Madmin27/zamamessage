"use client";

import { useState, useEffect } from "react";
import { useContractWrite, useWaitForTransaction, usePublicClient, useAccount, usePrepareContractWrite } from "wagmi";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { chronoMessageZamaAbi } from "../lib/abi-zama";
import { appConfig } from "../lib/env";
import { useContractAddress } from "../lib/useContractAddress";
import { useNetwork } from "wagmi";
import { IPFSFileDisplay } from "./IPFSFileDisplay";

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
  const [messageContent, setMessageContent] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState(unlocked); // Payment sonrası unlock için
  const [localIsRead, setLocalIsRead] = useState(isRead); // Payment sonrası read için
  const client = usePublicClient();
  const { address: userAddress } = useAccount();
  const contractAddress = useContractAddress();
  const { chain } = useNetwork();
  
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
      if (!isRead || isSent || !unlocked || !client || !userAddress || !contractAddress) return;
      if (messageContent) return; // Zaten yüklenmiş
      
      setIsLoadingContent(true);
      try {
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi as any,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        }) as unknown as bigint; // Zama returns encrypted content
        
        // Decrypt content (placeholder - will be replaced with real FHE decryption)
        const decrypted = '0x' + content.toString(16);
        setMessageContent(decrypted);
        setIsExpanded(true);
      } catch (err) {
        console.error("❌ Content could not be loaded (isRead):", err);
      } finally {
        setIsLoadingContent(false);
      }
    };
    
    loadContentIfRead();
  }, [isRead, isSent, unlocked, client, userAddress, id, messageContent, contractAddress]);

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
      if (!isSuccess || !client || !userAddress || !contractAddress) return;
      
      setIsLoadingContent(true);
      
      // Transaction confirm olduktan sonra biraz bekle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // readMessage ile içeriği al
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        }) as any;

        // Decrypt (placeholder)
        const decrypted = '0x' + (content?.toString(16) || 'encrypted');
        setMessageContent(decrypted);
        setIsExpanded(true);
        onMessageRead?.();
      } catch (err: any) {
        console.error("❌ Content could not be fetched:", err);
        setMessageContent("⚠️ Content could not be loaded. Please refresh the page.");
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [isSuccess, client, id, onMessageRead, userAddress, contractAddress]);

  // Payment success olduğunda içeriği yükle
  useEffect(() => {
    const fetchContentAfterPayment = async () => {
      if (!isPaymentSuccess || !client || !userAddress || !contractAddress) return;
      
      setIsLoadingContent(true);
      
      // Payment başarılı - unlock ve read durumunu güncelle
      setLocalUnlocked(true);
      setLocalIsRead(true);
      
      // Transaction confirm olduktan sonra biraz bekle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const content = await client.readContract({
          address: contractAddress,
          abi: chronoMessageZamaAbi,
          functionName: "readMessage" as any,
          args: [id],
          account: userAddress as `0x${string}`
        }) as any;

        const decrypted = '0x' + (content?.toString(16) || 'encrypted');
        setMessageContent(decrypted);
        setIsExpanded(true);
        onMessageRead?.(); // Parent'ı bilgilendir
      } catch (err: any) {
        console.error("❌ Content could not be fetched after payment:", err);
        setMessageContent("⚠️ Content could not be loaded. Please refresh the page.");
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContentAfterPayment();
  }, [isPaymentSuccess, client, id, onMessageRead, userAddress, contractAddress]);

  const handleReadClick = () => {
    if (!localUnlocked) {
      console.warn("❌ Message not unlocked yet");
      return;
    }
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
          : unlocked
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
                ${unlocked 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }
              `}>
                {unlocked ? '🔓 Unlocked' : '🔒 Locked'}
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
          {!unlocked && !isSent && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Kalan:</span>
              <CountdownTimer />
            </div>
          )}
          
          {/* Ekli Dosya Göstergesi - Mesaj açılmadan önce */}
          {contentType === 1 && !unlocked && !isSent && (
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
          : unlocked
          ? 'border-green-800/30 bg-green-950/40'
          : 'border-slate-800/30 bg-slate-950/60'
        }
      `}>
        {isSent ? (
          <p className="italic text-blue-300/70 flex items-center gap-2">
            <span>🚫</span> You cannot view the message you sent.
          </p>
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
                  disabled={isReading || isConfirming || isLoadingContent}
                  className="w-full text-left px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 
                    border border-green-500/30 text-green-300 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReading || isConfirming || isLoadingContent ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span> 
                      {isLoadingContent ? "Loading content..." : "Reading..."}
                    </span>
                  ) : (
                    <span>🔓 Click to read message</span>
                  )}
                </button>
              </>
            ) : messageContent ? (
              // İçerik yüklenmiş, göster
              <div className="space-y-2">
                {contentType === 1 ? (
                  // IPFS dosya - metadata hash'inden bilgileri fetch et
                  <IPFSFileDisplay metadataHash={messageContent} />
                ) : (
                  // TEXT mesaj - normal gösterim
                  <p className="text-slate-200 whitespace-pre-wrap">{messageContent}</p>
                )}
                {localIsRead && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span>✓</span> Read
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          // Mesaj henüz unlock olmamış
          <div className="space-y-3">
            {/* File Preview - contentType=1 ise file metadata göster */}
            {contentType === 1 && (
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
            )}
            
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
