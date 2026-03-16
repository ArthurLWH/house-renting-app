"use client";

import { useEffect, useRef, useState } from "react";

type Listing = {
  id: number;
  title: string;
  price: number | null;
  city: string | null;
  address?: string | null;
  water_price?: number | null;
  electricity_price?: number | null;
  lat: number | null;
  lng: number | null;
};

declare global {
  interface Window {
    AMap?: any;
  }
}

export default function MapPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/listings", { method: "GET" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "加载失败");
        setListings(
          (json.data ?? []).filter(
            (l: Listing) => l.lat != null && l.lng != null,
          ),
        );
      } catch (e: any) {
        setError(e?.message ?? "加载失败");
      }
      setLoading(false);
    };

    fetchListings();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.AMap) return;
      if (mapInstanceRef.current) return;

      const first = listings[0];
      const center =
        first && first.lng != null && first.lat != null
          ? [first.lng, first.lat]
          : [116.397428, 39.90923]; // 默认北京天安门

      const map = new window.AMap.Map(mapRef.current, {
        zoom: 11,
        center,
      });

      listings.forEach((item) => {
        if (item.lng == null || item.lat == null) return;
        const marker = new window.AMap.Marker({
          position: [item.lng, item.lat],
          title: item.title,
        });
        marker.setMap(map);

        const infoText = `
          <div style="font-size:12px;">
            <div style="font-weight:600;margin-bottom:4px;">${item.title}</div>
            <div style="margin-bottom:2px;">${
              item.price ? `¥${item.price}` : "价格待定"
            }</div>
            <div style="color:#6b7280;margin-bottom:2px;">${
              item.address || item.city || "位置未知"
            }</div>
            <div style="color:#6b7280;">${
              item.water_price != null ? `水¥${item.water_price}/吨` : ""
            }${
              item.water_price != null && item.electricity_price != null
                ? " · "
                : ""
            }${
              item.electricity_price != null
                ? `电¥${item.electricity_price}/度`
                : ""
            }</div>
          </div>
        `;
        const infoWindow = new window.AMap.InfoWindow({
          content: infoText,
          offset: new window.AMap.Pixel(0, -30),
        });

        marker.on("click", () => {
          infoWindow.open(map, marker.getPosition());
        });
      });

      mapInstanceRef.current = map;
    };

    const ensureScript = () => {
      if (window.AMap) {
        initMap();
        return;
      }

      const loadScript = (key: string) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-amap="true"]'
        );
        if (existing) {
          existing.addEventListener("load", initMap, { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
        script.async = true;
        script.dataset.amap = "true";
        script.onload = initMap;
        script.onerror = () => {
          setError("高德地图脚本加载失败，请检查 key 是否正确。");
        };
        document.body.appendChild(script);
      };

      const tryKey = async () => {
        const inlineKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
        if (inlineKey) return loadScript(inlineKey);

        try {
          const res = await fetch("/api/config", { method: "GET" });
          const json = await res.json();
          const k = json?.amapJsKey;
          if (!k) throw new Error("missing key");
          loadScript(String(k));
        } catch {
          setError("缺少 NEXT_PUBLIC_AMAP_JS_KEY 环境变量");
        }
      };

      void tryKey();
    };

    if (!loading && !error) {
      ensureScript();
    }
  }, [loading, error, listings]);

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-5xl py-10 px-4 sm:px-8">
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              房源地图视图
            </h1>
            <p className="text-sm text-zinc-600">
              使用高德地图展示带有经纬度信息的房源，点击标点查看基本信息。
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          >
            返回列表页
          </a>
        </header>

        <section className="mb-3 text-xs text-zinc-500">
          已加载房源数量：{listings.length}（仅显示已填写经纬度的房源）
        </section>

        {error && (
          <p className="mb-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div
          ref={mapRef}
          className="h-[520px] w-full rounded-xl bg-zinc-200"
        />
      </main>
    </div>
  );
}

