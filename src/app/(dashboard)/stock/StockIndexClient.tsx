"use client";

import { useState } from "react";
import { Building2, Package, Search, ArrowRight, ArrowLeft, X, Tags } from "lucide-react";
import Link from "next/link";

type WarehouseItem = {
    id: number;
    name: string;
    location: string | null;
    type: string;
    totalFisik: number;
};

type ActiveFilter = { type: 'tipe'; value: string; label: string };

export default function StockIndexClient({ warehouses }: { warehouses: WarehouseItem[] }) {
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

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

    // Build suggestions
    const uniqueTypes = Array.from(new Set(warehouses.map(w => w.type)));
    const suggestions: ActiveFilter[] = searchInput.trim().length > 0 ? [
        ...uniqueTypes
            .filter(t => t.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(t => !activeFilters.some(f => f.type === 'tipe' && f.value === t))
            .map(t => ({ type: 'tipe' as const, value: t, label: t }))
    ] : [];

    const activeTypeFilters = activeFilters.filter(f => f.type === 'tipe').map(f => f.value);

    const filtered = warehouses.filter(w => {
        const matchesType = activeTypeFilters.length === 0 || activeTypeFilters.includes(w.type);
        const matchesFreeText = searchInput.trim() === '' ||
            w.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            (w.location || '').toLowerCase().includes(searchInput.toLowerCase());
        return matchesType && matchesFreeText;
    });

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/master" className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Building2 size={20} className="text-amber-400" />
                            Direktori Gudang
                        </h2>
                        <p className="text-[13px] text-slate-400 mt-0.5">Pilih gudang untuk melihat detail stok dan riwayat aktivitas.</p>
                    </div>
                </div>
                <div className="relative w-full md:w-96">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                    <input
                        type="text"
                        placeholder="Ketik untuk filter: tipe gudang, nama, lokasi..."
                        value={searchInput}
                        onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
                        onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                        className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner"
                    />

                    {/* Autocomplete Suggestions */}
                    {isSuggestionsOpen && suggestions.length > 0 && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                        <Tags size={10} /> Tipe Gudang
                                    </div>
                                    {suggestions.map(s => (
                                        <button key={`type-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-amber-500/10 transition-colors">
                                            <Building2 size={12} className="text-amber-400 shrink-0" />
                                            <span className="text-slate-300">{s.label}</span>
                                            <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                        </button>
                                    ))}
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
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all bg-amber-500/10 border-amber-500/20 text-amber-400">
                            <Building2 size={10} />
                            <span className="text-[11px] font-medium">{f.label}</span>
                            <button onClick={() => removeFilter(f)} className="ml-0.5 p-0.5 rounded-full transition-colors hover:bg-white/10">
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setActiveFilters([])} className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-2">
                        Reset Semua
                    </button>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="card text-center py-20 border-[#1E293B]">
                    <Building2 size={32} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm">Tidak ada gudang ditemukan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(w => (
                        <Link href={`/stock/warehouse/${w.id}`} key={w.id} className="stat-card group relative overflow-hidden cursor-pointer p-5 h-full flex flex-col justify-between">
                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="relative z-10 w-full mb-6">
                                <div className="flex items-start justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                                        <Building2 size={24} className="text-amber-400" />
                                    </div>
                                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border border-slate-700">
                                        {w.type}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mt-4 leading-tight group-hover:text-amber-400 transition-colors">
                                    {w.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{w.location || "Lokasi tidak diatur"}</p>
                            </div>

                            <div className="relative z-10 w-full flex items-center justify-between pt-4 border-t border-[#1E293B]">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Fisik</p>
                                    <p className="text-lg font-mono font-bold text-green-400 flex items-center gap-1.5">
                                        {w.totalFisik.toLocaleString('id-ID')}
                                        <Package size={12} className="text-slate-600" />
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-[#020617] transition-all">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
