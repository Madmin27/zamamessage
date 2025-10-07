"use client";

import { PropsWithChildren } from "react";
import { WagmiConfig, createConfig, configureChains } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { RainbowKitProvider, midnightTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { defineChain } from "viem";
import { supportedChains } from "../lib/chains";

export function Providers({ children }: PropsWithChildren) {
  // Convert supportedChains to wagmi chain format
  const chains = Object.values(supportedChains)
    .filter(c => c.testnet) // Only testnets for now
    .map(chainConfig =>
      defineChain({
        id: chainConfig.id,
        name: chainConfig.name,
        network: chainConfig.network,
        nativeCurrency: chainConfig.nativeCurrency,
        rpcUrls: {
          default: { http: [chainConfig.rpcUrls.default] },
          public: { http: [chainConfig.rpcUrls.public || chainConfig.rpcUrls.default] }
        },
        blockExplorers: chainConfig.blockExplorer
          ? {
              default: {
                name: "Explorer",
                url: chainConfig.blockExplorer
              }
            }
          : undefined,
        testnet: chainConfig.testnet
      })
    );

  const { publicClient, webSocketPublicClient } = configureChains(
    chains,
    [
      jsonRpcProvider({
        rpc: (chain) => {
          const chainConfig = Object.values(supportedChains).find(c => c.id === chain.id);
          return { http: chainConfig?.rpcUrls.default || chain.rpcUrls.default.http[0] };
        }
      })
    ]
  );

  const connectors = connectorsForWallets([
    {
      groupName: "Önerilen",
      wallets: [
        injectedWallet({ chains }),
        metaMaskWallet({ chains, projectId: "sealedmessage" })
      ]
    }
  ]);

  const config = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient
  });

  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains} theme={midnightTheme()}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
