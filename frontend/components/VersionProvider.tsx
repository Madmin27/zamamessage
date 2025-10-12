"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

// Stub provider - Zama-only now, no version switching
interface VersionContextValue {
  getSelectedVersion: (chainId?: number) => undefined;
  selectVersion: (chainId: number, versionKey: string) => void;
  getAvailableVersions: (chainId?: number) => [];
}

const VersionContext = createContext<VersionContextValue>({
  getSelectedVersion: () => undefined,
  selectVersion: () => {},
  getAvailableVersions: () => [],
});

export function VersionProvider({ children }: PropsWithChildren) {
  const value: VersionContextValue = {
    getSelectedVersion: () => undefined,
    selectVersion: () => {},
    getAvailableVersions: () => [],
  };

  return <VersionContext.Provider value={value}>{children}</VersionContext.Provider>;
}

export function useVersioning(): VersionContextValue {
  return useContext(VersionContext);
}
