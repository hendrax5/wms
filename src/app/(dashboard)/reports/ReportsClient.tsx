"use client";

import { useState, useEffect } from "react";
import { BarChart3, History, ShieldAlert, Loader2, Download, Package, Search, X, Tags, Building2, Activity } from "lucide-react";
import { getStockSummaryReport, getTransactionHistoryReport, getDamagedItemsReport } from "@/app/actions/reports";

type TabType = "STOCK" | "HISTORY" | "DAMAGED";

export default function ReportsClient() {
    const [activeTab, setActiveTab] = useState<TabType>("STOCK");

    // Data states
    const [stockData, setStockData] = useState<any[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [damagedData, setDamagedData] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    // Search & Filter State
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<{ type: string; value: string; label: string }[]>([]);

    const addFilter = (filter: { type: string; value: string; label: string }) => {
        if (!activeFilters.some(f => f.type === filter.type && f.value === filter.value)) {
            setActiveFilters(prev => [...prev, filter]);
        }
        setSearchInput("");
        setIsSuggestionsOpen(false);
    };

    const removeFilter = (filter: { type: string; value: string; label: string }) => {
        setActiveFilters(prev => prev.filter(f => !(f.type === filter.type && f.value === filter.value)));
    };

    // Reset search when switching tabs
    useEffect(() => {
        setSearchInput("");
        setActiveFilters([]);
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        const [stockRes, histRes, dmgRes] = await Promise.all([
            getStockSummaryReport(),
            getTransactionHistoryReport(100),
            getDamagedItemsReport()
        ]);

        if (stockRes.success) setStockData(stockRes.data || []);
        if (histRes.success) setHistoryData(histRes.data || []);
        if (dmgRes.success) setDamagedData(dmgRes.data || []);

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter Logic per Tab
    const filteredStock = stockData.filter(w => {
        const activeTypes = activeFilters.filter(f => f.type === 'tipe').map(f => f.value);
        const matchesType = activeTypes.length === 0 || activeTypes.includes(w.type);
        const matchesSearch = searchInput === '' ||
            w.warehouseName.toLowerCase().includes(searchInput.toLowerCase()) ||
            w.type.toLowerCase().includes(searchInput.toLowerCase());
        return matchesType && matchesSearch;
    });

    const filteredHistory = historyData.filter(h => {
        const activeTypes = activeFilters.filter(f => f.type === 'transaksi').map(f => f.value);
        const matchesType = activeTypes.length === 0 || activeTypes.includes(h.type);
        const matchesSearch = searchInput === '' ||
            h.item.toLowerCase().includes(searchInput.toLowerCase()) ||
            h.location.toLowerCase().includes(searchInput.toLowerCase()) ||
            (h.target || '').toLowerCase().includes(searchInput.toLowerCase());
        return matchesType && matchesSearch;
    });

    const filteredDamaged = damagedData.filter(d => {
        const activeWarehouses = activeFilters.filter(f => f.type === 'gudang').map(f => f.value);
        const matchesWarehouse = activeWarehouses.length === 0 || activeWarehouses.includes(d.warehouseName);
        const matchesSearch = searchInput === '' ||
            d.itemName.toLowerCase().includes(searchInput.toLowerCase()) ||
            d.warehouseName.toLowerCase().includes(searchInput.toLowerCase()) ||
            (d.description || '').toLowerCase().includes(searchInput.toLowerCase());
        return matchesWarehouse && matchesSearch;
    });

    // Suggestions Logic per Tab
    const getSuggestions = () => {
        if (searchInput.trim().length === 0) return [];

        if (activeTab === "STOCK") {
            const types = Array.from(new Set(stockData.map(w => w.type)));
            return types
                .filter(t => t.toLowerCase().includes(searchInput.toLowerCase()))
                .filter(t => !activeFilters.some(f => f.type === 'tipe' && f.value === t))
                .map(t => ({ type: 'tipe', value: t, label: `Tipe: ${t}` }));
        }

        if (activeTab === "HISTORY") {
            const types = Array.from(new Set(historyData.map(h => h.type)));
            return types
                .filter(t => t.toLowerCase().includes(searchInput.toLowerCase()))
                .filter(t => !activeFilters.some(f => f.type === 'transaksi' && f.value === t))
                .map(t => ({ type: 'transaksi', value: t, label: `Jenis: ${t}` }));
        }

        if (activeTab === "DAMAGED") {
            const warehouses = Array.from(new Set(damagedData.map(d => d.warehouseName)));
            return warehouses
                .filter(w => w.toLowerCase().includes(searchInput.toLowerCase()))
                .filter(w => !activeFilters.some(f => f.type === 'gudang' && f.value === w))
                .map(w => ({ type: 'gudang', value: w, label: `Gudang: ${w}` }));
        }

        return [];
    };

    const suggestions = getSuggestions();

    // Helper functions for tables
    const renderStockTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Aggregate Widgets */}
                <div className="glass p-5 rounded-xl border border-[#334155]">
                    <p className="text-sm text-slate-400 mb-1">Total Gudang / Cabang</p>
                    <p className="text-3xl font-bold text-white">{filteredStock.length}</p>
                </div>
                <div className="glass p-5 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <p className="text-sm text-blue-400 mb-1">Stock Aktif (Filtered)</p>
                    <p className="text-3xl font-bold text-blue-50">
                        {filteredStock.reduce((acc, curr) => acc + curr.totalActive, 0)}
                    </p>
                </div>
                <div className="glass p-5 rounded-xl border border-red-500/30 bg-red-500/5">
                    <p className="text-sm text-red-400 mb-1">Stock Rusak (Filtered)</p>
                    <p className="text-3xl font-bold text-red-50">
                        {filteredStock.reduce((acc, curr) => acc + curr.totalDamaged, 0)}
                    </p>
                </div>
            </div>

            <div className="glass rounded-xl border border-[#334155] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#020617] text-slate-300 border-b border-[#334155]">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Gudang / Cabang</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Tipe Gudang</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Baru</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Dismantle</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-red-400">Rusak</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-blue-400">Total Aktif</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Top Kategori</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#334155] text-slate-200">
                            {filteredStock.map((w, idx) => (
                                <tr key={idx} className="hover:bg-blue-500/[0.03] transition-colors border-b border-[#334155]/30">
                                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                                        <Package size={16} className="text-slate-500" />
                                        {w.warehouseName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] rounded font-bold border uppercase tracking-tight ${w.type === 'PUSAT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                            {w.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{w.totalNew}</td>
                                    <td className="px-6 py-4 font-mono">{w.totalDismantle}</td>
                                    <td className="px-6 py-4 text-red-400 font-mono font-bold bg-red-500/[0.02]">{w.totalDamaged}</td>
                                    <td className="px-6 py-4 text-blue-400 font-mono font-bold bg-blue-500/[0.03]">{w.totalActive}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(w.categories).slice(0, 2).map(([cat, count]: any) => (
                                                <span key={cat} className="inline-block bg-[#020617] text-[10px] px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                                                    {cat}: {count}
                                                </span>
                                            ))}
                                            {Object.keys(w.categories).length > 2 && <span className="text-slate-600 text-[10px] ml-0.5">+{Object.keys(w.categories).length - 2}</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="glass rounded-xl border border-[#334155] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#020617] text-slate-300 border-b border-[#334155]">
                        <tr>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Waktu</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Tipe Transaksi</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Barang</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Qty</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Asal (Gudang)</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Tujuan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155] text-slate-200">
                        {filteredHistory.map((h, idx) => (
                            <tr key={h.id} className="hover:bg-blue-500/[0.02] transition-colors border-b border-[#334155]/30">
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {new Date(h.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] rounded font-bold border uppercase tracking-tight ${h.type === 'INBOUND' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        h.type === 'TRANSFER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}>
                                        {h.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-200">{h.item}</td>
                                <td className={`px-6 py-4 font-mono font-bold ${h.type === 'INBOUND' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {h.type === 'INBOUND' ? '+' : '-'}{h.qty}
                                </td>
                                <td className="px-6 py-4 text-slate-400">{h.location}</td>
                                <td className="px-6 py-4 text-slate-500 italic">{h.target || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderDamagedTab = () => (
        <div className="glass rounded-xl border border-red-900/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-xl shadow-red-950/10">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#180808] text-red-200 border-b border-red-900/50">
                        <tr>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Tanggal Lapor</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Gudang Penyimpanan</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Barang</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Qty</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Keterangan</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Serial Numbers</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/20 text-slate-200">
                        {filteredDamaged.map((d, idx) => (
                            <tr key={d.id} className="hover:bg-red-500/[0.03] transition-colors border-b border-red-950/30">
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {new Date(d.date).toLocaleString('id-ID', { dateStyle: 'short' })}
                                </td>
                                <td className="px-6 py-4 font-bold text-red-200/80">{d.warehouseName}</td>
                                <td className="px-6 py-4 font-medium">
                                    <div className="text-slate-200">{d.itemName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{d.category}</div>
                                </td>
                                <td className="px-6 py-4 text-red-400 font-mono font-bold bg-red-500/[0.02]">{d.qty}</td>
                                <td className="px-6 py-4 text-xs max-w-xs truncate text-slate-400 italic">{d.description || "-"}</td>
                                <td className="px-6 py-4">
                                    {d.serialNumbers.length > 0 ? (
                                        <div className="flex gap-1 flex-wrap max-w-sm">
                                            {d.serialNumbers.map((sn: string) => (
                                                <span key={sn} className="bg-red-500/10 text-red-300/80 px-2 py-0.5 rounded text-[10px] font-mono border border-red-500/20">
                                                    {sn}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-600 text-[10px] italic">Tanpa SN</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-6">

            {/* TABS HEADER */}
            <div className="flex overflow-x-auto pb-2 border-b border-[#334155] gap-2 md:gap-8 custom-scrollbar">
                <button
                    onClick={() => setActiveTab("STOCK")}
                    className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === "STOCK" ? "text-blue-400 border-blue-400" : "text-slate-400 border-transparent hover:text-slate-200"}`}
                >
                    <BarChart3 size={18} /> Ringkasan Stok (Global)
                </button>
                <button
                    onClick={() => setActiveTab("HISTORY")}
                    className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === "HISTORY" ? "text-blue-400 border-blue-400" : "text-slate-400 border-transparent hover:text-slate-200"}`}
                >
                    <History size={18} /> History Transaksi (100 Terakhir)
                </button>
                <button
                    onClick={() => setActiveTab("DAMAGED")}
                    className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === "DAMAGED" ? "text-red-400 border-red-400" : "text-slate-400 border-transparent hover:text-slate-200"}`}
                >
                    <ShieldAlert size={18} /> Laporan Barang Rusak
                </button>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="space-y-4 px-1">
                <div className="relative max-w-xl">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                    <input
                        type="text"
                        placeholder={activeTab === "STOCK" ? "Cari gudang, filter tipe..." : activeTab === "HISTORY" ? "Cari barang, lokasi, jenis transaksi..." : "Cari barang, gudang, keterangan..."}
                        value={searchInput}
                        onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
                        onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                        className="w-full bg-[#020617] border border-[#334155] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all font-medium"
                    />

                    {/* Autocomplete Suggestions */}
                    {isSuggestionsOpen && suggestions.length > 0 && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-2 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden border-t-0 animate-in fade-in zoom-in-95 duration-200">
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-[#020617]/60 flex items-center gap-1.5 border-b border-[#1E293B]/50">
                                        <Tags size={10} /> Rekomendasi Filter
                                    </div>
                                    {suggestions.map((s, idx) => (
                                        <button key={idx} onClick={() => addFilter(s)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left hover:bg-blue-500/10 transition-colors border-b border-[#1E293B]/30 last:border-0 group">
                                            {s.type === 'tipe' ? <Building2 size={12} className="text-purple-400" /> : <Activity size={12} className="text-blue-400" />}
                                            <span className="text-slate-300 group-hover:text-white transition-colors">{s.label}</span>
                                            <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">tambah filter</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Active Filter Badges */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Filter Aktif:</span>
                        {activeFilters.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-lg border transition-all bg-blue-500/5 border-blue-500/20 text-blue-400 group">
                                {f.type === 'tipe' ? <Building2 size={10} /> : <Activity size={10} />}
                                <span className="text-[11px] font-bold uppercase tracking-tighter">{f.label}</span>
                                <button onClick={() => removeFilter(f)} className="ml-1 p-0.5 rounded-md hover:bg-blue-400/20 transition-colors">
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => setActiveFilters([])} className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-4 decoration-slate-700 decoration-2 font-bold ml-2">
                            CLEAR ALL
                        </button>
                    </div>
                )}
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <p className="text-slate-500 font-medium">Menyusun laporan...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "STOCK" && renderStockTab()}
                        {activeTab === "HISTORY" && renderHistoryTab()}
                        {activeTab === "DAMAGED" && renderDamagedTab()}

                        {/* EMPTY STATE FOR FILTER */}
                        {((activeTab === "STOCK" && filteredStock.length === 0) ||
                            (activeTab === "HISTORY" && filteredHistory.length === 0) ||
                            (activeTab === "DAMAGED" && filteredDamaged.length === 0)) && (
                                <div className="glass rounded-xl border border-dashed border-[#334155] p-20 flex flex-col items-center text-center animate-in fade-in zoom-in-95">
                                    <Search size={40} className="text-slate-700 mb-4" />
                                    <h4 className="text-lg font-bold text-slate-300">Hasil Tidak Ditemukan</h4>
                                    <p className="text-slate-500 text-sm max-w-xs mt-1">Maaf, data yang Anda cari tidak ada dalam laporan ini. Coba sesuaikan kata kunci atau filter Anda.</p>
                                    <button onClick={() => { setSearchInput(""); setActiveFilters([]); }} className="mt-6 text-blue-400 font-bold text-xs uppercase tracking-widest hover:text-blue-300 transition-colors">
                                        Reset Semua Filter
                                    </button>
                                </div>
                            )}
                    </>
                )}
            </div>

        </div>
    );
}
