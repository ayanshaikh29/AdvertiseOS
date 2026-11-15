import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/db/fileRepo";
import { createApiKeyRecord, generateRawKey } from "@/lib/mcp/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const repo = await getRepo();
    const keys = await repo.listApiKeys();

    // Never expose key hashes
    const sanitized = keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      scopes: k.scopes,
      role: k.role,
      ip_allowlist: k.ip_allowlist,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      revoked_at: k.revoked_at,
    }));

    return NextResponse.json({ keys: sanitized });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, scopes = ["read"], role = "viewer", ip_allowlist } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: "At least one scope is required" }, { status: 400 });
    }

    const rawKey = generateRawKey();
    const keyData = createApiKeyRecord({
      name,
      rawKey,
      scopes,
      role,
      ip_allowlist,
    });

    const repo = await getRepo();
    const created = await repo.createApiKey(keyData);

    // Return the rawKey ONLY ONCE upon creation
    return NextResponse.json({
      apiKey: {
        id: created.id,
        name: created.name,
        key_prefix: created.key_prefix,
        scopes: created.scopes,
        role: created.role,
        ip_allowlist: created.ip_allowlist,
        created_at: created.created_at,
      },
      rawKey,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    const repo = await getRepo();
    const ok = await repo.revokeApiKey(id);

    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
