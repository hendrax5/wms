"use client";

import { useState, useEffect } from "react";
import { getWarehouseList, createWarehouse, updateWarehouse, deleteWarehouse } from "@/app/actions/master";
import {
    Building2, Package, Search, ArrowRight, X, Plus, Pencil, Trash2,
    AlertTriangle, Loader2, MapPin, LayoutGrid, AlertCircle, Warehouse
} from "lucide-react";
import Link from "next/link";

/* ────────────── Types ────────────── */
type WarehouseData = {
    id: number;
    name: string;
    location: string | null;
    type: string;
    totalFisik: number;
    lowStockCount: number;
};

/* ────────────── Component ────────────── */
export default function StockIndexClient() {
    const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [filterType, setFilterType] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWH, setEditingWH] = useState<WarehouseData | null>(null);
    const [form, setForm] = useState({ name: "", location: "", type: "CABANG" });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState<WarehouseData | null>(null);

    /* ────────────── Data ────────────── */
    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getWarehouseList();
            if (res.success) setWarehouses(res.data as WarehouseData[]);
        } catch (err) {
            console.error("Load error:", err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    /* ────────────── Computed ────────────── */
    const totalGudang = warehouses.length;
    const totalStok = warehouses.reduce((s, w) => s + w.totalFisik, 0);
    const totalLowStock = warehouses.reduce((s, w) => s + w.lowStockCount, 0);

    const filtered = warehouses.filter(w => {
        if (filterType && w.type !== filterType) return false;
        if (searchInput.trim()) {
            const q = searchInput.toLowerCase();
            if (!w.name.toLowerCase().includes(q) && !(w.location || "").toLowerCase().includes(q)) return false;
        }
        return true;
    });

    /* ────────────── CRUD ────────────── */
    const openModal = (wh?: WarehouseData) => {
        setErrorMsg("");
        if (wh) {
            setEditingWH(wh);
            setForm({ name: wh.name, location: wh.location || "", type: wh.type });
        } else {
            setEditingWH(null);
            setForm({ name: "", location: "", type: "CABANG" });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setErrorMsg("");
        const res = editingWH
            ? await updateWarehouse(editingWH.id, form)
            : await createWarehouse(form);
        if (res.success) { setIsModalOpen(false); loadData(); }
        else { setErrorMsg(res.error || "Gagal menyimpan."); }
        setSubmitLoading(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitLoading(true);
        setErrorMsg("");
        const res = await deleteWarehouse(deleteTarget.id);
        if (res.success) { setDeleteTarget(null); loadData(); }
        else { setErrorMsg(res.error || "Gagal menghapus."); }
        setSubmitLoading(false);
    };

    /* ────────────── RENDER ────────────── */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Loader2 size={28} className="text-amber-500 animate-spin" />
                <p className="text-sm text-slate-500">Memuat Direktori Gudang...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Building2 size={22} className="text-amber-400" />
                        Direktori Gudang
                    </h2>
                    <p className="text-[13px] text-slate-400 mt-0.5">Pilih gudang untuk melihat stok & aktivitas</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary text-sm px-4 h-9 flex items-center gap-2">
                    <Plus size={15} /> Tambah Gudang
                </button>
            </div>

            {/* ── SEARCH & FILTER ── */}
            <div className="card !p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 border border-[#1E293B]">
                <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari nama gudang, lokasi..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterType(filterType === "CABANG" ? null : "CABANG")}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${filterType === "CABANG" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-transparent border-[#334155] text-slate-400 hover:text-white"}`}
                    >
                        Cabang
                    </button>
                    <button
                        onClick={() => setFilterType(filterType === "PUSAT" ? null : "PUSAT")}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${filterType === "PUSAT" ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-transparent border-[#334155] text-slate-400 hover:text-white"}`}
                    >
                        Pusat
                    </button>
                </div>
            </div>

            {/* ── OVERVIEW ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { label: "Total Gudang", value: totalGudang, color: "text-white", bg: "bg-slate-800" },
                    { label: "Total Stok", value: totalStok, color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Low Stock", value: totalLowStock, color: totalLowStock > 0 ? "text-red-400" : "text-slate-500", bg: totalLowStock > 0 ? "bg-red-500/10" : "bg-slate-800" },
                ].map((s, i) => (
                    <div key={i} className={`card !p-4 border border-[#1E293B] ${s.bg} flex flex-col`}>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</span>
                        <span className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value.toLocaleString("id-ID")}</span>
                    </div>
                ))}
            </div>

            {/* ── GRID GUDANG ── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                        <Building2 size={20} className="text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">Tidak ada gudang ditemukan.</p>
                    <button onClick={() => openModal()} className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
                        <Plus size={14} /> Tambah Gudang
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(wh => (
                        <div key={wh.id} className="card !p-0 border border-[#1E293B] hover:border-amber-500/30 transition-all group overflow-hidden">
                            {/* Card Header */}
                            <div className="p-5 pb-0">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors truncate flex items-center gap-2">
                                            <Building2 size={16} className="text-amber-400 shrink-0" />
                                            {wh.name}
                                        </h3>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 ml-2 ${wh.type === "PUSAT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                        {wh.type}
                                    </span>
                                </div>
                                {wh.location && (
                                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 mb-3">
                                        <MapPin size={10} className="text-slate-600 shrink-0" /> {wh.location}
                                    </p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="px-5 py-3 grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Package size={10} /> Total Stok
                                    </span>
                                    <span className={`font-mono font-bold text-xl leading-none mt-1 block ${wh.totalFisik === 0 ? "text-slate-600" : "text-green-400"}`}>
                                        {wh.totalFisik.toLocaleString("id-ID")}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <AlertCircle size={10} /> Low Stock
                                    </span>
                                    <span className={`font-mono font-bold text-xl leading-none mt-1 block ${wh.lowStockCount > 0 ? "text-amber-400" : "text-slate-600"}`}>
                                        {wh.lowStockCount}
                                    </span>
                                </div>
                            </div>

                            {/* Status + Actions */}
                            <div className="px-5 py-3 border-t border-[#1E293B] flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-[10px] text-green-400 font-medium">Active</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link href={`/stock/warehouse/${wh.id}`} className="px-3 py-1.5 rounded-lg bg-[#020617] border border-[#1E293B] text-[11px] font-medium text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center gap-1">
                                        <ArrowRight size={12} /> Detail
                                    </Link>
                                    <button onClick={() => openModal(wh)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit">
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => { setDeleteTarget(wh); setErrorMsg(""); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Hapus">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════════════ MODALS ═══════════════ */}

            {/* ── ADD/EDIT MODAL ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <h3 className="font-bold text-white text-lg">{editingWH ? "Edit Gudang" : "Tambah Gudang"}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {errorMsg && !deleteTarget && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{errorMsg}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Gudang <span className="text-red-500">*</span></label>
                                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" placeholder="Contoh: Bali Denpasar" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lokasi</label>
                                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" placeholder="Contoh: Denpasar, Bali" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipe</label>
                                <div className="flex gap-3">
                                    {["CABANG", "PUSAT"].map(t => (
                                        <label key={t} className={`flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-all ${form.type === t
                                            ? t === "PUSAT" ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                                            : "bg-[#020617] border-[#334155] text-slate-400 hover:border-slate-500"
                                            }`}>
                                            <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} className="sr-only" />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 btn btn-primary py-2 text-sm">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE MODAL ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">Hapus Gudang?</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Anda yakin ingin menghapus gudang <span className="font-semibold text-white">"{deleteTarget.name}"</span>?
                        </p>
                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left mb-4 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-400">{errorMsg}</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setDeleteTarget(null); setErrorMsg(""); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                            <button onClick={handleDelete} disabled={submitLoading} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all text-sm font-medium">
                                {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
