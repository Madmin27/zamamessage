"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useNetwork } from "wagmi";
import { getChainById, type ChainVersion, ZERO_ADDRESS } from "../lib/chains";

interface VersionContextValue {
  getSelectedVersion: (chainId?: number) => ChainVersion | undefined;
  selectVersion: (chainId: number, versionKey: string) => void;
  getAvailableVersions: (chainId?: number) => ChainVersion[];
}

const VersionContext = createContext<VersionContextValue | undefined>(undefined);

export function VersionProvider({ children }: PropsWithChildren) {
  const { chain } = useNetwork();
  const [selectedKeys, setSelectedKeys] = useState<Record<number, string>>({});

  // Ensure a default version is selected when switching chains
  useEffect(() => {
    if (!chain?.id) {
      return;
    }

    const chainConfig = getChainById(chain.id);
    if (!chainConfig) {
      return;
    }

    const availableVersions: ChainVersion[] = chainConfig.versions?.length
      ? [...chainConfig.versions]
      : (chainConfig.factoryAddress && chainConfig.factoryAddress !== ZERO_ADDRESS)
        ? [{
            key: "latest",
            label: `${chainConfig.name} Latest`,
            address: chainConfig.factoryAddress as `0x${string}`,
            isDefault: true
          }]
        : [];

    if (!availableVersions.length) {
      return;
    }

    setSelectedKeys((prev) => {
      if (prev[chain.id]) {
        return prev;
      }

  const fallback = availableVersions.find((version: ChainVersion) => version.isDefault) ?? availableVersions[0];
      return { ...prev, [chain.id]: fallback.key };
    });
  }, [chain]);

  const selectVersion = useCallback((chainId: number, versionKey: string) => {
    setSelectedKeys((prev) => ({ ...prev, [chainId]: versionKey }));
  }, []);

  const getAvailableVersions = useCallback((chainId?: number): ChainVersion[] => {
    if (!chainId) {
      return [];
    }

    const chainConfig = getChainById(chainId);
    if (!chainConfig) {
      return [];
    }

    if (chainConfig.versions?.length) {
      return [...chainConfig.versions];
    }

    if (chainConfig.factoryAddress && chainConfig.factoryAddress !== ZERO_ADDRESS) {
      return [{
        key: "latest",
        label: `${chainConfig.name} Latest`,
        address: chainConfig.factoryAddress as `0x${string}`,
        isDefault: true
      }];
    }

    return [];
  }, []);

  const getSelectedVersion = useCallback((chainId?: number): ChainVersion | undefined => {
    if (!chainId) {
      return undefined;
    }

    const versions = getAvailableVersions(chainId);
    if (!versions.length) {
      return undefined;
    }

    const selectedKey = selectedKeys[chainId];
    return versions.find((version) => version.key === selectedKey) ?? versions.find((version) => version.isDefault) ?? versions[0];
  }, [getAvailableVersions, selectedKeys]);

  const value = useMemo<VersionContextValue>(() => ({
    getSelectedVersion,
    selectVersion,
    getAvailableVersions
  }), [getAvailableVersions, getSelectedVersion, selectVersion]);

  return (
    <VersionContext.Provider value={value}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersioning(): VersionContextValue {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error("useVersioning must be used within a VersionProvider");
  }
  return context;
}
