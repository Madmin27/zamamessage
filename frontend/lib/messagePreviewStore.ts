import { promises as fs } from "fs";
import path from "path";

export interface PreviewRecord {
  messageId: string;
  previewDataUrl: string;
  mimeType?: string;
  shortHash?: string | null;
  fileName?: string | null;
  createdAt: string;
  updatedAt: string;
}

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "message-previews.json");

async function readStore(): Promise<Record<string, PreviewRecord>> {
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, PreviewRecord>;
      return parsed ?? {};
    } catch (err) {
      console.warn("messagePreviewStore: corrupted JSON detected, resetting store", err);
      await writeStore({});
      return {};
    }
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

async function writeStore(store: Record<string, PreviewRecord>): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf-8");
}

export async function upsertPreview(record: {
  messageId: string;
  previewDataUrl: string;
  mimeType?: string | null;
  shortHash?: string | null;
  fileName?: string | null;
}): Promise<PreviewRecord> {
  const trimmedId = record.messageId.trim();
  if (!trimmedId) {
    throw new Error("messageId is required");
  }
  if (!record.previewDataUrl || !record.previewDataUrl.startsWith("data:")) {
    throw new Error("previewDataUrl must be a data URI");
  }

  const store = await readStore();
  const existing = store[trimmedId];
  const now = new Date().toISOString();
  const payload: PreviewRecord = {
    messageId: trimmedId,
    previewDataUrl: record.previewDataUrl,
    mimeType: record.mimeType ?? undefined,
    shortHash: record.shortHash ?? existing?.shortHash ?? null,
    fileName: record.fileName ?? existing?.fileName ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  store[trimmedId] = payload;
  await writeStore(store);
  return payload;
}

export async function getPreview(messageId: string): Promise<PreviewRecord | undefined> {
  const trimmedId = messageId.trim();
  if (!trimmedId) {
    return undefined;
  }
  const store = await readStore();
  return store[trimmedId];
}

export async function getAllPreviews(): Promise<PreviewRecord[]> {
  const store = await readStore();
  return Object.values(store);
}
