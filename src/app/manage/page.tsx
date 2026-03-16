 "use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Listing = {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  cover_url: string | null;
  lat: number | null;
  lng: number | null;
};

export default function ManageListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocodeText, setGeocodeText] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    id?: number;
    title: string;
    description: string;
    price: string;
    city: string;
    cover_url: string;
    lat: string;
    lng: string;
  }>({
    title: "",
    description: "",
    price: "",
    city: "",
    cover_url: "",
    lat: "",
    lng: "",
  });

  const isEditing = form.id !== undefined;

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, description, price, city, cover_url")
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setListings(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      price: "",
      city: "",
      cover_url: "",
      lat: "",
      lng: "",
    });
    setGeocodeText("");
    setGeocodeError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: form.price ? Number(form.price) : null,
      city: form.city.trim() || null,
      cover_url: form.cover_url.trim() || null,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
    };

    try {
      if (!payload.title) {
        throw new Error("标题不能为空");
      }

      if (isEditing && form.id) {
        const { error } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("listings").insert(payload);
        if (error) throw error;
      }

      await loadListings();
      resetForm();
    } catch (err: any) {
      setError(err.message ?? "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Listing) => {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      price: item.price != null ? String(item.price) : "",
      city: item.city ?? "",
      cover_url: item.cover_url ?? "",
      lat: item.lat != null ? String(item.lat) : "",
      lng: item.lng != null ? String(item.lng) : "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这条房源吗？")) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      setError(error.message);
    } else {
      await loadListings();
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-5xl py-10 px-4 sm:px-8">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              房源管理（添加 / 编辑 / 删除）
            </h1>
            <p className="text-sm text-zinc-600">
              通过 Supabase 的 <code>listings</code> 表管理房源数据。
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          >
            返回房源列表
          </a>
        </header>

        <section className="mb-8 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-zinc-900">
            {isEditing ? "编辑房源" : "添加新房源"}
          </h2>
          {error && (
            <p className="mb-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  标题 *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="如：地铁口两居室整租"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  城市
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="如：上海 · 浦东"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                高德复制内容（可直接粘贴 APP 中的「位置分享」文本）
              </label>
              <textarea
                value={geocodeText}
                onChange={(e) => setGeocodeText(e.target.value)}
                className="min-h-[60px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                placeholder={`例如：上海新江湾广场T4栋\n门牌地址\n民府路与江湾城路交叉口西南160米\nhttps://surl.amap.com/xxxx`}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={geocoding || !geocodeText.trim()}
                  onClick={async () => {
                    try {
                      setGeocoding(true);
                      setGeocodeError(null);
                      const res = await fetch("/api/geocode", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: geocodeText }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        throw new Error(data?.error ?? "解析失败");
                      }
                      setForm((f) => ({
                        ...f,
                        lat: String(data.lat),
                        lng: String(data.lng),
                      }));
                    } catch (e: any) {
                      setGeocodeError(e?.message ?? "解析失败，请稍后重试。");
                    } finally {
                      setGeocoding(false);
                    }
                  }}
                  className="flex h-8 items-center rounded-full border border-zinc-300 px-3 text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {geocoding ? "解析中..." : "从高德内容解析经纬度"}
                </button>
                {geocodeError && (
                  <span className="text-xs text-red-600">
                    {geocodeError}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  租金（元 / 晚 或 月）
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="例如：2600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  封面图片 URL
                </label>
                <input
                  type="url"
                  value={form.cover_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cover_url: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="可先用网络图片或 Supabase Storage 链接"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  纬度（lat）
                </label>
                <input
                  type="number"
                  value={form.lat}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lat: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="如：31.2304"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  经度（lng）
                </label>
                <input
                  type="number"
                  value={form.lng}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lng: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="如：121.4737"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                描述
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="min-h-[80px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                placeholder="如：距离×号地铁站步行5分钟，周边生活便利..."
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex h-9 items-center rounded-full bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {saving ? "保存中..." : isEditing ? "保存修改" : "添加房源"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-9 items-center rounded-full border border-zinc-300 px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  取消编辑
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-zinc-900">已有房源</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">正在加载房源...</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-zinc-500">
              还没有房源，先在上方表单中添加一条吧。
            </p>
          ) : (
            <div className="space-y-2">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        {item.title}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {item.city ?? "城市未知"}
                      </span>
                      {item.price != null && (
                        <span className="text-xs font-medium text-emerald-700">
                          ¥{item.price}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="h-7 rounded-full bg-white px-3 text-xs text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="h-7 rounded-full bg-red-50 px-3 text-xs text-red-600 transition hover:bg-red-100"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

