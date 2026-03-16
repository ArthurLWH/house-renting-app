"use client";

import { FormEvent, useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
  lat: number;
  lng: number;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    id?: number;
    name: string;
    lat: string;
    lng: string;
  }>({
    name: "",
    lat: "",
    lng: "",
  });

  const [geocodeText, setGeocodeText] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const isEditing = form.id !== undefined;

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "加载失败");
      setCompanies(json.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "加载失败");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
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
      name: form.name.trim(),
      lat: Number(form.lat),
      lng: Number(form.lng),
    };

    try {
      if (!payload.name) {
        throw new Error("公司名称不能为空");
      }
      if (Number.isNaN(payload.lat) || Number.isNaN(payload.lng)) {
        throw new Error("请先填写或解析出经纬度");
      }

      if (isEditing && form.id) {
        const res = await fetch("/api/companies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: form.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "保存失败");
      } else {
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "保存失败");
      }

      await loadCompanies();
      resetForm();
    } catch (err: any) {
      setError(err.message ?? "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Company) => {
    setForm({
      id: item.id,
      name: item.name,
      lat: String(item.lat),
      lng: String(item.lng),
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这家公司吗？")) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/companies?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) setError(json?.error ?? "删除失败");
    else await loadCompanies();
    setSaving(false);
  };

  const handleGeocode = async () => {
    if (!geocodeText.trim()) return;
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
  };

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-5xl py-10 px-4 sm:px-8">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              公司管理（通勤目的地）
            </h1>
            <p className="text-sm text-zinc-600">
              管理你的公司 / 办公地点，经纬度将用于通勤时间计算。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
            <a
              href="/commute"
              className="underline-offset-4 hover:underline"
            >
              查看通勤计算
            </a>
            <a
              href="/"
              className="underline-offset-4 hover:underline"
            >
              返回首页
            </a>
          </div>
        </header>

        <section className="mb-8 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-zinc-900">
            {isEditing ? "编辑公司" : "添加新公司"}
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
                  公司名称 *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="如：公司A（陆家嘴总部）"
                  required
                />
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
                  onClick={handleGeocode}
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

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex h-9 items-center rounded-full bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {saving ? "保存中..." : isEditing ? "保存修改" : "添加公司"}
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
          <h2 className="mb-4 text-lg font-medium text-zinc-900">已有公司</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">正在加载公司列表...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-zinc-500">
              还没有公司，先在上方表单中添加一条吧。
            </p>
          ) : (
            <div className="space-y-2">
              {companies.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        {item.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        lat: {item.lat.toFixed(5)}, lng:{" "}
                        {item.lng.toFixed(5)}
                      </span>
                    </div>
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

