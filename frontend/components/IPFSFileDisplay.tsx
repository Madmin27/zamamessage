"use client";

import { useEffect, useState } from "react";

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

const metadataCache = new Map<string, FileMetadata>();

export function IPFSFileDisplay({ metadataHash }: IPFSFileDisplayProps) {
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchToken, setFetchToken] = useState(0);

  useEffect(() => {
    if (!metadataHash) {
      setMetadata(null);
      setLoading(false);
      return;
    }

    if (metadataCache.has(metadataHash)) {
      setMetadata(metadataCache.get(metadataHash)!);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchMetadata = async () => {
      setMetadata(null);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/ipfs/${metadataHash}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Proxy responded with ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as FileMetadata;

        if (!data || typeof data.ipfsHash !== "string") {
          throw new Error("Proxy returned invalid metadata payload");
        }

        if (!isMounted) {
          return;
        }

        metadataCache.set(metadataHash, data);
        setMetadata(data);
      } catch (err) {
        if (!isMounted || (err as Error).name === "AbortError") {
          return;
        }

        console.error("Metadata fetch failed:", err);
        setError("Failed to load file information from IPFS.");
        setMetadata(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [metadataHash, fetchToken]);

  const handleRetry = () => {
    if (!metadataHash) {
      return;
    }

    metadataCache.delete(metadataHash);
    setError(null);
    setLoading(true);
    setFetchToken((token) => token + 1);
  };

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
          onClick={handleRetry}
          className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-sm transition"
        >
          Retry
        </button>
        <p className="text-xs text-red-300/70">
          If the issue persists, refresh the page or contact support.
        </p>
      </div>
    );
  }

  const { ipfsHash, fileName, fileSize, fileType, message } = metadata;
  const safeFileType = fileType || "application/octet-stream";
  const fileUrl = `/api/ipfs/${ipfsHash}`;
  const readableSize = Number.isFinite(fileSize) ? (fileSize / 1024 / 1024).toFixed(2) : null;

  return (
    <div className="space-y-3">
      {message && (
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-3">
          <p className="text-sm text-slate-300 mb-1 font-semibold">Message</p>
          <p className="text-slate-200 whitespace-pre-wrap">{message}</p>
        </div>
      )}

      <div className="rounded-lg bg-purple-900/20 border border-purple-400/40 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-purple-300">
          <span className="font-semibold">Attachment</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-purple-400/70">File name:</span>
            <span className="font-mono text-purple-200 break-all">{fileName}</span>
          </div>
          {readableSize && (
            <div className="flex items-center gap-2">
              <span className="text-purple-400/70">Size:</span>
              <span className="text-purple-200">{readableSize} MB</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-purple-400/70">Type:</span>
            <span className="text-purple-200">{safeFileType}</span>
          </div>
        </div>
      </div>

      {safeFileType.startsWith("image/") && (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full max-h-96 object-contain bg-slate-900"
          />
        </div>
      )}

      {safeFileType.startsWith("video/") && (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <video controls className="w-full max-h-96 bg-slate-900" src={fileUrl} />
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg bg-slate-900/50 border border-slate-700 p-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">IPFS Hash (File):</span>
          <code className="font-mono text-cyan-400 break-all">{ipfsHash}</code>
        </div>
        <a
          href={fileUrl}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 transition text-sm font-medium"
        >
          Download
        </a>
      </div>
    </div>
  );
}
