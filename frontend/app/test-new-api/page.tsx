export const dynamic = 'force-dynamic';
export const revalidate = 0;

import TestNewFHEAPI from "@/components/TestNewFHEAPI";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function TestNewAPIPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Wallet Button - Üstte */}
      <div className="absolute top-4 right-4 z-50">
        <ConnectButton />
      </div>
      
      {/* Test Component */}
      <div className="py-12">
        <TestNewFHEAPI />
      </div>
    </div>
  );
}
