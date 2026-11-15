import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ChatStore } from "@/lib/db/chatStore";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || undefined;

  const conversations = ChatStore.listConversations(brandId);
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const brandId = body.brandId || "default";
  const title = body.title || "New Strategy Brief";

  const conversation = ChatStore.createConversation(brandId, title);
  return NextResponse.json({ conversation });
}
