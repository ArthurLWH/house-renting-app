"use client";

import { useEffect, useMemo, useState } from "react";

type Listing = {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  address?: string | null;
  cover_url: string | null;
  lat: number | null;
  lng: number | null;
};

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minPriceDraft, setMinPriceDraft] = useState<string>("");
  const [maxPriceDraft, setMaxPriceDraft] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/listings", { method: "GET" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "加载失败");
        setListings(json.data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "加载失败");
      }
      setLoading(false);
    };

    fetchListings();
  }, []);

  const filteredListings = useMemo(() => {
    const min = minPrice;
    const max = maxPrice;

    return listings.filter((item) => {
      if (item.price == null) return true;
      if (min != null && item.price < min) return false;
      if (max != null && item.price > max) return false;
      return true;
    });
  }, [listings, minPrice, maxPrice]);

  const priceOptions = useMemo(() => {
    const opts: number[] = [];
    for (let v = 0; v <= 20000; v += 500) opts.push(v);
    return opts;
  }, []);

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-5xl py-10 px-4 sm:px-8">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-semibold text-zinc-900">
              租呗（最懂年轻人的租房工具）
            </h1>
            <p className="text-zinc-600">
              内测版 1.0
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm text-zinc-500">
            <a
              href="/manage"
              className="underline-offset-4 hover:underline"
            >
              管理房源
            </a>
            <a
              href="/companies"
              className="underline-offset-4 hover:underline"
            >
              管理公司
            </a>
            <a
              href="/map"
              className="underline-offset-4 hover:underline"
            >
              房源地图
            </a>
            <a
              href="/commute"
              className="underline-offset-4 hover:underline"
            >
              通勤计算
            </a>
          </nav>
        </header>

        <section className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-zinc-900">
            租金筛选
          </h2>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <div>
              <label className="mb-1 block text-xs text-zinc-600">
                最低租金（元）
              </label>
              <select
                value={minPriceDraft}
                onChange={(e) => setMinPriceDraft(e.target.value)}
                className="h-9 w-36 rounded-lg border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                <option value="">不限</option>
                {priceOptions.map((v) => (
                  <option key={v} value={String(v)}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-600">
                最高租金（元）
              </label>
              <select
                value={maxPriceDraft}
                onChange={(e) => setMaxPriceDraft(e.target.value)}
                className="h-9 w-36 rounded-lg border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                <option value="">不限</option>
                {priceOptions.map((v) => (
                  <option key={v} value={String(v)}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const min = minPriceDraft ? Number(minPriceDraft) : null;
                const max = maxPriceDraft ? Number(maxPriceDraft) : null;
                setMinPrice(min);
                setMaxPrice(max);
              }}
              className="h-8 rounded-full border border-zinc-300 px-3 text-xs text-zinc-700 transition hover:bg-zinc-50"
            >
              确认
            </button>
            <span className="text-xs text-zinc-500">
              当前显示 {filteredListings.length} 套房源
            </span>
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-zinc-900">房源列表</h2>
          {loading && (
            <p className="text-sm text-zinc-500">正在加载房源...</p>
          )}
          {error && (
            <p className="text-sm text-red-600">加载失败：{error}</p>
          )}
          {!loading && !error && filteredListings.length === 0 && (
            <p className="text-sm text-zinc-500">
              暂无房源数据，或筛选条件过于严格。
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {item.cover_url && (
                  <div className="h-40 w-full overflow-hidden bg-zinc-100">
                    {/* 这里可以后续换成 next/image */}
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="mb-1 line-clamp-1 text-base font-semibold text-zinc-900">
                    {item.title}
                  </h3>
                  <p className="mb-2 line-clamp-2 text-xs text-zinc-500">
                    {item.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-sm">
                    <span className="font-medium text-emerald-600">
                      {item.price ? `¥${item.price} / 晚` : "价格待定"}
                    </span>
                    <span className="text-xs text-zinc-500 line-clamp-1">
                      {item.address || item.city || "位置未知"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
