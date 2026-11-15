import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ChatStore } from "@/lib/db/chatStore";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = ChatStore.getConversation(id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = ChatStore.getMessages(id);
  return NextResponse.json({ conversation, messages });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const updated = ChatStore.updateConversation(id, { title });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ conversation: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = ChatStore.deleteConversation(id);
  return NextResponse.json({ ok });
}
