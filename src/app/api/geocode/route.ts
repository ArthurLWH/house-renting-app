import { NextRequest, NextResponse } from "next/server";

function extractFromAmapCopy(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const url = lines.find((l) => /^https?:\/\//i.test(l)) ?? null;
  const title = lines[0] ?? null;

  // 尽量去掉明显不是地址的行
  const addressLines = lines.filter(
    (l) =>
      !/^https?:\/\//i.test(l) &&
      !/^(门牌地址|地址|位置|来自高德地图|高德地图|高德)/.test(l),
  );

  const address = addressLines.join(" ");
  return { title, address: address || text, url };
}

function tryParseLocationFromUrl(raw: string): { lng: number; lat: number } | null {
  try {
    const u = new URL(raw);
    const params = u.searchParams;
    const candidates = [
      params.get("location"),
      params.get("position"),
      params.get("lnglat"),
      params.get("coordinate"),
      params.get("q"), // 某些分享链接会把参数塞在 q 里
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      const m = c.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (m) {
        const lng = Number(m[1]);
        const lat = Number(m[3]);
        if (!Number.isNaN(lng) && !Number.isNaN(lat)) return { lng, lat };
      }
    }
    return null;
  } catch {
    return null;
  }
}

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

    const extracted = extractFromAmapCopy(text);

    // 优先：如果有高德分享链接，尽量从链接解析坐标（更精确）
    if (extracted.url) {
      try {
        // 1) 直接从链接参数里解析
        const direct = tryParseLocationFromUrl(extracted.url);
        let loc = direct;

        // 2) 尝试跟随跳转，解析最终 URL / HTML 中的坐标
        if (!loc) {
          const r = await fetch(extracted.url, { redirect: "follow" });
          const finalUrl = r.url || extracted.url;
          loc = tryParseLocationFromUrl(finalUrl);
          if (!loc) {
            const html = await r.text();
            const m = html.match(
              /(-?\d{2,3}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)/,
            );
            if (m) {
              const lng = Number(m[1]);
              const lat = Number(m[2]);
              if (!Number.isNaN(lng) && !Number.isNaN(lat)) loc = { lng, lat };
            }
          }
        }

        if (loc) {
          // 反查地址（可选但体验好）
          const regeo = new URL("https://restapi.amap.com/v3/geocode/regeo");
          regeo.searchParams.set("key", key);
          regeo.searchParams.set("location", `${loc.lng},${loc.lat}`);
          regeo.searchParams.set("radius", "1000");
          regeo.searchParams.set("extensions", "base");
          const regeoRes = await fetch(regeo.toString());
          const regeoJson = await regeoRes.json();
          const formatted =
            regeoJson?.regeocode?.formatted_address ?? null;

          return NextResponse.json({
            lat: loc.lat,
            lng: loc.lng,
            formatted_address: formatted,
            title: extracted.title,
          });
        }
      } catch {
        // 忽略链接解析失败，回退到地理编码
      }
    }

    const url = new URL("https://restapi.amap.com/v3/geocode/geo");
    url.searchParams.set("key", key);
    url.searchParams.set("address", extracted.address);

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
      title: extracted.title,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "服务器错误" },
      { status: 500 },
    );
  }
}

