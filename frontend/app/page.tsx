"use client";

import { useState, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MessageForm } from "../components/MessageForm";
import { MessageList } from "../components/MessageList";
import { NetworkSwitcher } from "../components/NetworkSwitcher";
import { appConfig } from "../lib/env";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Callback'i sabitle - her render'da aynı referans
  const handleMessageSubmitted = useCallback(() => {
    console.log("📨 Yeni mesaj gönderildi, liste güncelleniyor...");
    setRefreshKey((prev: number) => prev + 1);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">SealedMessage</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              When conditions intersect, secrets unravel.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <ConnectButton showBalance={false} label="Connect Wallet" accountStatus="address" chainStatus="icon" />
            <div className="w-full md:w-80">
              <NetworkSwitcher />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1fr_1fr]">
  <MessageForm onSubmitted={handleMessageSubmitted} />
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300 shadow-lg">
          <h2 className="text-lg font-semibold text-aurora">📌 How It Works?</h2>
          <ol className="mt-4 space-y-2 list-decimal pl-4">
            <li>Select the unlock date as a future time.</li>
            <li>Write your message and confirm the transaction.</li>
            <li>When the specified date arrives, the content becomes automatically viewable.</li>
          </ol>
          <p className="mt-4 text-xs text-slate-400">
            Note: Later, content will be kept private on-chain with Fully Homomorphic Encryption (FHE).
          </p>
        </div>
      </div>

      <MessageList refreshKey={refreshKey} />
    </main>
  );
}
