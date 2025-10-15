import { promises as fs } from "fs";
import path from "path";

interface MappingRecord {
  shortHash: string;
  fullHash: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  updatedAt: string;
}

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "metadata-mapping.json");

async function readStore(): Promise<Record<string, MappingRecord>> {
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, MappingRecord>;
      return parsed ?? {};
    } catch (err) {
      console.warn("metadataStore: corrupted JSON detected, resetting store", err);
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

async function writeStore(store: Record<string, MappingRecord>): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf-8");
}

export async function upsertMapping(record: {
  shortHash: string;
  fullHash: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}): Promise<MappingRecord> {
  const trimmedHash = record.shortHash.trim();
  const trimmedFull = record.fullHash.trim();
  if (!trimmedHash || !trimmedFull) {
    throw new Error("shortHash and fullHash are required");
  }

  const payload: MappingRecord = {
    shortHash: trimmedHash,
    fullHash: trimmedFull,
    fileName: record.fileName,
    fileSize: record.fileSize,
    mimeType: record.mimeType,
    updatedAt: new Date().toISOString()
  };

  const store = await readStore();
  store[trimmedHash] = payload;
  await writeStore(store);
  return payload;
}

export async function getMapping(shortHash: string): Promise<MappingRecord | undefined> {
  const trimmedHash = shortHash.trim();
  if (!trimmedHash) {
    return undefined;
  }
  const store = await readStore();
  return store[trimmedHash];
}

export async function getAllMappings(): Promise<MappingRecord[]> {
  const store = await readStore();
  return Object.values(store);
}
