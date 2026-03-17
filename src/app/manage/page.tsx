 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Listing = {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  address?: string | null;
  water_price?: number | null;
  electricity_price?: number | null;
  commute_company_id?: number | null;
  commute_duration_sec?: number | null;
  commute_distance_m?: number | null;
  cover_url: string | null;
  lat: number | null;
  lng: number | null;
};

type Company = {
  id: number;
  name: string;
  city?: string | null;
  lat: number;
  lng: number;
};

export default function ManageListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocodeText, setGeocodeText] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [commuting, setCommuting] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    id?: number;
    title: string;
    description: string;
    price: string;
    city: string;
    address: string;
    water_price: string;
    electricity_price: string;
    cover_url: string;
    lat: string;
    lng: string;
    commute_company_id: string;
    commute_duration_sec: string;
    commute_distance_m: string;
  }>({
    title: "",
    description: "",
    price: "",
    city: "",
    address: "",
    water_price: "",
    electricity_price: "",
    cover_url: "",
    lat: "",
    lng: "",
    commute_company_id: "",
    commute_duration_sec: "",
    commute_distance_m: "",
  });

  const isEditing = form.id !== undefined;
  const selectedCompany = useMemo(() => {
    const cid = form.commute_company_id ? Number(form.commute_company_id) : null;
    if (!cid) return null;
    return companies.find((c) => c.id === cid) ?? null;
  }, [companies, form.commute_company_id]);

  const loadData = async () => {
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
      setListings(listingsJson.data ?? []);
      setCompanies(companiesJson.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "加载失败");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 支持从列表页直接点进来编辑：/manage?editId=123
    if (typeof window === "undefined") return;
    const editIdStr = new URLSearchParams(window.location.search).get("editId");
    if (!editIdStr) return;
    const id = Number(editIdStr);
    if (!id || !listings.length) return;
    const target = listings.find((l) => l.id === id);
    if (target) handleEdit(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings.length]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      price: "",
      city: "",
      address: "",
      water_price: "",
      electricity_price: "",
      cover_url: "",
      lat: "",
      lng: "",
      commute_company_id: "",
      commute_duration_sec: "",
      commute_distance_m: "",
    });
    setGeocodeText("");
    setGeocodeError(null);
    setCommuteError(null);
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
      address: form.address.trim() || null,
      water_price: form.water_price ? Number(form.water_price) : null,
      electricity_price: form.electricity_price ? Number(form.electricity_price) : null,
      commute_company_id: form.commute_company_id ? Number(form.commute_company_id) : null,
      commute_duration_sec: form.commute_duration_sec ? Number(form.commute_duration_sec) : null,
      commute_distance_m: form.commute_distance_m ? Number(form.commute_distance_m) : null,
      cover_url: form.cover_url.trim() || null,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
    };

    try {
      if (!payload.title) {
        throw new Error("标题不能为空");
      }

      // 新增房源：强制先计算通勤标签
      if (!isEditing) {
        if (!payload.commute_company_id || !payload.commute_duration_sec) {
          throw new Error("新增房源前请先选择公司并计算通勤时间（生成通勤标签）。");
        }
      }

      if (isEditing && form.id) {
        const res = await fetch("/api/listings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: form.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "保存失败");
      } else {
        const res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "保存失败");
      }

      await loadData();
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
      address: item.address ?? "",
      water_price: item.water_price != null ? String(item.water_price) : "",
      electricity_price:
        item.electricity_price != null ? String(item.electricity_price) : "",
      commute_company_id:
        item.commute_company_id != null ? String(item.commute_company_id) : "",
      commute_duration_sec:
        item.commute_duration_sec != null ? String(item.commute_duration_sec) : "",
      commute_distance_m:
        item.commute_distance_m != null ? String(item.commute_distance_m) : "",
      cover_url: item.cover_url ?? "",
      lat: item.lat != null ? String(item.lat) : "",
      lng: item.lng != null ? String(item.lng) : "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这条房源吗？")) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/listings?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) setError(json?.error ?? "删除失败");
    else await loadData();
    setSaving(false);
  };

  const handleComputeCommute = async () => {
    setCommuteError(null);
    const company = selectedCompany;
    const lat = form.lat ? Number(form.lat) : null;
    const lng = form.lng ? Number(form.lng) : null;
    if (!company) {
      setCommuteError("请先选择一个公司。");
      return;
    }
    if (!lat || !lng) {
      setCommuteError("请先填写/解析房源经纬度。");
      return;
    }

    setCommuting(true);
    try {
      const res = await fetch("/api/commute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat, lng },
          destination: { lat: company.lat, lng: company.lng },
          city: company.city || form.city || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "通勤计算失败");
      setForm((f) => ({
        ...f,
        commute_company_id: String(company.id),
        commute_duration_sec: String(json.duration ?? ""),
        commute_distance_m: String(json.distance ?? ""),
      }));
    } catch (e: any) {
      setCommuteError(e?.message ?? "通勤计算失败，请稍后重试。");
    } finally {
      setCommuting(false);
    }
  };

  const formatKm = (m: string) =>
    m ? `${(Number(m) / 1000).toFixed(1)}km` : "";
  const formatMin = (sec: string) =>
    sec ? `${Math.round(Number(sec) / 60)}分钟` : "";

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-5xl py-10 px-4 sm:px-8">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              房源管理（添加 / 编辑 / 删除）
            </h1>
            <p className="text-sm text-zinc-600">
              通过 CloudBase 的 <code>listings</code> 集合管理房源数据。
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
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="mb-2 text-sm font-medium text-zinc-900">
                通勤标签（新增房源必填）
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">
                    选择公司
                  </label>
                  <select
                    value={form.commute_company_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        commute_company_id: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="">请选择公司</option>
                    {companies.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.city ? `${c.city} · ` : ""}{c.name}
                      </option>
                    ))}
                  </select>
                  {companies.length === 0 && (
                    <p className="mt-1 text-xs text-zinc-500">
                      还没有公司，请先去 <a className="underline" href="/companies">管理公司</a> 添加。
                    </p>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleComputeCommute}
                    disabled={commuting || !form.commute_company_id}
                    className="h-9 rounded-full bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    {commuting ? "计算中..." : "计算通勤并生成标签"}
                  </button>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-700">
                    {form.commute_duration_sec && (
                      <span className="rounded-full bg-white px-2 py-0.5">
                        通勤 {formatMin(form.commute_duration_sec)}
                      </span>
                    )}
                    {form.commute_distance_m && (
                      <span className="rounded-full bg-white px-2 py-0.5">
                        距离 {formatKm(form.commute_distance_m)}
                      </span>
                    )}
                    {selectedCompany && (
                      <span className="rounded-full bg-white px-2 py-0.5">
                        公司 {selectedCompany.city ? `${selectedCompany.city} · ` : ""}
                        {selectedCompany.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {commuteError && (
                <p className="mt-2 text-xs text-red-600">{commuteError}</p>
              )}
              {!isEditing && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  说明：新增房源必须先计算通勤，保存后会把通勤结果打到该房源标签里；后续也可以重新计算更新。
                </p>
              )}
            </div>

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
                      if (!form.title.trim() && data?.title) {
                        setForm((f) => ({ ...f, title: String(data.title) }));
                      }
                      setForm((f) => ({
                        ...f,
                        lat: String(data.lat),
                        lng: String(data.lng),
                        address: String(data.formatted_address ?? ""),
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

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                位置（自动解析，可手动修改）
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                placeholder="例如：上海市杨浦区…（可从高德复制内容自动解析）"
              />
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
                  水费单价（元 / 吨）
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.water_price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, water_price: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="例如：5.0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  电费单价（元 / 度）
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.electricity_price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      electricity_price: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  placeholder="例如：0.8"
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
                  onClick={handleComputeCommute}
                  disabled={commuting || !form.commute_company_id}
                  className="flex h-9 items-center rounded-full border border-zinc-300 px-4 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {commuting ? "计算中..." : "重新计算通勤标签"}
                </button>
              )}
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
                      {item.commute_duration_sec != null && (
                        <span className="text-xs text-zinc-500">
                          · 通勤 {Math.round(item.commute_duration_sec / 60)}分钟
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

