"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[38px] w-[150px] animate-pulse rounded-lg bg-cyber-blue/20" />
    );
  }

  return (
    <ConnectButton 
      showBalance={false} 
      label="Connect Wallet" 
      accountStatus="address" 
      chainStatus="none" 
    />
  );
}
