"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Listing = {
  id: number;
  title: string;
  lat: number | null;
  lng: number | null;
};

type Company = {
  id: number;
  name: string;
  lat: number;
  lng: number;
};

type CommuteResult = {
  duration: number;
  distance: number;
  walking_distance: number;
};

declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

export default function CommutePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedListingId, setSelectedListingId] = useState<number | "">("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | "">("");

  const [commuting, setCommuting] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);
  const [result, setResult] = useState<CommuteResult | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const transferRef = useRef<any>(null);

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId) ?? null,
    [listings, selectedListingId],
  );
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [listingsRes, companiesRes] = await Promise.all([
          fetch("/api/listings", { method: "GET" }),
          fetch("/api/companies", { method: "GET" }),
        ]);
        const listingsJson = await listingsRes.json();
        const companiesJson = await companiesRes.json();
        if (!listingsRes.ok) throw new Error(listingsJson?.error ?? "加载房源失败");
        if (!companiesRes.ok) throw new Error(companiesJson?.error ?? "加载公司失败");
        setListings(
          (listingsJson.data ?? []).filter((l: Listing) => l.lat != null && l.lng != null),
        );
        setCompanies(companiesJson.data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "加载数据失败，请检查后端 API 和数据库配置。");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleCompute = async () => {
    setCommuteError(null);
    setResult(null);

    const listing = selectedListing;
    const company = selectedCompany;

    if (!listing || !company || listing.lat == null || listing.lng == null) {
      setCommuteError("请选择带有经纬度的房源和公司。");
      return;
    }

    setCommuting(true);
    try {
      // 1) 用高德 JS SDK 渲染“高德风格”的公交换乘面板 + 地图路线
      await ensureAmapReady();
      renderTransitRoute(listing, company);

      // 2) 同时调用服务端接口拿一个摘要（时间/距离）作为补充
      const res = await fetch("/api/commute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: { lat: listing.lat, lng: listing.lng },
          destination: { lat: company.lat, lng: company.lng },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "通勤计算失败");
      }

      setResult({
        duration: data.duration ?? 0,
        distance: data.distance ?? 0,
        walking_distance: data.walking_distance ?? 0,
      });
    } catch (e: any) {
      setCommuteError(e?.message ?? "通勤计算失败，请稍后重试。");
    } finally {
      setCommuting(false);
    }
  };

  const ensureAmapReady = async () => {
    if (window.AMap) return;

    const res = await fetch("/api/config", { method: "GET" });
    const json = await res.json();
    const key = json?.amapJsKey;
    const securityJsCode = json?.securityJsCode;
    if (!key) throw new Error("缺少 NEXT_PUBLIC_AMAP_JS_KEY 环境变量");
    if (securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode: String(securityJsCode) };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-amap="true"]'
    );
    if (existing) {
      if (window.AMap) return;
      await new Promise<void>((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("高德地图脚本加载失败")), {
          once: true,
        });
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
      script.async = true;
      script.dataset.amap = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("高德地图脚本加载失败，请检查 key 是否正确。"));
      document.body.appendChild(script);
    });
  };

  const renderTransitRoute = (listing: Listing, company: Company) => {
    if (!mapRef.current || !panelRef.current) return;
    if (!window.AMap) return;

    // 清空面板
    panelRef.current.innerHTML = "";

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.AMap.Map(mapRef.current, {
        zoom: 12,
        center: [listing.lng!, listing.lat!],
      });
    }

    const map = mapInstanceRef.current;

    // 确保插件加载
    window.AMap.plugin(["AMap.Transfer"], () => {
      // 释放旧实例
      if (transferRef.current) {
        try {
          transferRef.current.clear?.();
        } catch {}
        transferRef.current = null;
      }

      const transfer = new window.AMap.Transfer({
        map,
        panel: panelRef.current,
        city: "上海", // 可后续做成可配置/自动识别
        policy: window.AMap.TransferPolicy?.LEAST_TIME ?? 0,
      });

      transfer.search(
        new window.AMap.LngLat(listing.lng!, listing.lat!),
        new window.AMap.LngLat(company.lng, company.lat),
        (status: string, res: any) => {
          if (status !== "complete") {
            setCommuteError(res?.info ?? "未能获取通勤方案（公交换乘）");
          } else {
            setCommuteError(null);
          }
        },
      );

      transferRef.current = transfer;
    });
  };

  const formatMinutes = (seconds: number) =>
    `${Math.round(seconds / 60)} 分钟`;

  const formatKm = (meters: number) =>
    `${(meters / 1000).toFixed(1)} 公里`;

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-5xl py-10 px-4 sm:px-8">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              自动通勤计算（房源 → 公司）
            </h1>
            <p className="text-sm text-zinc-600">
              选择一套房源和一家公司，使用高德公交换乘接口估算通勤时间和距离。
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          >
            返回首页
          </a>
        </header>

        {loading && (
          <p className="text-sm text-zinc-500">正在加载房源和公司数据...</p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && (
          <section className="grid gap-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  选择公司
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) =>
                    setSelectedCompanyId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="">请选择公司</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {companies.length === 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    还没有公司数据，请在 Supabase 的{" "}
                    <code>companies</code> 表中插入几条记录。
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  选择房源
                </label>
                <select
                  value={selectedListingId}
                  onChange={(e) =>
                    setSelectedListingId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="">请选择房源</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
                {listings.length === 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    没有带经纬度的房源，请在「房源管理」中补充经纬度。
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCompute}
                disabled={
                  commuting ||
                  !selectedCompanyId ||
                  !selectedListingId
                }
                className="flex h-9 items-center rounded-full bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {commuting ? "计算中..." : "计算通勤时间和距离"}
              </button>

              {commuteError && (
                <p className="text-xs text-red-600">
                  {commuteError}
                </p>
              )}
              </div>

              <div className="space-y-3 border-t border-zinc-100 pt-4 text-sm sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <h2 className="text-base font-medium text-zinc-900">
                通勤结果
              </h2>
              {!result && !commuteError && (
                <p className="text-xs text-zinc-500">
                  请选择房源和公司后点击「计算」，将会显示估算的通勤时间和距离。
                </p>
              )}
              {result && (
                <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                  <p>
                    预计总时间：{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatMinutes(result.duration)}
                    </span>
                  </p>
                  <p>
                    预计总距离：{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatKm(result.distance)}
                    </span>
                  </p>
                  <p>
                    预计步行距离：{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatKm(result.walking_distance)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    注：数据来自高德公交换乘接口，仅供估算参考。
                  </p>
                </div>
              )}
              </div>
            </div>

            <div className="grid gap-4 pt-2 lg:grid-cols-[1fr_420px]">
              <div
                ref={mapRef}
                className="h-[520px] w-full rounded-xl bg-zinc-200"
              />
              <div className="rounded-xl border border-zinc-100 bg-white p-3">
                <div className="mb-2 text-sm font-medium text-zinc-900">
                  高德路线详情（公交换乘）
                </div>
                <div
                  ref={panelRef}
                  className="h-[480px] overflow-auto text-sm"
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

