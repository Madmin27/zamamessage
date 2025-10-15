import { NextResponse } from "next/server";
import { getMapping } from "@/lib/metadataStore";

interface Params {
  shortHash: string;
}

export async function GET(_request: Request, context: { params: Params }) {
  try {
    const { shortHash } = context.params;
    if (!shortHash) {
      return NextResponse.json({ error: "shortHash is required" }, { status: 400 });
    }

    const record = await getMapping(shortHash);
    if (!record) {
      return NextResponse.json({ ok: false, found: false }, { status: 404 });
    }

    return NextResponse.json({ ok: true, found: true, record });
  } catch (err) {
    console.error("metadata-mapping lookup failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
