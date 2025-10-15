import { NextResponse } from "next/server";
import { getPreview } from "@/lib/messagePreviewStore";

interface RouteContext {
  params: {
    messageId: string;
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { messageId } = context.params;
  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  try {
    const record = await getPreview(messageId);
    if (!record) {
      return NextResponse.json({ error: "Preview not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (err) {
    console.error("message-preview/[id] GET failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
