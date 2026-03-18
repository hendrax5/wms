"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getItemDetails } from "@/app/actions/master";
import { ArrowLeft, Package, Hash, Building2, Server, MapPin, Loader2, Search, X, Tags, Activity, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";

type ItemDetail = {
    id: number;
    code: string;
    name: string;
    unit: string;
    category: { name: string } | null;
    totalFisik: number;
    serialNumbers: {
        id: number;
        code: string;
        status: { name: string };
        type: { name: string };
        warehouse: { id: number; name: string } | null;
        pop: { id: number; name: string } | null;
        updatedAt: Date;
    }[];
};

type ActiveFilter = { type: 'lokasi' | 'status'; value: string; label: string };

/* ── Pagination ── */
const PP = 10;
function usePagination<T>(items: T[], perPage: number) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const safeP = Math.min(page, totalPages);
    const paged = items.slice((safeP - 1) * perPage, safeP * perPage);
    const reset = () => setPage(1);
    return { page: safeP, setPage, totalPages, paged, reset, total: items.length };
}
function PaginationBar({ page, totalPages, setPage, total, perPage, label }: { page: number; totalPages: number; setPage: (n: number) => void; total: number; perPage: number; label?: string }) {
    if (total <= perPage) return null;
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push('...'); for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i); if (page < totalPages - 2) pages.push('...'); pages.push(totalPages); }
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1">
            <span className="text-[11px] text-slate-500">Menampilkan <span className="text-white font-medium">{start}–{end}</span> dari <span className="text-white font-medium">{total}</span> {label || 'data'}</span>
            <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14} /></button>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                {pages.map((p, i) => p === '...' ? (<span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>) : (
                    <button key={p} type="button" onClick={() => setPage(p as number)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${page === p ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{p}</button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14} /></button>
            </div>
        </div>
    );
}

export default function ItemDetailClient() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialLocation = searchParams.get('warehouseId') ? `W-${searchParams.get('warehouseId')}` : null;

    const [item, setItem] = useState<ItemDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

    // Initialize location filter from URL param after data loads
    const [initialLocationApplied, setInitialLocationApplied] = useState(false);

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
            router.push("/master/items");
            return;
        }

        const loadData = async () => {
            setLoading(true);
            const res = await getItemDetails(id);
            if (res.success) {
                setItem(res.data as ItemDetail);
            } else {
                router.push("/master/items"); // Redirect if not found
            }
            setLoading(false);
        };

        loadData();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-400 w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500">Memuat detail barang & SN...</p>
            </div>
        );
    }

    if (!item) return null;

    // Get unique statuses and locations for suggestions
    const uniqueStatuses = Array.from(new Set(item.serialNumbers.map(sn => sn.status.name)));
    const uniqueLocationsMap = new Map();
    item.serialNumbers.forEach(sn => {
        if (sn.warehouse) uniqueLocationsMap.set(`W-${sn.warehouse.id}`, sn.warehouse.name);
        if (sn.pop) uniqueLocationsMap.set(`P-${sn.pop.id}`, sn.pop.name);
    });
    // Wait, let's fix the sn.getWarehouse name, it should be sn.warehouse based on the type definition above. 
    // The previous code had sn.warehouse.

    const uniqueLocs = Array.from(new Set(item.serialNumbers.map(sn => {
        if (sn.warehouse) return JSON.stringify({ id: `W-${sn.warehouse.id}`, name: sn.warehouse.name });
        if (sn.pop) return JSON.stringify({ id: `P-${sn.pop.id}`, name: sn.pop.name });
        return null;
    }))).filter(Boolean).map(s => JSON.parse(s as string));

    // Apply initial location filter from URL param (once)
    if (!initialLocationApplied && initialLocation && uniqueLocs.length > 0) {
        const locName = uniqueLocs.find(l => l.id === initialLocation)?.name;
        if (locName && !activeFilters.some(f => f.type === 'lokasi' && f.value === initialLocation)) {
            setActiveFilters(prev => [...prev, { type: 'lokasi', value: initialLocation, label: locName }]);
        }
        setInitialLocationApplied(true);
    }

    // Generate suggestions based on search input
    const suggestions: ActiveFilter[] = searchInput.trim().length > 0 ? [
        ...uniqueLocs
            .filter(l => l.name.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(l => !activeFilters.some(f => f.type === 'lokasi' && f.value === l.id))
            .map(l => ({ type: 'lokasi' as const, value: l.id, label: l.name })),
        ...uniqueStatuses
            .filter(s => s.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(s => !activeFilters.some(f => f.type === 'status' && f.value === s))
            .map(s => ({ type: 'status' as const, value: s, label: s }))
    ] : [];

    // Apply active filters
    const activeLocations = activeFilters.filter(f => f.type === 'lokasi').map(f => f.value);
    const activeStatuses = activeFilters.filter(f => f.type === 'status').map(f => f.value);

    const filteredSNs = item.serialNumbers.filter(sn => {
        const matchesFreeText = searchInput.trim() === "" ||
            sn.code.toLowerCase().includes(searchInput.toLowerCase()) ||
            sn.status.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            (sn.warehouse?.name || "").toLowerCase().includes(searchInput.toLowerCase()) ||
            (sn.pop?.name || "").toLowerCase().includes(searchInput.toLowerCase());

        const matchesStatus = activeStatuses.length === 0 || activeStatuses.includes(sn.status.name);

        let matchesLocation = true;
        if (activeLocations.length > 0) {
            matchesLocation = activeLocations.some(loc => {
                const isWarehouse = loc.startsWith("W-");
                const locId = Number(loc.split('-')[1]);
                return isWarehouse ? sn.warehouse?.id === locId : sn.pop?.id === locId;
            });
        }

        return matchesFreeText && matchesStatus && matchesLocation;
    });

    const locationFilteredSNs = activeLocations.length > 0
        ? item.serialNumbers.filter(sn => {
            return activeLocations.some(loc => {
                const isWarehouse = loc.startsWith("W-");
                const locId = Number(loc.split('-')[1]);
                return isWarehouse ? sn.warehouse?.id === locId : sn.pop?.id === locId;
            });
        })
        : item.serialNumbers;

    const availableSNCount = locationFilteredSNs.filter(sn => sn.status.name === 'In Stock').length;
    const installedSNCount = locationFilteredSNs.filter(sn => sn.status.name === 'Dipakai').length;
    const damagedSNCount = locationFilteredSNs.filter(sn => sn.status.name === 'Rusak').length;

    const snPag = usePagination(filteredSNs, PP);
    useEffect(() => { snPag.reset(); }, [searchInput, activeFilters]);

    const displayFisik = activeLocations.length > 0
        ? availableSNCount + damagedSNCount
        : item.totalFisik;

    const warehouseNameFilter = activeLocations.length === 1 ? uniqueLocs.find(l => l.id === activeLocations[0])?.name : (activeLocations.length > 1 ? `${activeLocations.length} Lokasi` : null);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Breadcrumb */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                    <ArrowLeft size={16} />
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link href="/master" className="hover:text-white transition-colors">Master Data</Link>
                    <span>/</span>
                    <Link href="/master/items" className="hover:text-white transition-colors">Barang</Link>
                    <span>/</span>
                    <span className="text-white font-medium">{item.code}</span>
                </div>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 border border-[#1E293B] relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] bg-blue-500/10 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />

                <div className="flex gap-5 relative z-10 w-full mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-[#0F172A] border border-[#1E293B] flex items-center justify-center shadow-inner shrink-0">
                        <Package size={32} className="text-slate-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold tracking-tight text-white">{item.name}</h2>
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                                {item.category?.name || "Uncategorized"}
                            </span>
                        </div>
                        <p className="font-mono text-sm text-slate-400 break-all">{item.code}</p>
                    </div>
                </div>

                <div className="flex gap-8 relative z-10 md:min-w-[300px]">
                    <div className="flex flex-col gap-1 w-full">
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Fisik {warehouseNameFilter ? `(${warehouseNameFilter})` : 'Gudang'}</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold font-mono text-green-400 leading-none">{displayFisik.toLocaleString('id-ID')}</span>
                            <span className="text-xs text-slate-500 mb-1">{item.unit}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Serial (SN) {warehouseNameFilter ? 'di Lokasi' : ''}</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold font-mono text-purple-400 leading-none">{locationFilteredSNs.length.toLocaleString('id-ID')}</span>
                            <span className="text-xs text-slate-500 mb-1">Unit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card border border-[#1E293B] p-4 flex items-center gap-4 hover:border-green-500/30 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Building2 size={20} className="text-green-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ready (In Stock)</p>
                        <p className="text-xl font-bold text-white transition-colors group-hover:text-green-400">{availableSNCount} <span className="text-[10px] font-normal text-slate-500">SN</span></p>
                    </div>
                </div>
                <div className="card border border-[#1E293B] p-4 flex items-center gap-4 hover:border-blue-500/30 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Activity size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Deployed (Dipakai)</p>
                        <p className="text-xl font-bold text-white transition-colors group-hover:text-blue-400">{installedSNCount} <span className="text-[10px] font-normal text-slate-500">SN</span></p>
                    </div>
                </div>
                <div className="card border border-[#1E293B] p-4 flex items-center gap-4 hover:border-red-500/30 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Hash size={20} className="text-red-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Maintenance (Rusak)</p>
                        <p className="text-xl font-bold text-white transition-colors group-hover:text-red-400">{damagedSNCount} <span className="text-[10px] font-normal text-slate-500">SN</span></p>
                    </div>
                </div>
            </div>

            {/* SN List Section */}
            <div className="card !p-0 overflow-hidden border border-[#1E293B]">
                {/* Toolbar */}
                <div className="p-4 border-b border-[#1E293B] bg-[#0F172A]/50 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">Daftar Serial Number</h3>
                            <span className="badge badge-blue">{filteredSNs.length}</span>
                        </div>

                        {/* Smart Search Bar */}
                        <div className="relative w-full sm:w-96">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                            <input
                                type="text"
                                placeholder="Ketik untuk filter: lokasi, status, SN..."
                                value={searchInput}
                                onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
                                onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                                className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all font-medium"
                            />

                            {/* Autocomplete Suggestions */}
                            {isSuggestionsOpen && suggestions.length > 0 && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {/* Location suggestions */}
                                            {suggestions.filter(s => s.type === 'lokasi').length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                        <MapPin size={10} /> Lokasi
                                                    </div>
                                                    {suggestions.filter(s => s.type === 'lokasi').map(s => (
                                                        <button key={`loc-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-purple-500/10 transition-colors">
                                                            <MapPin size={12} className="text-amber-400 shrink-0" />
                                                            <span className="text-slate-300 group-hover:text-white transition-colors">{s.label}</span>
                                                            <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded group-hover:opacity-100 opacity-0">+ filter</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {/* Status suggestions */}
                                            {suggestions.filter(s => s.type === 'status').length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                                        <Activity size={10} /> Status
                                                    </div>
                                                    {suggestions.filter(s => s.type === 'status').map(s => (
                                                        <button key={`sts-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-purple-500/10 transition-colors">
                                                            <Activity size={12} className="text-green-400 shrink-0" />
                                                            <span className="text-slate-300 group-hover:text-white transition-colors">{s.label}</span>
                                                            <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded group-hover:opacity-100 opacity-0">+ filter</span>
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
                                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${f.type === 'lokasi' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                    'bg-green-500/10 border-green-500/20 text-green-400'
                                    }`}>
                                    {f.type === 'lokasi' ? <MapPin size={10} /> : <Activity size={10} />}
                                    <span className="text-[11px] font-medium">{f.label}</span>
                                    <button onClick={() => removeFilter(f)} className="ml-0.5 p-0.5 rounded-full transition-colors hover:bg-white/10">
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setActiveFilters([])} className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-2 font-bold ml-1">
                                RESET ALL
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div>
                    {item.serialNumbers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-20 pb-20 gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                                <Hash size={20} className="text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-500">Tidak ada data Serial Number tersimpan.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden sm:block">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="border-b border-[#1E293B] bg-[#020617]/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-slate-500 font-semibold text-center">
                                            <th className="px-4 py-3 text-left">Serial Number</th>
                                            <th className="px-4 py-3 text-left">Status</th>
                                            <th className="px-4 py-3 text-left">Lokasi</th>
                                            <th className="px-4 py-3 text-right">Update</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {snPag.paged.map((sn) => (
                                            <tr key={sn.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => router.push(`/master/sn/${sn.id}`)}>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-bold text-white group-hover:text-purple-400 transition-colors bg-slate-900 border border-slate-700/50 px-2 py-1 rounded">{sn.code}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight ${sn.status.name === 'In Stock' ? 'bg-green-500/10 text-green-400 border-green-500/20' : sn.status.name === 'Dipakai' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : sn.status.name === 'Rusak' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{sn.status.name}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium truncate max-w-[160px]" title={sn.warehouse ? sn.warehouse.name : sn.pop ? sn.pop.name : 'Unknown'}>
                                                        <MapPin size={12} className="text-slate-500 shrink-0" />
                                                        {sn.warehouse ? sn.warehouse.name : sn.pop ? sn.pop.name : 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">
                                                    {new Date(sn.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile cards */}
                            <div className="sm:hidden space-y-2 px-3 pb-3">
                                {snPag.paged.map(sn => (
                                    <div key={sn.id} className="bg-[#020617] border border-[#1E293B] rounded-xl p-3 cursor-pointer hover:border-purple-500/30 transition-colors" onClick={() => router.push(`/master/sn/${sn.id}`)}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-xs font-bold text-white bg-slate-900 border border-slate-700/50 px-2 py-0.5 rounded">{sn.code}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${sn.status.name === 'In Stock' ? 'bg-green-500/10 text-green-400 border-green-500/20' : sn.status.name === 'Dipakai' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{sn.status.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1 truncate"><MapPin size={10} className="shrink-0" /> {sn.warehouse?.name || sn.pop?.name || '—'}</span>
                                            <span className="font-mono shrink-0 ml-2">{new Date(sn.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <PaginationBar page={snPag.page} totalPages={snPag.totalPages} setPage={snPag.setPage} total={snPag.total} perPage={PP} label="SN" />
                        </>
                    )}
                </div>
            </div>

            <p className="text-center text-[11px] text-slate-600 font-medium">
                Menampilkan {filteredSNs.length} Serial Number. Klik pada baris SN untuk melihat riwayat lengkap pergerakan barang.
            </p>
        </div>
    );
}
