"use client";

import { PropsWithChildren, useMemo } from "react";
import { WagmiConfig, createConfig, configureChains } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { RainbowKitProvider, midnightTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { defineChain } from "viem";
import { appConfig } from "../lib/env";

export function Providers({ children }: PropsWithChildren) {
  const chain = useMemo(
    () =>
      defineChain({
        id: appConfig.chain.id,
        name: appConfig.chain.name,
        network: appConfig.chain.network,
        nativeCurrency: appConfig.chain.nativeCurrency,
        rpcUrls: {
          default: { http: [appConfig.chain.rpcUrl] },
          public: { http: [appConfig.chain.rpcUrl] }
        },
        blockExplorers: appConfig.chain.explorerUrl
          ? {
              default: {
                name: "Explorer",
                url: appConfig.chain.explorerUrl
              }
            }
          : undefined,
        testnet: appConfig.chain.id !== 1
      }),
    []
  );

  const { publicClient, webSocketPublicClient } = configureChains([chain], [jsonRpcProvider({ rpc: () => ({ http: appConfig.chain.rpcUrl }) })]);

  const connectors = connectorsForWallets([
    {
      groupName: "Önerilen",
      wallets: [
        injectedWallet({ chains: [chain] }),
        metaMaskWallet({ chains: [chain], projectId: "chronomessage" })
      ]
    }
  ]);

  const config = useMemo(
    () =>
      createConfig({
        autoConnect: true,
        connectors,
        publicClient,
        webSocketPublicClient
      }),
    [connectors, publicClient, webSocketPublicClient]
  );

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={[chain]} theme={midnightTheme()}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
