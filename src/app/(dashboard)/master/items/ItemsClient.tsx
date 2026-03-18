"use client";

import { useState, useEffect, useRef } from "react";
import { getItems, searchBySerialNumber } from "@/app/actions/master";
import { createItem, updateItem, deleteItem, getCategoriesForSelect } from "@/app/actions/item";
import { Package, Search, Loader2, ArrowLeft, ArrowRight, X, Tags, Hash, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ItemProp = {
    id: number;
    code: string;
    name: string;
    unit: string;
    hasSN: boolean;
    categoryId: number | null;
    category: { name: string } | null;
    totalFisik: number;
    snCount: number;
};

type CategoryOption = { id: number; name: string; code: string | null; hasSN: boolean };

type ActiveFilter = { type: 'kategori' | 'barang'; value: string; label: string };

export default function ItemsClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [items, setItems] = useState<ItemProp[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [snResults, setSnResults] = useState<{ id: number; code: string; itemId: number; item: { id: number; name: string; code: string }; itemstatus: { name: string }; warehouse: { name: string } | null }[]>([]);
    const [snSearching, setSnSearching] = useState(false);
    const snSearchTimer = useRef<NodeJS.Timeout | null>(null);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(
        searchParams.get('search') ? [{ type: 'kategori', value: searchParams.get('search')!, label: searchParams.get('search')! }] : []
    );

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemProp | null>(null);
    const [formData, setFormData] = useState({ code: "", name: "", categoryId: "", minStock: 0, hasSN: true });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<ItemProp | null>(null);

    const addFilter = (filter: ActiveFilter) => {
        if (!activeFilters.some(f => f.type === filter.type && f.value === filter.value)) {
            setActiveFilters(prev => [...prev, filter]);
        }
        setSearchInput("");
        setIsSuggestionsOpen(false);
    };

    const removeFilter = (filter: ActiveFilter) => {
        setActiveFilters(prev => prev.filter(f => !(f.type === filter.type && f.value === filter.value)));
    };

    const loadData = async () => {
        setLoading(true);
        const [itemRes, catRes] = await Promise.all([
            getItems(),
            getCategoriesForSelect()
        ]);
        if (itemRes.success) setItems(itemRes.data as ItemProp[]);
        if (catRes.success) setCategories(catRes.data as CategoryOption[]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Auto-set hasSN from category when category changes
    const handleCategoryChange = (catId: string) => {
        const cat = categories.find(c => c.id.toString() === catId);
        setFormData(prev => ({
            ...prev,
            categoryId: catId,
            hasSN: cat ? cat.hasSN : true,
        }));
    };

    const handleOpenModal = (item?: ItemProp) => {
        setErrorMsg("");
        if (item) {
            setEditingItem(item);
            setFormData({
                code: item.code,
                name: item.name,
                categoryId: item.categoryId?.toString() || "",
                minStock: 0,
                hasSN: item.hasSN,
            });
        } else {
            setEditingItem(null);
            setFormData({ code: "", name: "", categoryId: "", minStock: 0, hasSN: true });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setErrorMsg("");

        const payload = {
            code: formData.code,
            name: formData.name,
            categoryId: Number(formData.categoryId),
            minStock: formData.minStock,
            hasSN: formData.hasSN,
        };

        let res;
        if (editingItem) {
            res = await updateItem(editingItem.id, payload);
        } else {
            res = await createItem(payload);
        }

        if (res.success) {
            setIsModalOpen(false);
            loadData();
        } else {
            setErrorMsg(res.error || "Terjadi kesalahan.");
        }
        setSubmitLoading(false);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        setSubmitLoading(true);
        setErrorMsg("");

        const res = await deleteItem(deletingItem.id);
        if (res.success) {
            setIsDeleteModalOpen(false);
            setDeletingItem(null);
            loadData();
        } else {
            setErrorMsg(res.error || "Gagal menghapus.");
        }
        setSubmitLoading(false);
    };

    // Debounced SN search
    const handleSearchChange = (val: string) => {
        setSearchInput(val);
        setIsSuggestionsOpen(true);
        if (snSearchTimer.current) clearTimeout(snSearchTimer.current);
        if (val.trim().length >= 3) {
            setSnSearching(true);
            snSearchTimer.current = setTimeout(async () => {
                const res = await searchBySerialNumber(val.trim());
                if (res.success && res.data) {
                    setSnResults(res.data as any);
                } else {
                    setSnResults([]);
                }
                setSnSearching(false);
            }, 400);
        } else {
            setSnResults([]);
            setSnSearching(false);
        }
    };

    const uniqueCategories = Array.from(new Set(items.map(i => i.category?.name || "Tanpa Kategori")));
    const uniqueItemNames = Array.from(new Set(items.map(i => i.name)));

    const suggestions = searchInput.trim().length > 0 ? [
        ...uniqueCategories
            .filter(c => c.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(c => !activeFilters.some(f => f.type === 'kategori' && f.value === c))
            .map(c => ({ type: 'kategori' as const, value: c, label: c })),
        ...uniqueItemNames
            .filter(n => n.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(n => !activeFilters.some(f => f.type === 'barang' && f.value === n))
            .map(n => ({ type: 'barang' as const, value: n, label: n }))
    ] : [];

    const activeCategories = activeFilters.filter(f => f.type === 'kategori').map(f => f.value);
    const activeItems = activeFilters.filter(f => f.type === 'barang').map(f => f.value);

    const filtered = items.filter(i => {
        const catName = i.category?.name || "Tanpa Kategori";
        const matchesCategory = activeCategories.length === 0 || activeCategories.includes(catName);
        const matchesItem = activeItems.length === 0 || activeItems.includes(i.name);
        const matchesFreeText = searchInput.trim() === "" ||
            i.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            i.code.toLowerCase().includes(searchInput.toLowerCase());
        return matchesCategory && matchesItem && matchesFreeText;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Package size={20} className="text-green-400" />
                            Data Barang Utama
                        </h2>
                        <p className="text-[13px] text-slate-400 mt-0.5">Kelola master barang, kategori, dan cek Serial Number.</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn btn-primary text-sm px-4 h-9 flex items-center gap-2"
                >
                    <Plus size={16} /> Tambah Barang
                </button>
            </div>

            {/* Content Card */}
            <div className="card !p-0 overflow-hidden border border-[#1E293B]">
                {/* Toolbar */}
                <div className="p-4 border-b border-[#1E293B] bg-[#0F172A]/50 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">Daftar Barang</h3>
                            <span className="badge badge-green">{filtered.length}</span>
                        </div>

                        {/* Smart Search Bar */}
                        <div className="relative w-full sm:w-96">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                            <input
                                type="text"
                                placeholder="Ketik untuk filter: kategori, nama barang, serial number..."
                                value={searchInput}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                                className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all font-medium"
                            />

                            {/* Autocomplete Suggestions */}
                            {isSuggestionsOpen && suggestions.length > 0 && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {suggestions.filter(s => s.type === 'kategori').length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                        <Tags size={10} /> Kategori
                                                    </div>
                                                    {suggestions.filter(s => s.type === 'kategori').map(s => (
                                                        <button key={`kat-${s.value}`} onClick={() => addFilter(s as any)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-green-500/10 transition-colors">
                                                            <Tags size={12} className="text-purple-400 shrink-0" />
                                                            <span className="text-slate-300">{s.label}</span>
                                                            <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {suggestions.filter(s => s.type === 'barang').length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                        <Package size={10} /> Nama Barang
                                                    </div>
                                                    {suggestions.filter(s => s.type === 'barang').map(s => (
                                                        <button key={`brg-${s.value}`} onClick={() => addFilter(s as any)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-green-500/10 transition-colors">
                                                            <Package size={12} className="text-green-400 shrink-0" />
                                                            <span className="text-slate-300">{s.label}</span>
                                                            <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {/* SN search results */}
                                            {snSearching && (
                                                <div className="px-4 py-3 text-center text-xs text-slate-500">
                                                    <Loader2 size={14} className="animate-spin inline mr-2" />Mencari Serial Number...
                                                </div>
                                            )}
                                            {!snSearching && snResults.length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                        <Hash size={10} /> Serial Number
                                                    </div>
                                                    {snResults.map(sn => (
                                                        <button key={`sn-${sn.id}`} onClick={() => { setIsSuggestionsOpen(false); setSearchInput(''); router.push(`/master/sn/${sn.id}`); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-green-500/10 transition-colors">
                                                            <Hash size={12} className="text-purple-400 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <span className="font-mono text-white font-medium">{sn.code}</span>
                                                                <span className="text-slate-500 ml-2">→ {sn.item.code} - {sn.item.name}</span>
                                                            </div>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${sn.itemstatus?.name === 'In Stock' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                                {sn.itemstatus?.name || '?'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Badges */}
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter Aktif:</span>
                            {activeFilters.map((f, i) => (
                                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${f.type === 'kategori' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                                    {f.type === 'kategori' ? <Tags size={10} /> : <Package size={10} />}
                                    <span className="text-[11px] font-medium">{f.label}</span>
                                    <button onClick={() => removeFilter(f as any)} className="ml-0.5 p-0.5 rounded-full transition-colors hover:bg-white/10">
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setActiveFilters([])} className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-2">
                                Reset Semua
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center pt-32 pb-32 gap-3">
                            <Loader2 size={24} className="text-green-500 animate-spin" />
                            <p className="text-sm text-slate-500">Memuat data barang...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-32 pb-32 gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                                <Package size={20} className="text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-500">Tidak ada barang ditemukan.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="px-5 py-3.5">Kode Barang</th>
                                    <th className="px-5 py-3.5">Nama & Kategori</th>
                                    <th className="px-5 py-3.5 text-center w-16">SN</th>
                                    <th className="px-5 py-3.5 text-right w-28">Stok Fisik</th>
                                    <th className="px-5 py-3.5 text-right w-28">Total SN</th>
                                    <th className="px-5 py-3.5 text-center w-32">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-5 py-4">
                                            <span className="font-mono text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded border border-slate-700/50">
                                                {item.code}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-white group-hover:text-green-400 transition-colors">{item.name}</p>
                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                                                {item.category?.name || "Tanpa Kategori"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {item.hasSN ? (
                                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">SN</span>
                                            ) : (
                                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">Non</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-mono font-bold text-base leading-none ${item.totalFisik === 0 ? 'text-slate-600' : 'text-green-400'}`}>
                                                    {item.totalFisik.toLocaleString('id-ID')}
                                                </span>
                                                <span className="text-[10px] text-slate-500 mt-1">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-mono font-bold text-base leading-none ${(item.snCount || 0) === 0 ? 'text-slate-600' : 'text-purple-400'}`}>
                                                    {(item.snCount || 0).toLocaleString('id-ID')}
                                                </span>
                                                <span className="text-[10px] text-slate-500 mt-1">SN Terdaftar</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex justify-center gap-1.5">
                                                <Link href={`/master/items/${item.id}`} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-colors" title="Detail & SN">
                                                    <ArrowRight size={15} />
                                                </Link>
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => { setDeletingItem(item); setIsDeleteModalOpen(true); setErrorMsg(""); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <h3 className="font-bold text-white text-lg">
                                {editingItem ? "Edit Barang" : "Tambah Barang"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {errorMsg && !isDeleteModalOpen && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{errorMsg}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kode Barang <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 font-mono"
                                    placeholder="Contoh: BK-001"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Barang <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
                                    placeholder="Contoh: BUKU A"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kategori <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.categoryId}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
                                >
                                    <option value="">Pilih Kategori</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.hasSN ? '(SN)' : '(Non-SN)'}</option>
                                    ))}
                                </select>
                                {formData.categoryId && (
                                    <p className="text-[11px] mt-1.5">
                                        {formData.hasSN ? (
                                            <span className="text-blue-400">✓ Kategori ini wajib Serial Number</span>
                                        ) : (
                                            <span className="text-amber-400">✓ Kategori ini tanpa Serial Number (cukup Qty)</span>
                                        )}
                                    </p>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">
                                    Batal
                                </button>
                                <button type="submit" disabled={submitLoading} className="flex-1 btn btn-primary py-2 text-sm">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {isDeleteModalOpen && deletingItem && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">Hapus Barang?</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Anda yakin ingin menghapus barang <span className="font-semibold text-white">"{deletingItem.name}"</span> ({deletingItem.code})? Tindakan ini tidak dapat dibatalkan.
                        </p>

                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left mb-4 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-400">{errorMsg}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => { setIsDeleteModalOpen(false); setDeletingItem(null); setErrorMsg(""); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">
                                Batal
                            </button>
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
