"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, useNetwork } from "wagmi";
import { chronoMessageV2Abi } from "../lib/abi-v2";
import { appConfig } from "../lib/env";
import { isAddress } from "viem";
import { useContractAddress, useHasContract } from "../lib/useContractAddress";
import { useVersioning } from "./VersionProvider";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

interface MessageFormProps {
  onSubmitted?: () => void;
}

export function MessageForm({ onSubmitted }: MessageFormProps) {
  const { isConnected, address: userAddress } = useAccount();
  const { chain } = useNetwork();
  const contractAddress = useContractAddress();
  const hasContract = useHasContract();
  const { getSelectedVersion } = useVersioning();
  const activeVersion = getSelectedVersion(chain?.id);

  const [receiver, setReceiver] = useState("");
  const [content, setContent] = useState("");
  const [unlockMode, setUnlockMode] = useState<"preset" | "custom">("preset");
  const [presetDuration, setPresetDuration] = useState<number>(10); // 10 saniye (anlık mesajlaşma için)
  const [unlock, setUnlock] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [userTimezone, setUserTimezone] = useState<string>("UTC");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("Europe/Istanbul");
  const [isPresetsOpen, setIsPresetsOpen] = useState(false); // Quick Select açık/kapalı durumu
  
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
    // Kullanıcının timezone'unu al
    setUserTimezone(dayjs.tz.guess());
  }, []);

  // Unlock timestamp hesaplama (preset veya custom)
  const unlockTimestamp = useMemo(() => {
    if (unlockMode === "preset") {
      return Math.floor(Date.now() / 1000) + presetDuration;
    }
    // Custom mode: kullanıcının seçtiği timezone'da parse et
    if (!unlock) return Math.floor(Date.now() / 1000); // Boş ise şu an
    
    try {
      const parsed = dayjs.tz(unlock, selectedTimezone);
      if (!parsed.isValid()) {
        console.warn("Geçersiz tarih:", unlock);
        return Math.floor(Date.now() / 1000);
      }
      return parsed.unix();
    } catch (err) {
      console.error("Tarih parse hatası:", err);
      return Math.floor(Date.now() / 1000);
    }
  }, [unlockMode, presetDuration, unlock, selectedTimezone]);

  // Form validation
  useEffect(() => {
    const valid = 
      isConnected &&
      !!receiver &&
      isAddress(receiver) &&
      receiver.toLowerCase() !== userAddress?.toLowerCase() && // ✅ Kendine mesaj gönderme kontrolü
      content.trim().length > 0 &&
      unlockTimestamp > Math.floor(Date.now() / 1000);
    setIsFormValid(valid);
  }, [isConnected, receiver, userAddress, content, unlockTimestamp]);

  // Prepare contract write with proper parameters
  const shouldPrepare = isFormValid && 
    !!contractAddress && 
    !!receiver && 
    isAddress(receiver) &&
    !!content &&
    unlockTimestamp > 0;

  const { config } = usePrepareContractWrite({
    address: contractAddress,
    abi: chronoMessageV2Abi,
    functionName: "sendMessage",
    args: shouldPrepare
      ? [receiver as `0x${string}`, content, BigInt(unlockTimestamp)]
      : undefined,
    enabled: shouldPrepare
  });

  const { data, isLoading: isPending, write } = useContractWrite(config);
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({ 
    hash: data?.hash 
  });

  // UTC ve local time gösterimi
  const unlockTimeDisplay = useMemo(() => {
    if (!mounted) return { local: "", utc: "", relative: "", selected: "" };
    
    try {
      const timestamp = unlockTimestamp * 1000;
      const localTime = dayjs(timestamp).format("DD MMM YYYY, HH:mm");
      const utcTime = dayjs(timestamp).utc().format("DD MMM YYYY, HH:mm");
      const selectedTime = dayjs(timestamp).tz(selectedTimezone).format("DD MMM YYYY, HH:mm");
      const relative = dayjs(timestamp).fromNow();
      
      return { local: localTime, utc: utcTime, selected: selectedTime, relative };
    } catch (err) {
      console.error("Tarih display hatası:", err);
      return { local: "---", utc: "---", selected: "---", relative: "---" };
    }
  }, [unlockTimestamp, mounted, selectedTimezone]);

  useEffect(() => {
    if (isSuccess) {
      console.log("✅ MessageForm: Message sent successfully");
      setReceiver("");
      setContent("");
      setError(null);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 5000);
      // setTimeout ile callback'i ayır
      setTimeout(() => {
        onSubmitted?.();
      }, 100);
    }
  }, [isSuccess]); // onSubmitted'ı bağımlılıklardan kaldırdık

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
    
    // Unlock time validation
    if (unlockMode === "custom" && !dayjs(unlock).isValid()) {
      setError("Please select a valid date.");
      return;
    }
    if (unlockTimestamp <= Math.floor(Date.now() / 1000)) {
      setError("Unlock time must be in the future.");
      return;
    }

    if (!write) {
      setError("Contract write function not available. Please check your network connection and try again.");
      return;
    }

    setError(null);
    
    try {
      write(); // No arguments needed - they're in the config from usePrepareContractWrite
    } catch (err) {
      setError(`Transaction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  // Connect your wallet
  if (!isConnected) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
        <p className="text-sm text-slate-400">Connect your wallet...</p>
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
          <div className="rounded-lg border border-green-500/50 bg-green-900/80 px-4 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-green-100 flex items-center gap-2">
              <span>✅</span> Message sent successfully!
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow-lg backdrop-blur"
      >
      {activeVersion && (
        <div className="rounded-lg border border-sky-700/40 bg-sky-900/10 px-4 py-2 text-xs text-sky-200">
          <p>
            Active contract: <span className="font-semibold">{activeVersion.label}</span>
            {" "}
            (<span className="font-mono">{`${activeVersion.address.slice(0, 6)}…${activeVersion.address.slice(-4)}`}</span>)
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="receiver" className="text-sm font-semibold uppercase tracking-wide text-aurora">
          Receiver Address
        </label>
        <input
          id="receiver"
          type="text"
          value={receiver}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setReceiver(event.target.value)}
          placeholder="0x..."
          className={`rounded-lg border px-4 py-3 font-mono text-sm text-slate-100 outline-none transition focus:ring-2 ${
            receiver && receiver.toLowerCase() === userAddress?.toLowerCase()
              ? 'border-red-500 bg-red-950/30 focus:border-red-500 focus:ring-red-500/60'
              : 'border-slate-700 bg-slate-950/70 focus:border-aurora focus:ring-aurora/60'
          }`}
        />
        {receiver && receiver.toLowerCase() === userAddress?.toLowerCase() ? (
          <p className="text-xs text-red-400">
            ⚠️ Bu sizin adresiniz! Kendine mesaj gönderemezsiniz.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            🔒 Only this address can read the message (not even the sender!)
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className="text-sm font-semibold uppercase tracking-wide text-aurora">
          Message
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value)}
          placeholder="Write and Seal"
          className="min-h-[120px] rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-aurora focus:ring-2 focus:ring-aurora/60"
        />
      </div>
      
      {/* Unlock Time Selection */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-aurora">
          ⏰ Unlock Time
        </label>
        
        {/* Mode Selection */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setUnlockMode("preset");
              setIsPresetsOpen(!isPresetsOpen); // Toggle açık/kapalı
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              unlockMode === "preset"
                ? "bg-sunset/20 border-2 border-sunset text-sunset"
                : "bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600"
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
                : "bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-200"
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
                onClick={() => setPresetDuration(value)}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  presetDuration === value
                    ? "bg-sunset/20 border-2 border-sunset text-sunset"
                    : "bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sunset focus:ring-2 focus:ring-sunset/60"
            />
            
            {/* Timezone Seçici */}
            <div className="flex flex-col gap-2">
              <label htmlFor="timezone" className="text-xs font-medium text-slate-400">
                🌐 Saat Dilimi (Timezone)
              </label>
              <select
                id="timezone"
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sunset focus:ring-2 focus:ring-sunset/60"
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
              <p className="text-xs text-slate-500 italic">
                💡 The date/time you enter will be interpreted in this timezone
              </p>
            </div>
          </div>
        )}

        {/* Time Display */}
        {mounted && (
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3 space-y-2 text-xs">
            {unlockMode === "custom" && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">🕒 Selected Timezone:</span>
                <span className="text-sunset font-mono font-semibold">{unlockTimeDisplay.selected}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">🌍 Your Time:</span>
              <span className="text-slate-200 font-mono">{unlockTimeDisplay.local}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">🌐 Universal Time (UTC):</span>
              <span className="text-slate-200 font-mono">{unlockTimeDisplay.utc}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">⏱️ Time Remaining:</span>
              <span className="text-green-400 font-semibold">{unlockTimeDisplay.relative}</span>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <p className="text-slate-500 italic">
                ℹ️ Blockchain uses UTC time. The message will unlock at this UTC time regardless of the recipient's location.
              </p>
            </div>
          </div>
        )}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full rounded-lg bg-gradient-to-r from-aurora via-sky-500 to-sunset px-4 py-3 text-center text-sm font-semibold uppercase tracking-widest text-slate-900 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending || isConfirming ? "Sending transaction..." : "Send Message"}
      </button>
      {data?.hash ? (
        <p className="text-xs text-slate-400">
          İşlem hash&apos;i: {data.hash.slice(0, 10)}...{data.hash.slice(-6)}
        </p>
      ) : null}
    </form>
    </>
  );
}
