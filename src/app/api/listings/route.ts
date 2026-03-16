import { NextRequest, NextResponse } from "next/server";
import { getCloudbaseDb } from "@/lib/cloudbaseServer";

type Listing = {
  id?: number;
  title: string;
  description?: string | null;
  price?: number | null;
  city?: string | null;
  cover_url?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export async function GET(req: NextRequest) {
  try {
    const db = getCloudbaseDb();
    const minPrice = req.nextUrl.searchParams.get("minPrice");
    const maxPrice = req.nextUrl.searchParams.get("maxPrice");

    const _ = db.command;
    let where: any = {};
    if (minPrice) where.price = _.gte(Number(minPrice));
    if (maxPrice) where.price = { ...(where.price ?? {}), ..._.lte(Number(maxPrice)) };

    const res = await db
      .collection("listings")
      .where(where)
      .orderBy("id", "desc")
      .limit(100)
      .get();

    return NextResponse.json({ data: res.data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getCloudbaseDb();
    const body = (await req.json()) as Listing;
    if (!body?.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    // 简单自增 id（自用足够；并发写入可改为云端事务/计数器）
    const last = await db.collection("listings").orderBy("id", "desc").limit(1).get();
    const nextId = (last.data?.[0]?.id ?? 0) + 1;

    await db.collection("listings").add({
      ...body,
      id: nextId,
      title: body.title.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return NextResponse.json({ ok: true, id: nextId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getCloudbaseDb();
    const body = (await req.json()) as Partial<Listing> & { id: number };
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { id, ...patch } = body;
    await db
      .collection("listings")
      .where({ id })
      .update({
        ...patch,
        updatedAt: Date.now(),
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getCloudbaseDb();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.collection("listings").where({ id }).remove();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}

