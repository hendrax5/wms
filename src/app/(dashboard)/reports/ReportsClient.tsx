"use client";

import { useState, useEffect } from "react";
import { BarChart3, History, ShieldAlert, Loader2, Download, Package, Search, X, Tags, Building2, Activity, Cpu, ChevronDown, ChevronRight, Eye, ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getStockSummaryReport, getTransactionHistoryReport, getDamagedItemsReport, getAssetMutationReport } from "@/app/actions/reports";

type TabType = "STOCK" | "HISTORY" | "DAMAGED" | "ASSET";

/* ── Pagination ── */
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
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1">
            <span className="text-[11px] text-slate-500">Menampilkan <span className="text-white font-medium">{start}–{end}</span> dari <span className="text-white font-medium">{total}</span> {label || "data"}</span>
            <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14} /></button>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                {pages.map((p, i) => p === "..." ? (<span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>) : (
                    <button key={p} type="button" onClick={() => setPage(p as number)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${page === p ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:text-white hover:bg-white/5"}`}>{p}</button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14} /></button>
            </div>
        </div>
    );
}

export default function ReportsClient() {
    const [activeTab, setActiveTab] = useState<TabType>("STOCK");

    // Data states
    const [stockData, setStockData] = useState<any[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [damagedData, setDamagedData] = useState<any[]>([]);
    const [assetData, setAssetData] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    // Search & Filter State
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<{ type: string; value: string; label: string }[]>([]);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
        const [stockRes, histRes, dmgRes, assetRes] = await Promise.all([
            getStockSummaryReport(),
            getTransactionHistoryReport(100),
            getDamagedItemsReport(),
            getAssetMutationReport(),
        ]);

        if (stockRes.success) setStockData(stockRes.data || []);
        if (histRes.success) setHistoryData(histRes.data || []);
        if (dmgRes.success) setDamagedData(dmgRes.data || []);
        if (assetRes.success) setAssetData(assetRes.data || []);

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Pagination
    const PP = 10;

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

    // Pagination instances
    const stockPag = usePagination(filteredStock, PP);
    const histPag = usePagination(filteredHistory, PP);
    const dmgPag = usePagination(filteredDamaged, PP);
    // assetPag is defined after filteredAssets below

    // Helper functions for tables
    const renderStockTab = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="glass p-4 rounded-xl border border-[#334155]">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Total Gudang</p>
                    <p className="text-2xl font-bold text-white font-mono">{filteredStock.length}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-1">Stock Aktif</p>
                    <p className="text-2xl font-bold text-blue-50 font-mono">{filteredStock.reduce((a, c) => a + c.totalActive, 0)}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                    <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-1">Stock Rusak</p>
                    <p className="text-2xl font-bold text-red-50 font-mono">{filteredStock.reduce((a, c) => a + c.totalDamaged, 0)}</p>
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block glass rounded-xl border border-[#334155] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#020617] text-slate-300 border-b border-[#334155]">
                        <tr>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Gudang</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-center w-20">Tipe</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right text-blue-400 w-24">Aktif</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right text-red-400 w-24">Rusak</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155] text-slate-200">
                        {stockPag.paged.map((w: any, idx: number) => (
                            <tr key={idx} className="hover:bg-blue-500/[0.03] transition-colors">
                                <td className="px-4 py-3"><span className="font-medium truncate block max-w-[200px]" title={w.warehouseName}>{w.warehouseName}</span></td>
                                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 text-[9px] rounded font-bold border uppercase ${w.type === 'PUSAT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{w.type}</span></td>
                                <td className="px-4 py-3 text-right text-blue-400 font-mono font-bold">{w.totalActive}</td>
                                <td className="px-4 py-3 text-right text-red-400 font-mono font-bold">{w.totalDamaged}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {stockPag.paged.map((w: any, idx: number) => (
                    <div key={idx} className="glass rounded-xl p-3 border border-[#334155]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white text-sm truncate flex-1" title={w.warehouseName}>{w.warehouseName}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ml-2 ${w.type === 'PUSAT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{w.type}</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <span className="text-slate-500">Aktif: <span className="text-blue-400 font-mono font-bold">{w.totalActive}</span></span>
                            <span className="text-slate-500">Rusak: <span className="text-red-400 font-mono font-bold">{w.totalDamaged}</span></span>
                        </div>
                    </div>
                ))}
            </div>
            <PaginationBar page={stockPag.page} totalPages={stockPag.totalPages} setPage={stockPag.setPage} total={stockPag.total} perPage={PP} label="gudang" />
        </div>
    );

    const renderHistoryTab = () => (
        <div className="space-y-4">
            {/* Desktop */}
            <div className="hidden sm:block glass rounded-xl border border-[#334155] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#020617] text-slate-300 border-b border-[#334155]">
                        <tr>
                            <th className="px-3 py-3 w-8"></th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Waktu</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Tipe</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Barang</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155] text-slate-200">
                        {histPag.paged.map((h: any) => {
                            const isExpanded = expandedRowId === h.id;
                            return (
                                <>
                                    <tr key={h.id} onClick={() => setExpandedRowId(isExpanded ? null : h.id)}
                                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-500/[0.05]' : 'hover:bg-blue-500/[0.02]'}`}>
                                        <td className="px-3 py-3 text-slate-500">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(h.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-[9px] rounded font-bold border uppercase ${h.type === 'INBOUND' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : h.type === 'TRANSFER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{h.type}</span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-sm truncate max-w-[180px]" title={h.item}>{h.item}</td>
                                        <td className={`px-4 py-3 text-right font-mono font-bold ${h.type === 'INBOUND' ? 'text-emerald-400' : 'text-rose-400'}`}>{h.type === 'INBOUND' ? '+' : '-'}{h.qty}</td>
                                    </tr>
                                    {isExpanded && (
                                        <tr key={`${h.id}-detail`} className="bg-[#020617]/60">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                                    <div><p className="text-slate-500 text-[10px] uppercase font-semibold">Gudang Asal</p><p className="text-slate-300 mt-0.5">{h.location}</p></div>
                                                    {h.target && <div><p className="text-slate-500 text-[10px] uppercase font-semibold">Tujuan</p><p className="text-slate-300 mt-0.5">{h.target}</p></div>}
                                                    <div><p className="text-slate-500 text-[10px] uppercase font-semibold">Keterangan</p><p className="text-slate-300 mt-0.5">{h.description || '-'}</p></div>
                                                    {(h.techName1 || h.techName2) && <div><p className="text-slate-500 text-[10px] uppercase font-semibold">Teknisi</p><p className="text-slate-300 mt-0.5">{[h.techName1, h.techName2].filter(Boolean).join(' & ')}</p></div>}
                                                </div>
                                                {h.serialNumbers?.length > 0 && (
                                                    <div className="mt-3"><p className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Serial Numbers ({h.serialNumbers.length})</p><div className="flex flex-wrap gap-1">{h.serialNumbers.map((sn: string, i: number) => (<span key={i} className="font-mono text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">{sn}</span>))}</div></div>
                                                )}
                                                <div className="pt-2 mt-2 border-t border-[#334155]/50">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); const typeLabel = h.type === 'INBOUND' ? 'Barang Masuk' : h.type === 'TRANSFER' ? 'Transfer Stok' : 'Keluar'; const pw = window.open('', '_blank', 'width=800,height=600'); if (pw) { const snRows = (h.serialNumbers || []).map((sn: string, i: number) => `<tr><td style="border:1px solid #ddd;padding:6px;text-align:center">${i+1}</td><td style="border:1px solid #ddd;padding:6px;font-family:monospace">${sn}</td></tr>`).join(''); pw.document.write(`<html><head><title>Laporan - ${h.id}</title><style>body{font-family:Arial;padding:30px;color:#333}h1{font-size:18px}h2{font-size:14px;color:#666}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}.i{padding:8px;background:#f8f9fa;border-radius:4px}.l{font-size:10px;color:#999;text-transform:uppercase;font-weight:700}.v{font-size:13px;margin-top:2px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;border:1px solid #ddd;padding:6px;font-size:11px;text-align:left}td{font-size:12px}.f{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;font-size:12px}.f div{padding-top:60px;border-top:1px solid #ccc;margin-top:10px}@media print{body{padding:20px}}</style></head><body><div style="text-align:center;border-bottom:2px solid #333;padding-bottom:10px"><h1>WMS — ${typeLabel}</h1><h2>${h.id.toUpperCase()} | ${new Date(h.date).toLocaleString('id-ID')}</h2></div><div class="g"><div class="i"><div class="l">Barang</div><div class="v">${h.item}</div></div><div class="i"><div class="l">Jumlah</div><div class="v">${h.qty}</div></div><div class="i"><div class="l">Asal</div><div class="v">${h.location}</div></div><div class="i"><div class="l">Tujuan</div><div class="v">${h.target||'-'}</div></div></div>${snRows.length>0?`<h3 style="font-size:13px">SN (${h.serialNumbers.length})</h3><table><thead><tr><th style="width:40px">No</th><th>Serial Number</th></tr></thead><tbody>${snRows}</tbody></table>`:''}<div class="f"><div>Pengirim</div><div>Penerima</div><div>Mengetahui</div></div><script>setTimeout(()=>window.print(),300)</script></body></html>`); pw.document.close(); } }} className="flex items-center gap-2 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"><Download size={12} /> Cetak</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {histPag.paged.map((h: any) => (
                    <div key={h.id} className="glass rounded-xl p-3 border border-[#334155]">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-0.5 text-[9px] rounded font-bold border uppercase ${h.type === 'INBOUND' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : h.type === 'TRANSFER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{h.type}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{new Date(h.date).toLocaleDateString('id-ID', { dateStyle: 'short' })}</span>
                        </div>
                        <p className="font-medium text-white text-sm truncate" title={h.item}>{h.item}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>Qty: <span className={`font-mono font-bold ${h.type === 'INBOUND' ? 'text-emerald-400' : 'text-rose-400'}`}>{h.type === 'INBOUND' ? '+' : '-'}{h.qty}</span></span>
                            <span className="truncate">{h.location}</span>
                        </div>
                    </div>
                ))}
            </div>
            <PaginationBar page={histPag.page} totalPages={histPag.totalPages} setPage={histPag.setPage} total={histPag.total} perPage={PP} label="transaksi" />
        </div>
    );

    const renderDamagedTab = () => (
        <div className="space-y-4">
            {/* Desktop */}
            <div className="hidden sm:block glass rounded-xl border border-red-900/50 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#180808] text-red-200 border-b border-red-900/50">
                        <tr>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Tanggal</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Barang</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Qty</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Gudang</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/20 text-slate-200">
                        {dmgPag.paged.map((d: any) => (
                            <tr key={d.id} className="hover:bg-red-500/[0.03] transition-colors">
                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(d.date).toLocaleDateString('id-ID', { dateStyle: 'short' })}</td>
                                <td className="px-4 py-3"><span className="font-medium truncate block max-w-[180px]" title={d.itemName}>{d.itemName}</span><span className="text-[10px] text-slate-500 font-mono">{d.category}</span></td>
                                <td className="px-4 py-3 text-right text-red-400 font-mono font-bold">{d.qty}</td>
                                <td className="px-4 py-3 text-red-200/80 truncate max-w-[150px]" title={d.warehouseName}>{d.warehouseName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {dmgPag.paged.map((d: any) => (
                    <div key={d.id} className="glass rounded-xl p-3 border border-red-900/50">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white text-sm truncate flex-1" title={d.itemName}>{d.itemName}</span>
                            <span className="text-red-400 font-mono font-bold text-sm ml-2">{d.qty}</span>
                        </div>
                        <div className="text-xs text-slate-500">{d.warehouseName} · {new Date(d.date).toLocaleDateString('id-ID', { dateStyle: 'short' })}</div>
                    </div>
                ))}
            </div>
            <PaginationBar page={dmgPag.page} totalPages={dmgPag.totalPages} setPage={dmgPag.setPage} total={dmgPag.total} perPage={PP} label="laporan" />
        </div>
    );

    const STATUS_BADGE: Record<string, string> = {
        ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
        MAINTENANCE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        DAMAGED: 'bg-red-500/10 text-red-400 border-red-500/20',
        DECOMMISSIONED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    const STATUS_LABEL: Record<string, string> = {
        ACTIVE: 'Aktif', MAINTENANCE: 'Maintenance', DAMAGED: 'Rusak', DECOMMISSIONED: 'Non-Aktif'
    };
    const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const filteredAssets = assetData.filter(a => {
        return searchInput === '' ||
            a.itemName.toLowerCase().includes(searchInput.toLowerCase()) ||
            a.serialCode.toLowerCase().includes(searchInput.toLowerCase()) ||
            a.technicianName.toLowerCase().includes(searchInput.toLowerCase());
    });

    const assetPag = usePagination(filteredAssets, PP);

    // Reset on tab/filter change
    useEffect(() => { stockPag.reset(); histPag.reset(); dmgPag.reset(); assetPag.reset(); }, [activeTab, searchInput, activeFilters]);

    const renderAssetTab = () => (
        <div className="space-y-4">
            {/* Desktop */}
            <div className="hidden sm:block glass rounded-xl border border-[#334155] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#020617] text-slate-300 border-b border-[#334155]">
                        <tr>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Barang</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">SN</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-center">Status</th>
                            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-right text-blue-400">Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155] text-slate-200">
                        {assetPag.paged.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500">Belum ada aset ter-deploy</td></tr>
                        ) : assetPag.paged.map((a: any) => (
                            <tr key={a.id} className="hover:bg-blue-500/[0.02] transition-colors">
                                <td className="px-4 py-3"><p className="font-medium truncate max-w-[180px]" title={a.itemName}>{a.itemName}</p><p className="text-[10px] text-slate-500 font-mono">{a.category} · {new Date(a.installedAt).toLocaleDateString('id-ID', { dateStyle: 'short' })}</p></td>
                                <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded truncate block max-w-[120px]" title={a.serialCode}>{a.serialCode}</span></td>
                                <td className="px-4 py-3 text-center"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[a.status] ?? STATUS_BADGE.DECOMMISSIONED}`}>{STATUS_LABEL[a.status] ?? a.status}</span></td>
                                <td className="px-4 py-3 text-right text-blue-400 font-mono font-bold text-xs">{fmtIDR(a.bookValue)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {assetPag.paged.map((a: any) => (
                    <div key={a.id} className="glass rounded-xl p-3 border border-[#334155]">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white text-sm truncate flex-1" title={a.itemName}>{a.itemName}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ml-2 ${STATUS_BADGE[a.status] ?? STATUS_BADGE.DECOMMISSIONED}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-mono truncate">{a.serialCode}</span>
                            <span className="text-blue-400 font-mono font-bold ml-auto">{fmtIDR(a.bookValue)}</span>
                        </div>
                    </div>
                ))}
            </div>
            <PaginationBar page={assetPag.page} totalPages={assetPag.totalPages} setPage={assetPag.setPage} total={assetPag.total} perPage={PP} label="aset" />
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
                <button
                    onClick={() => setActiveTab("ASSET")}
                    className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === "ASSET" ? "text-blue-400 border-blue-400" : "text-slate-400 border-transparent hover:text-slate-200"}`}
                >
                    <Cpu size={18} /> Mutasi Aset
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
                        {activeTab === "ASSET" && renderAssetTab()}

                        {/* EMPTY STATE FOR FILTER */}
                        {((activeTab === "STOCK" && filteredStock.length === 0) ||
                            (activeTab === "HISTORY" && filteredHistory.length === 0) ||
                            (activeTab === "DAMAGED" && filteredDamaged.length === 0) ||
                            (activeTab === "ASSET" && filteredAssets.length === 0)) && (
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
