"use client";

import { useState, useEffect } from "react";
import { getItems } from "@/app/actions/master";
import { Package, Search, Loader2, ArrowLeft, ArrowRight, X, Tags } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ItemProp = {
    id: number;
    code: string;
    name: string;
    unit: string;
    category: { name: string } | null;
    totalFisik: number;
    snCount: number;
};

type ActiveFilter = { type: 'kategori' | 'barang'; value: string; label: string };

export default function ItemsClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [items, setItems] = useState<ItemProp[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(
        searchParams.get('search') ? [{ type: 'kategori', value: searchParams.get('search')!, label: searchParams.get('search')! }] : []
    );

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
        const res = await getItems();
        if (res.success) setItems(res.data as ItemProp[]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const uniqueCategories = Array.from(new Set(items.map(i => i.category?.name || "Tanpa Kategori")));

    const uniqueItemNames = Array.from(new Set(items.map(i => i.name)));

    // Generate suggestions based on current search input
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

    // Apply filters
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
                        <p className="text-[13px] text-slate-400 mt-0.5">Pantau ringkasan item dan masuk ke detail untuk cek Serial Number.</p>
                    </div>
                </div>
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
                                placeholder="Ketik untuk filter: kategori, nama barang..."
                                value={searchInput}
                                onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
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
                                    <th className="px-5 py-3.5 text-right w-28">Stok Fisik</th>
                                    <th className="px-5 py-3.5 text-right w-28">Total SN</th>
                                    <th className="px-5 py-3.5 text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => router.push(`/master/items/${item.id}`)}
                                        className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors group cursor-pointer"
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
                                            <Link href={`/master/items/${item.id}`} className="inline-flex items-center justify-center p-2 rounded-lg bg-[#020617] border border-[#1E293B] text-slate-400 hover:text-green-400 hover:border-green-500/30 transition-all group-hover:bg-white/5">
                                                <ArrowRight size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
