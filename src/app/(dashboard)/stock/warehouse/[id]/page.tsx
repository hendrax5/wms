"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWarehouseDetails, getWarehouseSerialNumbers } from "@/app/actions/master";
import {
    ArrowLeft, Building2, Package, Search, Loader2, ArrowUpRight,
    ArrowDownLeft, Clock, MapPin, Hash, X, Tags, Download
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

type StockDetail = {
    id: number;
    stockNew: number;
    stockDismantle: number;
    stockDamaged: number;
    item: {
        id: number;
        code: string;
        name: string;
        unit: string;
        category: { name: string } | null;
    };
};

type HistoryLog = {
    id: number;
    createdAt: Date;
    qty: number;
    description: string | null;
    item: { name: string; code: string };
    type: 'IN' | 'OUT';
};

type WarehouseData = {
    warehouse: {
        id: number;
        name: string;
        location: string | null;
        type: string;
        area: { name: string } | null;
    };
    historyIn: any[];
    historyOut: any[];
};

type ActiveFilter = { type: 'kategori' | 'barang'; value: string; label: string };

export default function WarehouseDetailMasterPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<WarehouseData | null>(null);
    const [stocks, setStocks] = useState<StockDetail[]>([]);
    const [history, setHistory] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
    const [isExportingSN, setIsExportingSN] = useState(false);

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

    useEffect(() => {
        const id = Number(params.id);
        if (isNaN(id)) {
            router.push("/stock");
            return;
        }

        const loadData = async () => {
            setLoading(true);
            const res = await getWarehouseDetails(id);
            if (res.success) {
                const whData = res.data as any;
                setData({ warehouse: whData.warehouse, historyIn: [], historyOut: [] });
                setStocks(whData.warehouse.stocks);

                // Combine and format history
                const combined: HistoryLog[] = [
                    ...whData.historyIn.map((h: any) => ({ ...h, type: 'IN' as const })),
                    ...whData.historyOut.map((h: any) => ({ ...h, type: 'OUT' as const }))
                ];
                combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setHistory(combined.slice(0, 30)); // Show top 30
            } else {
                router.push("/stock");
            }
            setLoading(false);
        };

        loadData();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-amber-400 w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500">Memuat detail gudang & stok...</p>
            </div>
        );
    }

    if (!data) return null;

    // Build suggestion options from stock data
    const uniqueCategories = Array.from(new Set(stocks.map(s => s.item.category?.name || "Tanpa Kategori")));
    const uniqueItemNames = Array.from(new Set(stocks.map(s => s.item.name)));

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

    // Filter stocks based on active filters
    const activeCategories = activeFilters.filter(f => f.type === 'kategori').map(f => f.value);
    const activeItems = activeFilters.filter(f => f.type === 'barang').map(f => f.value);

    const filteredStocks = stocks.filter(s => {
        const catName = s.item.category?.name || "Tanpa Kategori";
        const matchesCategory = activeCategories.length === 0 || activeCategories.includes(catName);
        const matchesItem = activeItems.length === 0 || activeItems.includes(s.item.name);
        // Also do free text search for anything that doesn't match a suggestion
        const matchesFreeText = searchInput.trim() === "" ||
            s.item.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            s.item.code.toLowerCase().includes(searchInput.toLowerCase());
        return matchesCategory && matchesItem && matchesFreeText;
    });

    const totalFisik = stocks.reduce((acc, curr) => acc + curr.stockNew + curr.stockDismantle + curr.stockDamaged, 0);
    const totalNonSN = stocks.filter(s => !s.item?.hasSN).reduce((acc, curr) => acc + curr.stockNew + curr.stockDismantle + curr.stockDamaged, 0);
    const totalJenis = stocks.length;

    const exportToExcel = () => {
        if (filteredStocks.length === 0) return;

        const exportData = filteredStocks.map(stock => ({
            "Kode Barang": stock.item.code,
            "Nama Barang": stock.item.name,
            "Kategori": stock.item.category?.name || "Tanpa Kategori",
            "Baru": stock.stockNew,
            "Dismantle": stock.stockDismantle,
            "Rusak": stock.stockDamaged,
            "Total Fisik": stock.stockNew + stock.stockDismantle + stock.stockDamaged,
            "Satuan": stock.item.unit
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stok Gudang");
        XLSX.writeFile(wb, `Stok_Gudang_${data.warehouse.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };


    const exportSNDetail = async () => {
        if (!data?.warehouse) return;
        setIsExportingSN(true);
        try {
            const res = await getWarehouseSerialNumbers(data.warehouse.id);
            if (res.success && res.data) {
                if (res.data.length === 0) {
                    alert("Tidak ada data Serial Number di gudang ini.");
                    return;
                }
                const exportData = res.data.map((sn: any) => ({
                    "Kode Barang": sn.item.code,
                    "Nama Barang / Merk": sn.item.name,
                    "Kategori": sn.item.category?.name || "Tanpa Kategori",
                    "Serial Number": sn.code,
                    "Tipe / Kondisi": sn.itemtype?.name || "Baru",
                    "Status": sn.itemstatus?.name || "Tersedia",
                    "Harga": sn.price || 0
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Detail SN");
                XLSX.writeFile(wb, `Detail_SN_${data.warehouse.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            } else {
                alert("Gagal memuat data SN");
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat export SN");
        } finally {
            setIsExportingSN(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in custom-scrollbar">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Link href="/stock" className="hover:text-white transition-colors">Direktori Gudang</Link>
                        <span>/</span>
                        <span className="text-white font-medium">{data.warehouse.name}</span>
                    </div>
                </div>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 border border-[#1E293B] relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] bg-amber-500/10 pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700" />

                <div className="flex gap-5 relative z-10 w-full mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-amber-500/20 flex items-center justify-center shadow-inner shrink-0 shadow-amber-500/10">
                        <Building2 size={32} className="text-amber-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold tracking-tight text-white">{data.warehouse.name}</h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                                {data.warehouse.type}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {data.warehouse.location || 'Lokasi tidak diatur'}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-blue-400 font-medium">Area: {data.warehouse.area?.name || 'Global'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8 relative z-10 md:min-w-[400px]">
                    <div className="flex flex-col gap-1 w-full">
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Fisik</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold font-mono text-green-400 leading-none">{totalFisik.toLocaleString('id-ID')}</span>
                            <span className="text-xs text-slate-500 mb-1">Unit</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Non-SN</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold font-mono text-blue-400 leading-none">{totalNonSN.toLocaleString('id-ID')}</span>
                            <span className="text-xs text-slate-500 mb-1">Unit</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Jenis Barang</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold font-mono text-purple-400 leading-none">{totalJenis.toLocaleString('id-ID')}</span>
                            <span className="text-xs text-slate-500 mb-1">Item</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Stock Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <Package size={20} className="text-amber-400" />
                                Kapasitas & Stok Tersedia
                                <span className="text-xs font-normal text-slate-500 ml-1">({filteredStocks.length} item)</span>
                            </h3>

                            {/* Smart Search Bar */}
                            <div className="relative w-full sm:w-96">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                                <input
                                    type="text"
                                    placeholder="Ketik untuk filter: kategori, nama barang..."
                                    value={searchInput}
                                    onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
                                    onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                                    className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />

                                {/* Autocomplete Suggestions */}
                                {isSuggestionsOpen && suggestions.length > 0 && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                {/* Kategori Group */}
                                                {suggestions.filter(s => s.type === 'kategori').length > 0 && (
                                                    <>
                                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                            <Tags size={10} /> Kategori
                                                        </div>
                                                        {suggestions.filter(s => s.type === 'kategori').map(s => (
                                                            <button key={`kat-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-amber-500/10 transition-colors">
                                                                <Tags size={12} className="text-purple-400 shrink-0" />
                                                                <span className="text-slate-300">{s.label}</span>
                                                                <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                                {/* Barang Group */}
                                                {suggestions.filter(s => s.type === 'barang').length > 0 && (
                                                    <>
                                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                            <Package size={10} /> Nama Barang
                                                        </div>
                                                        {suggestions.filter(s => s.type === 'barang').map(s => (
                                                            <button key={`brg-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-amber-500/10 transition-colors">
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
                            
                            {/* Export Button */}
                            <button 
                                onClick={exportToExcel}
                                disabled={filteredStocks.length === 0}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
                            >
                                <Download size={14} /> Export Excel
                            </button>
                        </div>

                        {/* Active Filter Badges */}
                        {activeFilters.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter Aktif:</span>
                                {activeFilters.map((f, i) => (
                                    <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${f.type === 'kategori' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                        'bg-green-500/10 border-green-500/20 text-green-400'
                                        }`}>
                                        {f.type === 'kategori' ? <Tags size={10} /> : <Package size={10} />}
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
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                            <button
                                onClick={exportToExcel}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all font-medium text-sm border border-slate-700"
                            >
                                <Download size={14} />
                                <span>Export Stok</span>
                            </button>
                            <button
                                onClick={exportSNDetail}
                                disabled={isExportingSN}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all font-medium text-sm border border-blue-500/20 disabled:opacity-50"
                            >
                                {isExportingSN ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                <span>Export SN</span>
                            </button>
                        </div>
                    </div>

                    <div className="card !p-0 overflow-hidden border border-[#1E293B]">
                        <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                            {filteredStocks.length === 0 ? (
                                <div className="p-10 text-center text-sm text-slate-500">
                                    {(searchInput || activeFilters.length > 0) ? `Tidak ada barang stok yang cocok dengan filter.` : "Gudang ini masih kosong."}
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="border-b border-[#1E293B] bg-[#020617]/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                            <th className="px-4 py-3">Nama & Kode</th>
                                            <th className="px-4 py-3 text-right w-32 whitespace-nowrap">Baru</th>
                                            <th className="px-4 py-3 text-right w-32 whitespace-nowrap">Dismantle</th>
                                            <th className="px-4 py-3 text-right w-32 whitespace-nowrap">Rusak</th>
                                            <th className="px-4 py-3 text-right w-48 whitespace-nowrap">Total Fisik</th>
                                            <th className="px-4 py-3 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {filteredStocks.map(stock => {
                                            const itemTotal = stock.stockNew + stock.stockDismantle + stock.stockDamaged;
                                            return (
                                                <tr key={stock.id}
                                                    onClick={() => router.push(`/master/items/${stock.item.id}?warehouseId=${data.warehouse.id}`)}
                                                    className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-4 py-3">
                                                        <Link href={`/master/items/${stock.item.id}?warehouseId=${data.warehouse.id}`} className="block group-hover:text-green-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                            <p className="font-semibold text-white group-hover:text-green-400">{stock.item.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="font-mono text-[10px] text-slate-400 bg-slate-800/50 px-1.5 rounded">{stock.item.code}</span>
                                                                {!stock.item.hasSN && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Non-SN</span>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-mono font-bold text-sm text-blue-400">{stock.stockNew.toLocaleString('id-ID')}</span>
                                                            <span className="text-[10px] text-slate-500">{stock.item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-mono font-bold text-sm text-purple-400">{stock.stockDismantle.toLocaleString('id-ID')}</span>
                                                            <span className="text-[10px] text-slate-500">{stock.item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-mono font-bold text-sm text-red-400">{stock.stockDamaged.toLocaleString('id-ID')}</span>
                                                            <span className="text-[10px] text-slate-500">{stock.item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 bg-[#0F172A]/30">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-mono font-bold text-sm text-green-400">{itemTotal.toLocaleString('id-ID')}</span>
                                                            <span className="text-[10px] text-slate-500">{stock.item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Link href={`/master/items/${stock.item.id}?warehouseId=${data.warehouse.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#020617] border border-[#1E293B] text-slate-400 hover:text-green-400 hover:border-green-500/30 transition-all group-hover:bg-white/5" onClick={(e) => e.stopPropagation()}>
                                                            <ArrowUpRight size={14} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Activity History */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Clock size={20} className="text-blue-400" />
                        Log Aktivitas Terbaru
                    </h3>

                    <div className="card p-0 border border-[#1E293B] overflow-hidden bg-[#0F172A]">
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                            {history.length === 0 ? (
                                <div className="p-8 text-center text-sm text-slate-500">Belum ada aktivitas.</div>
                            ) : (
                                <div className="divide-y divide-[#1E293B]/50">
                                    {history.map((h, i) => (
                                        <div key={i} className="p-4 bg-[#0F172A] hover:bg-[#1E293B]/50 transition-colors flex gap-3">
                                            <div className="shrink-0 mt-0.5">
                                                {h.type === 'IN' ? (
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                        <ArrowDownLeft size={16} className="text-green-500" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                        <ArrowUpRight size={16} className="text-blue-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <p className="text-sm font-semibold text-white truncate">{h.item.name}</p>
                                                    <span className={`text-xs font-mono font-bold shrink-0 ${h.type === 'IN' ? 'text-green-400' : 'text-blue-400'}`}>
                                                        {h.type === 'IN' ? '+' : '-'}{h.qty}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-mono mb-1.5">{h.item.code}</p>
                                                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                                    <span>{h.description || (h.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar')}</span>
                                                    <span>{new Date(h.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
