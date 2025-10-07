"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const load = async () => {
      // Check if we're in a Farcaster context
      const context = await sdk.context;
      if (context) {
        console.log("✅ Farcaster context detected:", context);
        
        // Signal that the app is ready
        sdk.actions.ready();
        console.log("✅ SDK ready() called");
      }
    };

    load();
  }, []);

  return <>{children}</>;
}
