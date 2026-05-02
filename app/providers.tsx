"use client";

import "@rainbow-me/rainbowkit/styles.css";

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { metaMask } from "@wagmi/connectors";
import { createConfig, http, WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";

import { publicEnv } from "@/lib/env";

// We use this file to set up the wallet connection.
// It connects the app to MetaMask wallets and the Sepolia test network.

const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "CampusSwap",
        url: "http://127.0.0.1:3000"
      }
    })
  ],
  transports: {
    [sepolia.id]: http(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC)
  },
  ssr: true
});

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="en-US"
          theme={darkTheme({
            accentColor: "#6f9a79",
            accentColorForeground: "#f3fbf5",
            borderRadius: "large",
            overlayBlur: "small"
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
