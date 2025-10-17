"use client";

import { useEffect, useState } from "react";

interface FileMetadata {
  type: string;
  ipfsHash?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  message?: string;
  shortHash?: string;
  createdAt?: string;
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

  const normalizeMetadata = (raw: any): FileMetadata => {
    if (!raw || typeof raw !== "object") {
      return { type: "unknown" };
    }

    const inferredType =
      typeof raw.type === "string"
        ? raw.type
        : raw.ipfs || raw.ipfsHash
        ? "file"
        : "text";

    const normalized: FileMetadata = {
      type: inferredType,
      ipfsHash:
        typeof raw.ipfs === "string"
          ? raw.ipfs
          : typeof raw.ipfsHash === "string"
          ? raw.ipfsHash
          : undefined,
      fileName:
        typeof raw.name === "string"
          ? raw.name
          : typeof raw.fileName === "string"
          ? raw.fileName
          : undefined,
      fileSize:
        typeof raw.size === "number"
          ? raw.size
          : typeof raw.fileSize === "number"
          ? raw.fileSize
          : undefined,
      fileType:
        typeof raw.mimeType === "string"
          ? raw.mimeType
          : typeof raw.fileType === "string"
          ? raw.fileType
          : inferredType === "text"
          ? "text/plain; charset=utf-8"
          : undefined,
      message:
        typeof raw.message === "string"
          ? raw.message
          : typeof raw.content === "string"
          ? raw.content
          : undefined,
      shortHash:
        typeof raw.shortHash === "string" ? raw.shortHash : undefined,
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined
    };

    return normalized;
  };

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

        const raw = await response.json();
        const normalized = normalizeMetadata(raw);

        if (!isMounted) {
          return;
        }

        metadataCache.set(metadataHash, normalized);
        setMetadata(normalized);
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

  const { ipfsHash, fileName, fileSize, fileType, message, type, shortHash, createdAt } = metadata;
  const safeFileType = fileType || "application/octet-stream";
  const hasFile = type !== "text" && typeof ipfsHash === "string" && ipfsHash.length > 0;
  const fileUrl = hasFile ? `/api/ipfs/${ipfsHash}` : "";
  const readableSize = hasFile && Number.isFinite(fileSize) ? (fileSize! / 1024 / 1024).toFixed(2) : null;
  const createdAtLabel = (() => {
    if (!createdAt) {
      return null;
    }
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toLocaleString();
  })();

  return (
    <div className="space-y-3">
      {message && (
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-3">
          <p className="text-sm text-slate-300 mb-1 font-semibold">Message</p>
          <p className="text-slate-200 whitespace-pre-wrap">{message}</p>
        </div>
      )}
      {hasFile ? (
        <>
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
        </>
      ) : (
        <div className="rounded-lg bg-slate-900/40 border border-slate-700 p-3 text-xs text-slate-300 space-y-1">
          <div>
            Metadata hash: <code className="font-mono text-cyan-300 break-all">{metadataHash}</code>
          </div>
          {shortHash && (
            <div>
              Short hash: <code className="font-mono text-cyan-300 break-all">{shortHash}</code>
            </div>
          )}
          {createdAtLabel && <div>Uploaded: {createdAtLabel}</div>}
          <p className="text-slate-400">
            This message was stored as encrypted metadata to support longer text payloads.
          </p>
        </div>
      )}
    </div>
  );
}
