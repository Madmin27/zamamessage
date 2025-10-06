import "./globals.css";
import type { ReactNode } from "react";
import { Metadata } from "next";
import { Providers } from "../components/Providers";

export const metadata: Metadata = {
  title: "ChronoMessage | Zaman Kilitli Mesajlar",
  description: "Zama FHEVM üzerinde çalışan zaman kilitli mesajlaşma uygulaması"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
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
