import { NextResponse } from "next/server";
import { upsertPreview, getAllPreviews } from "@/lib/messagePreviewStore";

interface PostBody {
  messageId?: string;
  previewDataUrl?: string;
  mimeType?: string | null;
  shortHash?: string | null;
  fileName?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    if (!body?.messageId || !body?.previewDataUrl) {
      return NextResponse.json({ error: "messageId and previewDataUrl are required" }, { status: 400 });
    }

    const record = await upsertPreview({
      messageId: body.messageId,
      previewDataUrl: body.previewDataUrl,
      mimeType: body.mimeType ?? undefined,
      shortHash: body.shortHash ?? undefined,
      fileName: body.fileName ?? undefined
    });

    return NextResponse.json({ ok: true, record });
  } catch (err) {
    console.error("message-preview POST failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const records = await getAllPreviews();
    return NextResponse.json({ ok: true, records });
  } catch (err) {
    console.error("message-preview GET failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
