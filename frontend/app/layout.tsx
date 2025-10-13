import "./globals.css";
import type { ReactNode } from "react";
import { Metadata } from "next";
import Script from "next/script";
import { Providers } from "../components/Providers";
import { FarcasterProvider } from "../components/FarcasterProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://zama.minen.com.tr'),
  title: "SealedMessage | Time-Locked Messages",
  description: "Send encrypted time-locked messages on Base. Messages can only be read after the specified unlock time.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "SealedMessage",
    description: "Time-locked encrypted messages on Base blockchain",
    url: "https://zama.minen.com.tr",
    siteName: "SealedMessage",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 800,
        alt: "SealedMessage - Time-Locked Messages on Base"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "SealedMessage",
    description: "Time-locked encrypted messages on Base blockchain",
    images: ["/preview.png"]
  },
  other: {
    // Farcaster Frame Metadata
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://zama.minen.com.tr/preview.png',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': 'Open App',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://zama.minen.com.tr',
    'og:image': 'https://zama.minen.com.tr/preview.png'
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Global polyfill for Zama SDK */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if (typeof global === 'undefined') {
              window.global = window;
            }
          `
        }} />
      </head>
      <body className="min-h-screen bg-midnight text-slate-100" suppressHydrationWarning>
        <FarcasterProvider>
          <Providers>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 overflow-visible">
              {children}
            </div>
          </Providers>
        </FarcasterProvider>
      </body>
    </html>
  );
}
