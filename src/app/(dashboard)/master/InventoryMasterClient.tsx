"use client";

import { useState, useEffect, useRef } from "react";
import { getItems, getCategories, searchBySerialNumber, createCategory, updateCategory, deleteCategory } from "@/app/actions/master";
import { createItem, updateItem, deleteItem, getCategoriesForSelect } from "@/app/actions/item";
import {
    Package, Search, Loader2, X, Tags, Hash, Plus, Pencil, Trash2,
    AlertTriangle, ArrowRight, LayoutGrid, List, Filter,
    AlertCircle, ChevronRight, FolderOpen
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ────────────── Types ────────────── */
type CategoryData = {
    id: number;
    name: string;
    code: string | null;
    hasSN: boolean;
    _count?: { item: number };
};
type ItemData = {
    id: number;
    code: string;
    name: string;
    unit: string;
    hasSN: boolean;
    categoryId: number | null;
    category: { name: string; hasSN?: boolean } | null;
    totalFisik: number;
    snCount: number;
};

/* ────────────── Component ────────────── */
export default function InventoryMasterClient() {
    const router = useRouter();

    // Data state
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [allItems, setAllItems] = useState<ItemData[]>([]);
    const [catOptions, setCatOptions] = useState<{ id: number; name: string; code: string | null; hasSN: boolean }[]>([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [searchInput, setSearchInput] = useState("");
    const [filterSN, setFilterSN] = useState(false);
    const [filterLow, setFilterLow] = useState(false);

    // Item Modal
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemData | null>(null);
    const [itemForm, setItemForm] = useState({ code: "", name: "", categoryId: "", hasSN: true });

    // Category Modal
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<CategoryData | null>(null);
    const [catForm, setCatForm] = useState({ name: "", code: "", hasSN: true });

    // Delete Modal
    const [deleteTarget, setDeleteTarget] = useState<{ type: "item" | "cat"; data: any } | null>(null);

    // Shared
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // SN search
    const [snResults, setSnResults] = useState<any[]>([]);
    const [snSearching, setSnSearching] = useState(false);
    const snTimer = useRef<NodeJS.Timeout | null>(null);

    /* ────────────── Data loading ────────────── */
    const loadData = async () => {
        setLoading(true);
        try {
            const [catRes, itemRes, catOptRes] = await Promise.all([
                getCategories(),
                getItems(),
                getCategoriesForSelect()
            ]);
            if (catRes.success) setCategories((catRes.data || []) as unknown as CategoryData[]);
            if (itemRes.success) setAllItems(itemRes.data as ItemData[]);
            if (catOptRes.success) setCatOptions(catOptRes.data as any[]);
        } catch (err) {
            console.error("Load error:", err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    /* ────────────── Computed ────────────── */
    const totalItems = allItems.length;
    const snItems = allItems.filter(i => i.hasSN).length;
    const nonSnItems = totalItems - snItems;
    const lowStockItems = allItems.filter(i => i.totalFisik <= 0).length;

    // Filter items
    const filteredItems = allItems.filter(i => {
        if (selectedCatId !== null && i.categoryId !== selectedCatId) return false;
        if (filterSN && !i.hasSN) return false;
        if (filterLow && i.totalFisik > 0) return false;
        if (searchInput.trim()) {
            const q = searchInput.toLowerCase();
            if (!i.name.toLowerCase().includes(q) && !i.code.toLowerCase().includes(q) && !(i.category?.name || "").toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const selectedCat = categories.find(c => c.id === selectedCatId);

    /* ────────────── SN Search ────────────── */
    const handleSearch = (val: string) => {
        setSearchInput(val);
        if (snTimer.current) clearTimeout(snTimer.current);
        if (val.trim().length >= 3) {
            setSnSearching(true);
            snTimer.current = setTimeout(async () => {
                const res = await searchBySerialNumber(val.trim());
                setSnResults(res.success && res.data ? (res.data as any) : []);
                setSnSearching(false);
            }, 400);
        } else {
            setSnResults([]);
            setSnSearching(false);
        }
    };

    /* ────────────── ITEM CRUD ────────────── */
    const openItemModal = (item?: ItemData) => {
        setErrorMsg("");
        if (item) {
            setEditingItem(item);
            setItemForm({ code: item.code, name: item.name, categoryId: item.categoryId?.toString() || "", hasSN: item.hasSN });
        } else {
            setEditingItem(null);
            const preselectedCat = selectedCatId?.toString() || "";
            const cat = catOptions.find(c => c.id === selectedCatId);
            setItemForm({ code: "", name: "", categoryId: preselectedCat, hasSN: cat?.hasSN ?? true });
        }
        setIsItemModalOpen(true);
    };

    const handleItemCatChange = (catId: string) => {
        const cat = catOptions.find(c => c.id.toString() === catId);
        setItemForm(prev => ({ ...prev, categoryId: catId, hasSN: cat ? cat.hasSN : true }));
    };

    const submitItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemForm.name.trim() || !itemForm.code.trim()) { setErrorMsg("Kode & nama barang wajib diisi"); return; }
        setSubmitLoading(true);
        setErrorMsg("");
        try {
            const payload = { code: itemForm.code, name: itemForm.name, categoryId: Number(itemForm.categoryId), hasSN: itemForm.hasSN };
            const res = editingItem ? await updateItem(editingItem.id, payload) : await createItem(payload);
            if (res.success) { setIsItemModalOpen(false); setEditingItem(null); loadData(); }
            else { setErrorMsg(res.error || "Gagal menyimpan."); }
        } catch (err) {
            console.error("submitItem error:", err);
            setErrorMsg("Terjadi kesalahan jaringan.");
        }
        setSubmitLoading(false);
    };

    /* ────────────── CATEGORY CRUD ────────────── */
    const openCatModal = (cat?: CategoryData) => {
        setErrorMsg("");
        if (cat) {
            setEditingCat(cat);
            setCatForm({ name: cat.name, code: cat.code || "", hasSN: cat.hasSN });
        } else {
            setEditingCat(null);
            setCatForm({ name: "", code: "", hasSN: true });
        }
        setIsCatModalOpen(true);
    };

    const submitCat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catForm.name.trim()) { setErrorMsg("Nama kategori wajib diisi"); return; }
        setSubmitLoading(true);
        setErrorMsg("");
        try {
            const res = editingCat
                ? await updateCategory(editingCat.id, catForm)
                : await createCategory(catForm);
            if (res.success) { setIsCatModalOpen(false); setEditingCat(null); loadData(); }
            else { setErrorMsg(res.error || "Gagal menyimpan."); }
        } catch (err) {
            console.error("submitCat error:", err);
            setErrorMsg("Terjadi kesalahan jaringan.");
        }
        setSubmitLoading(false);
    };

    /* ────────────── DELETE ────────────── */
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setSubmitLoading(true);
        setErrorMsg("");
        try {
            const res = deleteTarget.type === "item"
                ? await deleteItem(deleteTarget.data.id)
                : await deleteCategory(deleteTarget.data.id);
            if (res.success) { setDeleteTarget(null); setErrorMsg(""); loadData(); }
            else { setErrorMsg(res.error || "Gagal menghapus."); }
        } catch (err) {
            console.error("confirmDelete error:", err);
            setErrorMsg("Terjadi kesalahan jaringan.");
        }
        setSubmitLoading(false);
    };

    /* ────────────── RENDER ────────────── */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Loader2 size={28} className="text-green-500 animate-spin" />
                <p className="text-sm text-slate-500">Memuat Inventory Master...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Package size={22} className="text-green-400" />
                        Inventory Master
                    </h2>
                    <p className="text-[13px] text-slate-400 mt-0.5">Kelola kategori & barang dalam satu tampilan terpadu</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openItemModal()} className="btn btn-primary text-sm px-4 h-9 flex items-center gap-2">
                        <Plus size={15} /> Barang
                    </button>
                    <button type="button" onClick={() => openCatModal()} className="px-4 h-9 flex items-center gap-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium border border-[#334155]">
                        <Plus size={15} /> Kategori
                    </button>
                </div>
            </div>

            {/* ── SEARCH & FILTER ── */}
            <div className="card !p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 border border-[#1E293B]">
                <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari barang, kategori, serial number..."
                        value={searchInput}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all font-medium"
                    />
                    {/* SN search results dropdown */}
                    {searchInput.trim().length >= 3 && (snSearching || snResults.length > 0) && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                            {snSearching ? (
                                <div className="px-4 py-3 text-center text-xs text-slate-500">
                                    <Loader2 size={14} className="animate-spin inline mr-2" />Mencari SN...
                                </div>
                            ) : snResults.map(sn => (
                                <button key={sn.id} onClick={() => { setSearchInput(""); router.push(`/master/sn/${sn.id}`); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-green-500/10 transition-colors">
                                    <Hash size={12} className="text-purple-400 shrink-0" />
                                    <span className="font-mono text-white">{sn.code}</span>
                                    <span className="text-slate-500">→ {sn.item?.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterSN(!filterSN)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${filterSN ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-transparent border-[#334155] text-slate-400 hover:text-white"}`}
                    >
                        SN Only
                    </button>
                    <button
                        onClick={() => setFilterLow(!filterLow)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${filterLow ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-transparent border-[#334155] text-slate-400 hover:text-white"}`}
                    >
                        Low Stock
                    </button>
                </div>
            </div>

            {/* ── OVERVIEW ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Item", value: totalItems, color: "text-white", bg: "bg-slate-800" },
                    { label: "SN Item", value: snItems, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Non-SN", value: nonSnItems, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "Low Stock", value: lowStockItems, color: lowStockItems > 0 ? "text-red-400" : "text-slate-500", bg: lowStockItems > 0 ? "bg-red-500/10" : "bg-slate-800" },
                ].map((s, i) => (
                    <div key={i} className={`card !p-4 border border-[#1E293B] ${s.bg} flex flex-col`}>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</span>
                        <span className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value.toLocaleString("id-ID")}</span>
                    </div>
                ))}
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="flex gap-4 min-h-[500px]">
                {/* ── LEFT SIDEBAR: Categories ── */}
                <div className="w-56 shrink-0 card !p-0 border border-[#1E293B] overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-[#1E293B] bg-[#020617]/50">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <FolderOpen size={12} /> Kategori
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* All items */}
                        <button
                            onClick={() => setSelectedCatId(null)}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-all border-b border-[#1E293B]/30 group flex items-center justify-between ${selectedCatId === null ? "bg-green-500/10 text-green-400 font-semibold" : "text-slate-300 hover:bg-white/[0.03]"}`}
                        >
                            <span>Semua</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCatId === null ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-500"}`}>{totalItems}</span>
                        </button>

                        {categories.map(cat => {
                            const count = cat._count?.item || 0;
                            const isActive = selectedCatId === cat.id;
                            return (
                                <div key={cat.id}
                                    className={`relative group border-b border-[#1E293B]/30 transition-all ${isActive ? "bg-green-500/10" : "hover:bg-white/[0.03]"}`}>
                                    <button
                                        onClick={() => setSelectedCatId(isActive ? null : cat.id)}
                                        className="w-full text-left px-4 py-2.5 text-xs flex items-center justify-between pr-16"
                                    >
                                        <div className="min-w-0">
                                            <span className={`block truncate ${isActive ? "text-green-400 font-semibold" : "text-slate-300"}`}>{cat.name}</span>
                                            <span className="text-[10px] text-slate-600">{count} item • {cat.hasSN ? "SN" : "Non-SN"}</span>
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full absolute right-3 top-1/2 -translate-y-1/2 ${isActive ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-500"} group-hover:hidden`}>{count}</span>
                                    </button>
                                    {/* Hover actions */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
                                        <button onClick={() => openCatModal(cat)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors" title="Edit">
                                            <Pencil size={12} />
                                        </button>
                                        <button onClick={() => { setDeleteTarget({ type: "cat", data: cat }); setErrorMsg(""); }} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Hapus">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add category inline */}
                        <button onClick={() => openCatModal()} className="w-full text-left px-4 py-2.5 text-xs text-slate-500 hover:text-green-400 transition-colors flex items-center gap-1.5">
                            <Plus size={12} /> Tambah Kategori
                        </button>
                    </div>
                </div>

                {/* ── RIGHT PANEL: Items ── */}
                <div className="flex-1 card !p-0 border border-[#1E293B] overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="p-3 border-b border-[#1E293B] bg-[#020617]/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">
                                {selectedCat ? selectedCat.name : "Semua Barang"}
                            </h3>
                            {selectedCat && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${selectedCat.hasSN ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                    {selectedCat.hasSN ? "SN Required" : "Non-SN"}
                                </span>
                            )}
                            <span className="badge badge-green">{filteredItems.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setViewMode("card")} className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-green-500/20 text-green-400" : "text-slate-500 hover:text-white"}`} title="Card View">
                                <LayoutGrid size={15} />
                            </button>
                            <button onClick={() => setViewMode("table")} className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-green-500/20 text-green-400" : "text-slate-500 hover:text-white"}`} title="Table View">
                                <List size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                                    <Package size={20} className="text-slate-500" />
                                </div>
                                <p className="text-sm text-slate-500">Tidak ada barang ditemukan.</p>
                                <button onClick={() => openItemModal()} className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                                    <Plus size={14} /> Tambah Barang
                                </button>
                            </div>
                        ) : viewMode === "card" ? (
                            /* ── CARD VIEW ── */
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {filteredItems.map(item => (
                                    <div key={item.id} className="bg-[#020617] border border-[#1E293B] rounded-xl p-4 hover:border-green-500/30 transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-white text-sm group-hover:text-green-400 transition-colors truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.code}</p>
                                            </div>
                                            {item.hasSN ? (
                                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">SN</span>
                                            ) : (
                                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">Non-SN</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-slate-500 block">Stok</span>
                                                <span className={`font-mono font-bold text-lg leading-none ${item.totalFisik === 0 ? "text-red-400" : "text-green-400"}`}>
                                                    {item.totalFisik.toLocaleString("id-ID")}
                                                </span>
                                            </div>
                                            {item.hasSN && (
                                                <div className="flex-1">
                                                    <span className="text-[10px] text-slate-500 block">SN#</span>
                                                    <span className="font-mono font-bold text-lg leading-none text-purple-400">
                                                        {(item.snCount || 0).toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-[10px] text-slate-500 mb-3 flex items-center gap-1.5">
                                            <Tags size={10} className="text-blue-400" />
                                            {item.category?.name || "Tanpa Kategori"}
                                        </div>

                                        <div className="flex items-center gap-1.5 border-t border-[#1E293B] pt-3">
                                            <Link href={`/master/items/${item.id}`} className="flex-1 text-center px-2 py-1.5 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[11px] font-medium text-slate-400 hover:text-green-400 hover:border-green-500/30 transition-all flex items-center justify-center gap-1">
                                                <ArrowRight size={12} /> Detail
                                            </Link>
                                            <button onClick={() => openItemModal(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit">
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => { setDeleteTarget({ type: "item", data: item }); setErrorMsg(""); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Hapus">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* ── TABLE VIEW ── */
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                            <th className="px-3 py-2.5">Kode</th>
                                            <th className="px-3 py-2.5">Nama</th>
                                            <th className="px-3 py-2.5">Kategori</th>
                                            <th className="px-3 py-2.5 text-center">SN</th>
                                            <th className="px-3 py-2.5 text-right">Stok</th>
                                            <th className="px-3 py-2.5 text-right">SN#</th>
                                            <th className="px-3 py-2.5 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {filteredItems.map(item => (
                                            <tr key={item.id} className="border-b border-[#1E293B]/40 hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-3 py-2.5">
                                                    <span className="font-mono text-slate-400">{item.code}</span>
                                                </td>
                                                <td className="px-3 py-2.5 font-medium text-white group-hover:text-green-400 transition-colors">{item.name}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{item.category?.name || "—"}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    {item.hasSN ? (
                                                        <span className="text-blue-400 text-[10px] font-bold">SN</span>
                                                    ) : (
                                                        <span className="text-amber-400 text-[10px] font-bold">Non</span>
                                                    )}
                                                </td>
                                                <td className={`px-3 py-2.5 text-right font-mono font-bold ${item.totalFisik === 0 ? "text-red-400" : "text-green-400"}`}>
                                                    {item.totalFisik.toLocaleString("id-ID")}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono text-purple-400">{item.hasSN ? (item.snCount || 0) : "—"}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <Link href={`/master/items/${item.id}`} className="p-1 text-slate-500 hover:text-green-400 transition-colors" title="Detail">
                                                            <ArrowRight size={13} />
                                                        </Link>
                                                        <button onClick={() => openItemModal(item)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors" title="Edit">
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button onClick={() => { setDeleteTarget({ type: "item", data: item }); setErrorMsg(""); }} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Hapus">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════ MODALS ═══════════════ */}

            {/* ── ADD/EDIT ITEM MODAL ── */}
            {isItemModalOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <h3 className="font-bold text-white text-lg">{editingItem ? "Edit Barang" : "Tambah Barang"}</h3>
                            <button onClick={() => setIsItemModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={submitItem} className="p-5 space-y-4">
                            {errorMsg && !deleteTarget && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{errorMsg}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kode Barang <span className="text-red-500">*</span></label>
                                <input type="text" required value={itemForm.code} onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 font-mono" placeholder="Contoh: RT-001" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Barang <span className="text-red-500">*</span></label>
                                <input type="text" required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50" placeholder="Contoh: Mikrotik RB750" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kategori <span className="text-red-500">*</span></label>
                                <select required value={itemForm.categoryId} onChange={(e) => handleItemCatChange(e.target.value)}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50">
                                    <option value="">Pilih Kategori</option>
                                    {catOptions.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.hasSN ? "(SN)" : "(Non-SN)"}</option>
                                    ))}
                                </select>
                                {itemForm.categoryId && (
                                    <p className="text-[11px] mt-1.5">
                                        {itemForm.hasSN
                                            ? <span className="text-blue-400">✓ Kategori ini wajib Serial Number</span>
                                            : <span className="text-amber-400">✓ Tanpa Serial Number (cukup Qty)</span>}
                                    </p>
                                )}
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 btn btn-primary py-2 text-sm">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ADD/EDIT CATEGORY MODAL ── */}
            {isCatModalOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <h3 className="font-bold text-white text-lg">{editingCat ? "Edit Kategori" : "Tambah Kategori"}</h3>
                            <button onClick={() => setIsCatModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={submitCat} className="p-5 space-y-4">
                            {errorMsg && !deleteTarget && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{errorMsg}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Kategori <span className="text-red-500">*</span></label>
                                <input type="text" required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Contoh: Router, Kabel..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kode Prefix</label>
                                <input type="text" value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 font-mono" placeholder="Contoh: RT, SW..." />
                            </div>
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={catForm.hasSN} onChange={(e) => setCatForm({ ...catForm, hasSN: e.target.checked })} className="sr-only peer" />
                                        <div className="w-10 h-5 bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Memiliki Serial Number (SN)</span>
                                        <p className="text-[11px] text-slate-500">
                                            {catForm.hasSN ? "Wajib scan SN saat masuk/keluar" : "Cukup input Qty saja"}
                                        </p>
                                    </div>
                                </label>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsCatModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 btn btn-primary py-2 text-sm">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM MODAL ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">
                            Hapus {deleteTarget.type === "item" ? "Barang" : "Kategori"}?
                        </h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Anda yakin ingin menghapus <span className="font-semibold text-white">"{deleteTarget.data.name}"</span>?
                        </p>
                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left mb-4 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-400">{errorMsg}</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setDeleteTarget(null); setErrorMsg(""); }}
                                className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                            <button onClick={confirmDelete} disabled={submitLoading}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all text-sm font-medium">
                                {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
