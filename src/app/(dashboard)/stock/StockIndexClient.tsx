"use client";

import { useState, useEffect } from "react";
import { getWarehouseList, createWarehouse, updateWarehouse, deleteWarehouse } from "@/app/actions/master";
import { auditAllStock } from "@/app/actions/stockAudit";
import {
    Building2, Package, Search, ArrowRight, X, Plus, Pencil, Trash2,
    AlertTriangle, Loader2, MapPin, LayoutGrid, List, AlertCircle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Upload, FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { getAreasForSelect, importWarehouseBatch } from "@/app/actions/warehouse";

/* ────────────── Types ────────────── */
type WarehouseData = {
    id: number;
    name: string;
    location: string | null;
    type: string;
    totalFisik: number;
    totalNew: number;
    totalDismantle: number;
    totalDamaged: number;
    totalNonSN: number;
    lowStockCount: number;
};

/* ────────────── Pagination ────────────── */
function usePagination<T>(items: T[], perPage: number) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const safeP = Math.min(page, totalPages);
    const paged = items.slice((safeP - 1) * perPage, safeP * perPage);
    const reset = () => setPage(1);
    return { page: safeP, setPage, totalPages, paged, reset, total: items.length };
}

function PaginationBar({ page, totalPages, setPage, total, perPage, label }: {
    page: number; totalPages: number; setPage: (n: number) => void; total: number; perPage: number; label?: string;
}) {
    if (total <= perPage) return null;
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);

    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1">
            <span className="text-[11px] text-slate-500">
                Menampilkan <span className="text-white font-medium">{start}–{end}</span> dari <span className="text-white font-medium">{total}</span> {label || "data"}
            </span>
            <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14} /></button>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                {pages.map((p, i) => p === "..." ? (
                    <span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>
                ) : (
                    <button key={p} type="button" onClick={() => setPage(p as number)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${page === p ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-500 hover:text-white hover:bg-white/5"}`}>
                        {p}
                    </button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14} /></button>
            </div>
        </div>
    );
}

/* ────────────── Component ────────────── */
export default function StockIndexClient() {
    const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [filterType, setFilterType] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWH, setEditingWH] = useState<WarehouseData | null>(null);
    const [form, setForm] = useState({ name: "", location: "", type: "CABANG" });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<WarehouseData | null>(null);

    // Import Excel State
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importRows, setImportRows] = useState<any[]>([]);
    const [existingAreas, setExistingAreas] = useState<{ id: number; name: string }[]>([]);
    const [importLoading, setImportLoading] = useState(false);

    /* ────────────── Data ────────────── */
    const loadData = async () => {
        setLoading(true);
        try {
            const [res, areaRes] = await Promise.all([
                getWarehouseList(),
                getAreasForSelect()
            ]);
            if (res.success && res.data) setWarehouses(res.data as WarehouseData[]);
            if (areaRes.success && areaRes.data) setExistingAreas(areaRes.data as any);
        } catch (err) { console.error("Load error:", err); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    /* ────────────── Computed ────────────── */
    const totalGudang = warehouses.length;
    const totalStok = warehouses.reduce((s, w) => s + (w.totalFisik || 0), 0);
    const totalNonSN = warehouses.reduce((s, w) => s + (w.totalNonSN || 0), 0);
    const totalLowStock = warehouses.reduce((s, w) => s + (w.lowStockCount || 0), 0);

    const filtered = warehouses.filter(w => {
        if (filterType && w.type !== filterType) return false;
        if (searchInput.trim()) {
            const q = searchInput.toLowerCase();
            if (!w.name.toLowerCase().includes(q) && !(w.location || "").toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const exportToExcel = () => {
        if (filtered.length === 0) return;

        const exportData = filtered.map(w => ({
            "Nama Gudang": w.name,
            "Tipe": w.type,
            "Lokasi": w.location || "-",
            "Total Fisik": w.totalFisik || 0,
            "Total Baru": w.totalNew || 0,
            "Total Dismantle": w.totalDismantle || 0,
            "Total Rusak": w.totalDamaged || 0,
            "Total Non-SN": w.totalNonSN || 0,
            "Low Stock Count": w.lowStockCount || 0
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Direktori Gudang");
        XLSX.writeFile(wb, `Direktori_Gudang_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const downloadTemplateWarehouse = () => {
        const templateData = [
            {
                "Nama Gudang": "Gudang Cabang Bali",
                "Tipe (PUSAT/CABANG)": "CABANG",
                "Area": "Bali",
                "Lokasi": "Denpasar, Bali"
            },
            {
                "Nama Gudang": "Gudang Pusat Surabaya",
                "Tipe (PUSAT/CABANG)": "PUSAT",
                "Area": "Jawa Timur",
                "Lokasi": "Surabaya, Jawa Timur"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Import_Gudang.xlsx");
    };

    const handleWarehouseFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json<any>(ws);

                if (rawData.length === 0) {
                    alert("File Excel kosong atau format tidak sesuai.");
                    return;
                }

                const validated = rawData.map((row: any) => {
                    const name = (row["Nama Gudang"] || row["Nama"] || row["name"] || "").toString().trim();
                    const typeRaw = (row["Tipe (PUSAT/CABANG)"] || row["Tipe"] || row["type"] || "").toString().trim().toUpperCase();
                    const areaName = (row["Area"] || row["areaName"] || row["area"] || "").toString().trim();
                    const location = (row["Lokasi"] || row["location"] || "").toString().trim();

                    const errors: string[] = [];
                    const warnings: string[] = [];

                    if (!name) {
                        errors.push("Nama gudang wajib diisi");
                    }
                    if (!areaName) {
                        errors.push("Area wajib diisi");
                    }
                    
                    let type: "PUSAT" | "CABANG" = "CABANG";
                    if (typeRaw === "PUSAT") {
                        type = "PUSAT";
                    } else if (typeRaw === "CABANG" || typeRaw === "") {
                        type = "CABANG";
                    } else {
                        errors.push("Tipe harus PUSAT atau CABANG");
                    }

                    // Check if Area exists in existingAreas
                    const areaExists = existingAreas.some(
                        a => a.name.toLowerCase().trim() === areaName.toLowerCase().trim()
                    );
                    if (areaName && !areaExists) {
                        warnings.push(`Area "${areaName}" baru (akan dibuat otomatis)`);
                    }

                    return {
                        name,
                        type,
                        areaName,
                        location,
                        errors,
                        warnings,
                        isValid: errors.length === 0
                    };
                });

                setImportRows(validated);
            } catch (err: any) {
                alert("Gagal membaca file Excel: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const submitWarehouseImport = async () => {
        if (importRows.length === 0) return;
        const hasErrors = importRows.some(r => r.errors.length > 0);
        if (hasErrors) {
            alert("Harap perbaiki semua baris yang error sebelum melanjutkan.");
            return;
        }

        setImportLoading(true);
        try {
            const payload = importRows.map(r => ({
                name: r.name,
                type: r.type,
                areaName: r.areaName,
                location: r.location || undefined
            }));
            const res = await importWarehouseBatch(payload);
            if (res.success) {
                alert(`Berhasil mengimpor ${res.createdCount} gudang.`);
                setIsImportOpen(false);
                setImportRows([]);
                loadData();
            } else {
                alert(res.error || "Gagal mengimpor data.");
            }
        } catch (err: any) {
            alert("Terjadi kesalahan sistem: " + err.message);
        }
        setImportLoading(false);
    };

    // Pagination
    const CARDS_PP = 6;
    const TABLE_PP = 10;
    const perPage = viewMode === "card" ? CARDS_PP : TABLE_PP;
    const pag = usePagination(filtered, perPage);

    useEffect(() => { pag.reset(); }, [searchInput, filterType, viewMode]);

    /* ────────────── CRUD ────────────── */
    const openModal = (wh?: WarehouseData) => {
        setErrorMsg("");
        if (wh) { setEditingWH(wh); setForm({ name: wh.name, location: wh.location || "", type: wh.type || "CABANG" }); }
        else { setEditingWH(null); setForm({ name: "", location: "", type: "CABANG" }); }
        setIsModalOpen(true);
    };
    const closeModal = () => { setIsModalOpen(false); setEditingWH(null); setErrorMsg(""); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setErrorMsg("Nama gudang wajib diisi"); return; }
        setSubmitLoading(true); setErrorMsg("");
        try {
            const res = editingWH ? await updateWarehouse(editingWH.id, form) : await createWarehouse(form);
            if (res.success) { closeModal(); loadData(); }
            else { setErrorMsg(res.error || "Gagal menyimpan."); }
        } catch { setErrorMsg("Terjadi kesalahan jaringan."); }
        setSubmitLoading(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitLoading(true); setErrorMsg("");
        try {
            const res = await deleteWarehouse(deleteTarget.id);
            if (res.success) { setDeleteTarget(null); setErrorMsg(""); loadData(); }
            else { setErrorMsg(res.error || "Gagal menghapus."); }
        } catch { setErrorMsg("Terjadi kesalahan jaringan."); }
        setSubmitLoading(false);
    };

    const handleAudit = async () => {
        if (!confirm("Audit stok akan memverifikasi dan menyelaraskan total stok di semua gudang dengan data Serial Number. Lanjutkan?")) return;
        setAuditLoading(true);
        try {
            const res = await auditAllStock();
            if (res.success) {
                alert(res.message);
                loadData();
            } else {
                alert("Error: " + res.error);
            }
        } catch (err: any) {
            alert("Gagal menjalankan audit: " + err.message);
        }
        setAuditLoading(false);
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
        <div className="space-y-4 animate-fade-in">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Building2 size={20} className="text-amber-400 shrink-0" />
                        <span className="truncate">Direktori Gudang</span>
                    </h2>
                    <p className="text-[12px] sm:text-[13px] text-slate-400 mt-0.5 truncate">Pilih gudang untuk melihat stok & aktivitas</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAudit} disabled={auditLoading} className="px-3 sm:px-4 h-8 sm:h-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0">
                        {auditLoading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} 
                        Audit Stok
                    </button>
                    <button type="button" onClick={exportToExcel} disabled={filtered.length === 0} className="px-3 sm:px-4 h-8 sm:h-9 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0">
                        <Download size={14} /> Export
                    </button>
                    <button type="button" onClick={() => { setIsImportOpen(true); setImportRows([]); }} className="px-3 sm:px-4 h-8 sm:h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shrink-0">
                        <Upload size={14} /> Import
                    </button>
                    <button type="button" onClick={() => openModal()} className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 flex items-center gap-1.5 shrink-0">
                        <Plus size={14} /> Tambah Gudang
                    </button>
                </div>
            </div>

            {/* ── SEARCH & FILTER ── */}
            <div className="card !p-2.5 sm:!p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 border border-[#1E293B]">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Cari nama gudang, lokasi..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => setFilterType(filterType === "CABANG" ? null : "CABANG")}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${filterType === "CABANG" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-transparent border-[#334155] text-slate-400 hover:text-white"}`}>Cabang</button>
                    <button type="button" onClick={() => setFilterType(filterType === "PUSAT" ? null : "PUSAT")}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${filterType === "PUSAT" ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-transparent border-[#334155] text-slate-400 hover:text-white"}`}>Pusat</button>
                    <div className="w-px h-5 bg-[#1E293B] mx-0.5"></div>
                    <button type="button" onClick={() => setViewMode("card")} className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-white"}`} title="Card View"><LayoutGrid size={14} /></button>
                    <button type="button" onClick={() => setViewMode("table")} className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-white"}`} title="Table View"><List size={14} /></button>
                </div>
            </div>

            {/* ── OVERVIEW ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                    { label: "Total Gudang", value: totalGudang, color: "text-white", bg: "bg-slate-800" },
                    { label: "Total Stok", value: totalStok, color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Total Non-SN", value: totalNonSN, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Low Stock", value: totalLowStock, color: totalLowStock > 0 ? "text-red-400" : "text-slate-500", bg: totalLowStock > 0 ? "bg-red-500/10" : "bg-slate-800" },
                ].map((s, i) => (
                    <div key={i} className={`card !p-3 sm:!p-4 border border-[#1E293B] ${s.bg} flex flex-col`}>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</span>
                        <span className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value.toLocaleString("id-ID")}</span>
                    </div>
                ))}
            </div>

            {/* ── CONTENT ── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center"><Building2 size={20} className="text-slate-500" /></div>
                    <p className="text-sm text-slate-500">Tidak ada gudang ditemukan.</p>
                    <button type="button" onClick={() => openModal()} className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"><Plus size={14} /> Tambah Gudang</button>
                </div>
            ) : viewMode === "card" ? (
                /* ── CARD VIEW ── */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {pag.paged.map(wh => (
                            <div key={wh.id} className="card !p-0 border border-[#1E293B] hover:border-amber-500/30 transition-all group overflow-hidden">
                                <div className="p-4 sm:p-5 pb-0">
                                    <div className="flex items-start justify-between mb-1 gap-2">
                                        <h3 className="font-bold text-white text-sm sm:text-base group-hover:text-amber-400 transition-colors truncate flex items-center gap-2 min-w-0 flex-1" title={wh.name}>
                                            <Building2 size={16} className="text-amber-400 shrink-0" />
                                            <span className="truncate">{wh.name}</span>
                                        </h3>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 ${wh.type === "PUSAT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>{wh.type}</span>
                                    </div>
                                    {wh.location && (
                                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 mb-2 truncate" title={wh.location}>
                                            <MapPin size={10} className="text-slate-600 shrink-0" /> <span className="truncate">{wh.location}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="px-4 sm:px-5 py-3 grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1"><Package size={10} /> Stok Total</span>
                                        <span className={`font-mono font-bold text-lg sm:text-xl leading-none mt-1 block ${(wh.totalFisik || 0) === 0 ? "text-slate-600" : "text-green-400"}`}>{(wh.totalFisik || 0).toLocaleString("id-ID")}</span>
                                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono">
                                            <span className="text-blue-400" title="Baru">B: {wh.totalNew || 0}</span>
                                            <span className="text-purple-400" title="Dismantle">D: {wh.totalDismantle || 0}</span>
                                            <span className="text-red-400" title="Rusak">R: {wh.totalDamaged || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1"><Package size={10} /> Non-SN</span>
                                            <span className={`font-mono font-bold text-sm sm:text-base leading-none mt-0.5 block ${(wh.totalNonSN || 0) === 0 ? "text-slate-600" : "text-slate-300"}`}>{(wh.totalNonSN || 0).toLocaleString("id-ID")}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1"><AlertCircle size={10} /> Low Stock</span>
                                            <span className={`font-mono font-bold text-sm sm:text-base leading-none mt-0.5 block ${(wh.lowStockCount || 0) > 0 ? "text-amber-400" : "text-slate-600"}`}>{wh.lowStockCount || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 sm:px-5 py-3 border-t border-[#1E293B] flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[10px] text-green-400 font-medium">Active</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Link href={`/stock/warehouse/${wh.id}`} className="px-2.5 py-1.5 rounded-lg bg-[#020617] border border-[#1E293B] text-[11px] font-medium text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center gap-1">
                                            <ArrowRight size={12} /> Detail
                                        </Link>
                                        <button type="button" onClick={() => openModal(wh)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit"><Pencil size={13} /></button>
                                        <button type="button" onClick={() => { setDeleteTarget(wh); setErrorMsg(""); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Hapus"><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <PaginationBar page={pag.page} totalPages={pag.totalPages} setPage={pag.setPage} total={pag.total} perPage={CARDS_PP} label="gudang" />
                </>
            ) : (
                /* ── TABLE (Desktop) + CARD TRANSFORM (Mobile) ── */
                <>
                    {/* Desktop */}
                    <div className="hidden sm:block card !p-0 border border-[#1E293B] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-500 font-semibold bg-[#020617]/50">
                                    <th className="px-4 py-3">Nama Gudang</th>
                                    <th className="px-4 py-3 text-center">Tipe</th>
                                    <th className="px-4 py-3 text-right w-28 whitespace-nowrap">Stok Total</th>
                                    <th className="px-4 py-3 text-right w-20 whitespace-nowrap">Baru</th>
                                    <th className="px-4 py-3 text-right w-20 whitespace-nowrap">Dsm</th>
                                    <th className="px-4 py-3 text-right w-20 whitespace-nowrap">Rsk</th>
                                    <th className="px-4 py-3 text-right w-28 whitespace-nowrap">Non-SN</th>
                                    <th className="px-4 py-3 text-center w-20">Status</th>
                                    <th className="px-4 py-3 text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {pag.paged.map(wh => (
                                    <tr key={wh.id} className="border-b border-[#1E293B]/40 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-amber-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="font-medium text-white group-hover:text-amber-400 transition-colors block truncate max-w-[200px]" title={wh.name}>{wh.name}</span>
                                                    {wh.location && <span className="text-[10px] text-slate-600 truncate block max-w-[200px]" title={wh.location}>{wh.location}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${wh.type === "PUSAT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>{wh.type}</span>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono font-bold ${(wh.totalFisik || 0) === 0 ? "text-slate-600" : "text-green-400"}`}>{(wh.totalFisik || 0).toLocaleString("id-ID")}</td>
                                        <td className={`px-4 py-3 text-right font-mono text-xs ${(wh.totalNew || 0) === 0 ? "text-slate-600" : "text-blue-400"}`}>{(wh.totalNew || 0).toLocaleString("id-ID")}</td>
                                        <td className={`px-4 py-3 text-right font-mono text-xs ${(wh.totalDismantle || 0) === 0 ? "text-slate-600" : "text-purple-400"}`}>{(wh.totalDismantle || 0).toLocaleString("id-ID")}</td>
                                        <td className={`px-4 py-3 text-right font-mono text-xs ${(wh.totalDamaged || 0) === 0 ? "text-slate-600" : "text-red-400"}`}>{(wh.totalDamaged || 0).toLocaleString("id-ID")}</td>
                                        <td className={`px-4 py-3 text-right font-mono font-bold ${(wh.totalNonSN || 0) === 0 ? "text-slate-600" : "text-slate-300"}`}>{(wh.totalNonSN || 0).toLocaleString("id-ID")}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-medium">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Active
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <Link href={`/stock/warehouse/${wh.id}`} className="p-1 text-slate-500 hover:text-amber-400 transition-colors" title="Detail"><ArrowRight size={13} /></Link>
                                                <button type="button" onClick={() => openModal(wh)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors" title="Edit"><Pencil size={13} /></button>
                                                <button type="button" onClick={() => { setDeleteTarget(wh); setErrorMsg(""); }} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Hapus"><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile card transform */}
                    <div className="sm:hidden space-y-2">
                        {pag.paged.map(wh => (
                            <div key={wh.id} className="card !p-3 border border-[#1E293B]">
                                <div className="flex items-center justify-between mb-2 gap-2">
                                    <h3 className="font-medium text-white text-sm truncate flex-1 min-w-0 flex items-center gap-1.5" title={wh.name}>
                                        <Building2 size={14} className="text-amber-400 shrink-0" /> <span className="truncate">{wh.name}</span>
                                    </h3>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 ${wh.type === "PUSAT" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>{wh.type}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                                    <span>Stok: <span className={`font-mono font-bold ${(wh.totalFisik || 0) === 0 ? "text-slate-600" : "text-green-400"}`}>{(wh.totalFisik || 0).toLocaleString("id-ID")}</span></span>
                                    <span>B: <span className={`font-mono font-bold ${(wh.totalNew || 0) === 0 ? "text-slate-600" : "text-blue-400"}`}>{(wh.totalNew || 0).toLocaleString("id-ID")}</span></span>
                                    <span>D: <span className={`font-mono font-bold ${(wh.totalDismantle || 0) === 0 ? "text-slate-600" : "text-purple-400"}`}>{(wh.totalDismantle || 0).toLocaleString("id-ID")}</span></span>
                                    <span>R: <span className={`font-mono font-bold ${(wh.totalDamaged || 0) === 0 ? "text-slate-600" : "text-red-400"}`}>{(wh.totalDamaged || 0).toLocaleString("id-ID")}</span></span>
                                    <span>Non-SN: <span className={`font-mono font-bold ${(wh.totalNonSN || 0) === 0 ? "text-slate-600" : "text-slate-300"}`}>{(wh.totalNonSN || 0).toLocaleString("id-ID")}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/stock/warehouse/${wh.id}`} className="flex-1 text-center py-1.5 rounded-lg bg-[#020617] border border-[#1E293B] text-[11px] font-medium text-slate-400 hover:text-amber-400 transition-all">Detail</Link>
                                    <button type="button" onClick={() => openModal(wh)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"><Pencil size={13} /></button>
                                    <button type="button" onClick={() => { setDeleteTarget(wh); setErrorMsg(""); }} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <PaginationBar page={pag.page} totalPages={pag.totalPages} setPage={pag.setPage} total={pag.total} perPage={TABLE_PP} label="gudang" />
                </>
            )}

            {/* ═══════════════ MODALS ═══════════════ */}

            {/* ── ADD/EDIT ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4" style={{animation:'fadeIn .25s ease-out'}} onClick={closeModal}>
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <h3 className="font-bold text-white text-lg">{editingWH ? "Edit Gudang" : "Tambah Gudang"}</h3>
                            <button type="button" onClick={closeModal} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" /><p className="text-sm text-red-400">{errorMsg}</p>
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
                                            : "bg-[#020617] border-[#334155] text-slate-400 hover:border-slate-500"}`}>
                                            <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} className="sr-only" />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 btn btn-primary py-2 text-sm">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4" style={{animation:'fadeIn .25s ease-out'}} onClick={() => { setDeleteTarget(null); setErrorMsg(""); }}>
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                        <h3 className="font-bold text-white text-lg mb-2">Hapus Gudang?</h3>
                        <p className="text-sm text-slate-400 mb-6">Anda yakin ingin menghapus <span className="font-semibold text-white">&quot;{deleteTarget.name}&quot;</span>?</p>
                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left mb-4 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" /><p className="text-xs text-red-400">{errorMsg}</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setDeleteTarget(null); setErrorMsg(""); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                            <button type="button" onClick={handleDelete} disabled={submitLoading} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all text-sm font-medium">
                                {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── IMPORT EXCEL MODAL ── */}
            {isImportOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsImportOpen(false)}>
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <div>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    <FileSpreadsheet className="text-amber-400" size={20} />
                                    Import Gudang via Excel
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Unggah file Excel untuk menambah banyak gudang secara batch</p>
                            </div>
                            <button type="button" onClick={() => setIsImportOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Upload & Instructions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border-2 border-dashed border-[#334155] hover:border-amber-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center group transition-all relative cursor-pointer">
                                    <input type="file" accept=".xlsx, .xls" onChange={handleWarehouseFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Upload size={32} className="text-slate-500 group-hover:text-amber-400 transition-colors mb-3" />
                                    <p className="text-sm font-semibold text-white">Pilih File Excel atau Drag & Drop</p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">Format: .xlsx, .xls</p>
                                </div>
                                <div className="bg-[#020617]/40 border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Panduan Kolom Excel</h4>
                                        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                                            <li><strong className="text-white font-medium">Nama Gudang</strong>: Wajib diisi (mis. Gudang Bali)</li>
                                            <li><strong className="text-white font-medium">Tipe (PUSAT/CABANG)</strong>: Opsional, default CABANG</li>
                                            <li><strong className="text-white font-medium">Area</strong>: Wajib diisi. Jika nama area baru, area dibuat otomatis!</li>
                                            <li><strong className="text-white font-medium">Lokasi</strong>: Opsional, alamat/deskripsi lokasi</li>
                                        </ul>
                                    </div>
                                    <button type="button" onClick={downloadTemplateWarehouse} className="mt-4 px-4 py-2 w-full rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
                                        <Download size={14} /> Download Template Excel
                                    </button>
                                </div>
                            </div>

                            {/* Preview Grid */}
                            {importRows.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pratinjau & Validasi Data</h4>
                                        <span className="text-xs text-slate-500 font-mono">Total: <span className="text-white font-semibold font-sans">{importRows.length}</span> baris</span>
                                    </div>
                                    <div className="border border-[#1E293B] rounded-xl overflow-hidden bg-[#020617]/20">
                                        <div className="overflow-x-auto max-h-60 custom-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold sticky top-0 z-10">
                                                        <th className="px-4 py-2">Baris</th>
                                                        <th className="px-4 py-2">Nama Gudang</th>
                                                        <th className="px-4 py-2">Tipe</th>
                                                        <th className="px-4 py-2">Area</th>
                                                        <th className="px-4 py-2">Lokasi</th>
                                                        <th className="px-4 py-2 text-center w-40">Status / Catatan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-xs">
                                                    {importRows.map((row, idx) => {
                                                        const hasError = row.errors.length > 0;
                                                        const hasWarning = row.warnings.length > 0;
                                                        
                                                        let badgeBg = "bg-green-500/10 text-green-400 border-green-500/20";
                                                        let badgeText = "Valid";
                                                        if (hasError) {
                                                            badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
                                                            badgeText = row.errors.join(", ");
                                                        } else if (hasWarning) {
                                                            badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                                            badgeText = row.warnings.join(", ");
                                                        }

                                                        return (
                                                            <tr key={idx} className="border-b border-[#1E293B]/40 hover:bg-white/[0.01]">
                                                                <td className="px-4 py-2.5 font-mono text-slate-600">{idx + 1}</td>
                                                                <td className="px-4 py-2.5 text-white font-medium">{row.name || <span className="text-red-500/60 italic">Kosong</span>}</td>
                                                                <td className="px-4 py-2.5 font-mono">{row.type}</td>
                                                                <td className="px-4 py-2.5 text-slate-300">{row.areaName || <span className="text-red-500/60 italic">Kosong</span>}</td>
                                                                <td className="px-4 py-2.5 text-slate-500 truncate max-w-[150px]">{row.location || "-"}</td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold text-left max-w-full truncate ${badgeBg}`} title={badgeText}>
                                                                        {badgeText}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-[#1E293B] bg-[#020617]/50 flex items-center justify-between">
                            <button type="button" onClick={() => { setIsImportOpen(false); setImportRows([]); }} className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                            <button
                                type="button"
                                onClick={submitWarehouseImport}
                                disabled={importRows.length === 0 || importRows.some(r => r.errors.length > 0) || importLoading}
                                className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-1.5 shrink-0"
                            >
                                {importLoading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                                {importRows.some(r => r.errors.length > 0) ? "Ada Error di Excel" : "Konfirmasi Impor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
