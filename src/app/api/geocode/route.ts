import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body as { text: string };

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "缺少地址文本" },
        { status: 400 },
      );
    }

    const key = process.env.AMAP_WEB_SERVICE_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "服务器缺少 AMAP_WEB_SERVICE_KEY 环境变量" },
        { status: 500 },
      );
    }

    const url = new URL("https://restapi.amap.com/v3/geocode/geo");
    url.searchParams.set("key", key);
    url.searchParams.set("address", text);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "1" || !data.geocodes?.length) {
      return NextResponse.json(
        { error: "未能解析出经纬度", raw: data },
        { status: 400 },
      );
    }

    const first = data.geocodes[0];
    const [lng, lat] = String(first.location).split(",").map(Number);

    return NextResponse.json({
      lat,
      lng,
      formatted_address: first.formatted_address,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "服务器错误" },
      { status: 500 },
    );
  }
}

