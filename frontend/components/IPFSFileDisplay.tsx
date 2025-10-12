"use client";

import { useState, useEffect } from "react";

interface FileMetadata {
  ipfsHash: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  message?: string;
}

interface IPFSFileDisplayProps {
  metadataHash: string;
}

// Global cache ve başarılı gateway'i hatırla
const metadataCache = new Map<string, FileMetadata>();
let lastSuccessfulGateway: string | null = null;

export function IPFSFileDisplay({ metadataHash }: IPFSFileDisplayProps) {
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      // Cache kontrol et
      if (metadataCache.has(metadataHash)) {
        console.log("✅ Using cached metadata for:", metadataHash);
        setMetadata(metadataCache.get(metadataHash)!);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // IPFS gateway'leri - başarılı olan varsa önce onu dene
        const baseGateways = [
          `https://ipfs.io/ipfs/${metadataHash}`,
          `https://cloudflare-ipfs.com/ipfs/${metadataHash}`,
          `https://gateway.pinata.cloud/ipfs/${metadataHash}`
        ];
        
        // Başarılı gateway varsa onu başa al
        const gateways = lastSuccessfulGateway && metadataHash
          ? [lastSuccessfulGateway.replace(/\/ipfs\/.*$/, `/ipfs/${metadataHash}`), ...baseGateways.filter(g => !g.includes(lastSuccessfulGateway!.split('/')[2]))]
          : baseGateways;
        
        let lastError: Error | null = null;
        
        for (const gateway of gateways) {
          try {
            console.log(`🔍 [${metadataHash.substring(0, 8)}...] Trying gateway: ${gateway}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout (artırıldı)
            
            const response = await fetch(gateway, { 
              signal: controller.signal,
              mode: 'cors',
              headers: {
                'Accept': 'application/json'
              }
            });
            clearTimeout(timeoutId);
            
            console.log(`📡 [${metadataHash.substring(0, 8)}...] Response status: ${response.status} from ${gateway}`);
            
            if (response.ok) {
              const data = await response.json();
              setMetadata(data);
              setError(null);
              
              // Cache'e kaydet
              metadataCache.set(metadataHash, data);
              lastSuccessfulGateway = gateway;
              
              console.log(`✅ [${metadataHash.substring(0, 8)}...] Success from:`, gateway.split('/')[2]);
              return;
            }
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            console.warn(`⚠️ [${metadataHash.substring(0, 8)}...] Failed with status ${response.status}`);
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              console.warn(`⏱️ [${metadataHash.substring(0, 8)}...] Timeout (10s) for: ${gateway.split('/')[2]}`);
            } else {
              console.error(`❌ [${metadataHash.substring(0, 8)}...] Error from ${gateway.split('/')[2]}:`, err);
            }
            lastError = err instanceof Error ? err : new Error(String(err));
          }
        }
        
        throw lastError || new Error("All gateways failed");
      } catch (err) {
        console.error(`❌ [${metadataHash.substring(0, 8)}...] All gateways failed:`, err);
        setError("Failed to load file information from IPFS. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (metadataHash) {
      fetchMetadata();
    }
  }, [metadataHash]);

  if (loading) {
    return (
      <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-4">
        <p className="text-sm text-purple-300 animate-pulse">Loading file information...</p>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="rounded-lg bg-red-900/20 border border-red-400/40 p-4 space-y-3">
        <p className="text-sm text-red-300">{error || "Failed to load file"}</p>
        <p className="text-xs text-red-400 font-mono break-all">Metadata Hash: {metadataHash}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            // Force re-fetch by clearing cache for this hash
            metadataCache.delete(metadataHash);
            // Trigger useEffect
            window.location.reload();
          }}
          className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-sm transition"
        >
          🔄 Retry
        </button>
        <div className="text-xs text-red-300/70 space-y-1">
          <p>💡 Troubleshooting:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Check browser console for detailed errors</li>
            <li>Try refreshing the page</li>
            <li>File might still be propagating on IPFS network</li>
          </ul>
        </div>
      </div>
    );
  }

  const { ipfsHash, fileName, fileSize, fileType, message } = metadata;

  return (
    <div className="space-y-3">
      {/* Kullanıcının mesajı varsa göster */}
      {message && (
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-3">
          <p className="text-sm text-slate-300 mb-1 font-semibold">💬 Mesaj:</p>
          <p className="text-slate-200 whitespace-pre-wrap">{message}</p>
        </div>
      )}
      
      {/* Dosya bilgileri */}
      <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-purple-300">
          <span>📎</span>
          <span className="font-semibold">Ekli Dosya</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-purple-400/70">Dosya adı:</span>
            <span className="font-mono text-purple-200 break-all">{fileName}</span>
          </div>
          {fileSize > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-purple-400/70">Boyut:</span>
              <span className="text-purple-200">{(fileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-purple-400/70">Tip:</span>
            <span className="text-purple-200">{fileType}</span>
          </div>
        </div>
      </div>
      
      {/* Dosya önizlemesi */}
      {fileType.startsWith('image/') && (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <img 
            src={`https://ipfs.io/ipfs/${ipfsHash}`}
            alt={fileName} 
            className="w-full max-h-96 object-contain bg-slate-900"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('cloudflare')) {
                target.src = `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`;
              }
            }}
          />
        </div>
      )}
      
      {fileType.startsWith('video/') && (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <video 
            controls 
            className="w-full max-h-96 bg-slate-900"
            src={`https://ipfs.io/ipfs/${ipfsHash}`}
          />
        </div>
      )}
      
      {/* IPFS hash ve download */}
      <div className="flex flex-col gap-2 rounded-lg bg-slate-900/50 border border-slate-700 p-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">IPFS Hash (File):</span>
          <code className="font-mono text-cyan-400 break-all">
            {ipfsHash}
          </code>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 
              border border-blue-500/40 text-blue-300 transition text-sm font-medium"
          >
            📥 İndir (Pinata)
          </a>
          <a
            href={`https://ipfs.io/ipfs/${ipfsHash}`}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 
              border border-purple-500/40 text-purple-300 transition text-sm font-medium"
          >
            📥 İndir (IPFS.io)
          </a>
        </div>
      </div>
    </div>
  );
}
