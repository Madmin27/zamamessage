import "./globals.css";
import type { ReactNode } from "react";
import { Metadata } from "next";
import { Providers } from "../components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL('https://zama.minen.com.tr'),
  title: "ChronoMessage | Time-Locked Messages",
  description: "Send encrypted time-locked messages on Base. Messages can only be read after the specified unlock time.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "ChronoMessage",
    description: "Time-locked encrypted messages on Base blockchain",
    url: "https://zama.minen.com.tr",
    siteName: "ChronoMessage",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "ChronoMessage Icon"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ChronoMessage",
    description: "Time-locked encrypted messages on Base blockchain",
    images: ["/icon.svg"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-midnight text-slate-100" suppressHydrationWarning>
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
