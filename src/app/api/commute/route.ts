import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, destination } = body as {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
    };

    if (
      !origin ||
      !destination ||
      origin.lat == null ||
      origin.lng == null ||
      destination.lat == null ||
      destination.lng == null
    ) {
      return NextResponse.json(
        { error: "缺少经纬度参数" },
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

    // 使用高德「路径规划 - 公交换乘」接口，计算通勤时间和距离
    const url = new URL(
      "https://restapi.amap.com/v3/direction/transit/integrated",
    );
    url.searchParams.set("key", key);
    url.searchParams.set(
      "origin",
      `${origin.lng},${origin.lat}`,
    );
    url.searchParams.set(
      "destination",
      `${destination.lng},${destination.lat}`,
    );
    url.searchParams.set("city", "010"); // 可根据需要调整城市编码
    url.searchParams.set("strategy", "0"); // 综合最快方案

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "1" || !data.route?.transits?.length) {
      return NextResponse.json(
        { error: "未能获取通勤方案", raw: data },
        { status: 500 },
      );
    }

    const best = data.route.transits[0];
    return NextResponse.json({
      duration: Number(best.duration ?? 0), // 秒
      distance: Number(best.distance ?? 0), // 米
      walking_distance: Number(best.walking_distance ?? 0), // 米
      segments: best.segments ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "服务器错误" },
      { status: 500 },
    );
  }
}

