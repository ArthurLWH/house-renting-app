import { NextRequest, NextResponse } from "next/server";
import { getCloudbaseDb } from "@/lib/cloudbaseServer";

type Company = {
  id?: number;
  name: string;
  lat: number;
  lng: number;
};

export async function GET() {
  try {
    const db = getCloudbaseDb();
    const res = await db.collection("companies").orderBy("id", "asc").limit(200).get();
    return NextResponse.json({ data: res.data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getCloudbaseDb();
    const body = (await req.json()) as Company;
    if (!body?.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const last = await db.collection("companies").orderBy("id", "desc").limit(1).get();
    const nextId = (last.data?.[0]?.id ?? 0) + 1;

    await db.collection("companies").add({
      ...body,
      id: nextId,
      name: body.name.trim(),
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
    const body = (await req.json()) as Partial<Company> & { id: number };
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { id, ...patch } = body;
    await db.collection("companies").where({ id }).update({ ...patch, updatedAt: Date.now() });
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
    await db.collection("companies").where({ id }).remove();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}

