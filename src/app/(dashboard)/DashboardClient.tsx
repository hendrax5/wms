"use client";

import {
    Package, ArrowDownLeft, ArrowUpRight, AlertTriangle,
    Building2, Activity, Hash, Boxes, TrendingUp, TrendingDown,
    ArrowRight, Cpu, Wrench, ChevronRight, Minus,
    Zap, BarChart3, Plus
} from "lucide-react";
import Link from "next/link";

type DashboardStats = {
    totalItems: number;
    totalFisik: number;
    totalSN: number;
    trxToday: number;
    trxIn: number;
    trxOut: number;
    trxYesterday: number;
};

type LowStockProp = {
    id: number;
    itemId: number;
    warehouseId: number;
    stockNew: number;
    stockDismantle: number;
    stockDamaged: number;
    minStock: number;
    item: { id: number; name: string; code: string | null };
    warehouse: { id: number; name: string };
};

type TrxItem = { itemName: string; qty: number };
type TransactionGroup = {
    groupId: string;
    type: 'IN' | 'OUT';
    date: Date;
    location: string;
    items: TrxItem[];
    totalQty: number;
};

/* ── Trend badge ── */
function TrendBadge({ current, previous }: { current: number; previous: number }) {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) {
        return (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-400">
                <TrendingUp size={10} /> Baru
            </span>
        );
    }
    const diff = current - previous;
    const pct = Math.round(Math.abs(diff / previous) * 100);
    if (diff === 0) return (
        <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
            <Minus size={9} /> sama
        </span>
    );
    return diff > 0
        ? <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-400"><TrendingUp size={10} />+{pct}%</span>
        : <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400"><TrendingDown size={10} />-{pct}%</span>;
}

/* ── Relative time helper ── */
function relativeTime(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "baru saja";
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24) return `${diffH}j lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function DashboardClient({
    initialStats,
    initialAlerts,
    initialTrx,
    assetStats
}: {
    initialStats: DashboardStats | null,
    initialAlerts: LowStockProp[],
    initialTrx: TransactionGroup[],
    assetStats?: { active: number; maintenance: number; damaged: number; total: number }
}) {
    const stats = initialStats;
    const lowStocks = initialAlerts || [];
    const recentTrx = initialTrx || [];

    if (!stats) {
        return (
            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 text-red-400 p-5 rounded-2xl">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-sm">Gagal memuat data</p>
                    <p className="text-xs mt-1 text-red-400/70">Terjadi kesalahan pada server.</p>
                </div>
            </div>
        );
    }

    const criticalCount = lowStocks.filter(s => (s.stockNew + s.stockDismantle + s.stockDamaged) === 0).length;

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">

            {/* ══ HEADER ══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Dashboard</h2>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                    <Link href="/operasi?tab=in"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors">
                        <Plus size={13} /> Stok In
                    </Link>
                    <Link href="/operasi?tab=out"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors">
                        <Minus size={13} /> Stok Out
                    </Link>
                    <Link href="/reports"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 transition-colors">
                        <BarChart3 size={13} /> Laporan
                    </Link>
                </div>
            </div>

            {/* ══ KPI GRID — row 1 ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Big hero card — Total Stok Fisik */}
                <Link href="/stock"
                    className="lg:col-span-2 bg-gradient-to-br from-[#0d1f12] to-[#020617] border border-green-500/15 rounded-2xl p-5 sm:p-6 hover:border-green-500/40 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
                    <div className="flex items-start justify-between mb-5 relative">
                        <div className="w-11 h-11 rounded-2xl bg-green-500/15 flex items-center justify-center border border-green-500/25">
                            <Boxes size={22} className="text-green-400" />
                        </div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 relative">Total Stok Gudang</p>
                    <p className="text-3xl sm:text-4xl font-bold text-green-400 font-mono relative tracking-tight">
                        {stats.totalFisik.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 relative">Unit fisik di seluruh gudang</p>
                </Link>

                {/* SN Tersedia */}
                <Link href="/stock"
                    className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-purple-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 relative border border-purple-500/15">
                        <Hash size={17} className="text-purple-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">SN Tersedia</p>
                    <p className="text-2xl font-bold text-purple-400 font-mono relative">{stats.totalSN.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 relative">Unit siap keluar</p>
                </Link>

                {/* Jenis Barang */}
                <Link href="/master"
                    className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 relative border border-blue-500/15">
                        <Package size={17} className="text-blue-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Jenis Barang</p>
                    <p className="text-2xl font-bold text-blue-400 font-mono relative">{stats.totalItems.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 relative">Item aktif</p>
                </Link>
            </div>

            {/* ══ KPI GRID — row 2 ══ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {/* Transaksi Hari Ini */}
                <Link href="/reports"
                    className="sm:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-amber-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between relative mb-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
                            <TrendingUp size={17} className="text-amber-400" />
                        </div>
                        <TrendBadge current={stats.trxToday} previous={stats.trxYesterday} />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Transaksi Hari Ini</p>
                    <p className="text-2xl font-bold text-amber-400 font-mono relative">{stats.trxToday.toLocaleString("id-ID")}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                            <ArrowDownLeft size={10} />{stats.trxIn} masuk
                        </span>
                        <span className="text-slate-700">·</span>
                        <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
                            <ArrowUpRight size={10} />{stats.trxOut} keluar
                        </span>
                    </div>
                </Link>

                {/* Aset Aktif */}
                {assetStats !== undefined && (
                    <>
                        <Link href="/assets"
                            className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-cyan-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3 relative border border-cyan-500/15">
                                <Cpu size={17} className="text-cyan-400" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Aset Aktif</p>
                            <p className="text-2xl font-bold text-cyan-400 font-mono relative">{assetStats.active.toLocaleString("id-ID")}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 relative">Ter-deploy</p>
                        </Link>
                        <Link href="/assets/maintenance"
                            className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-yellow-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-3 relative border border-yellow-500/15">
                                <Wrench size={17} className="text-yellow-400" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Maintenance</p>
                            <p className="text-2xl font-bold text-yellow-400 font-mono relative">{assetStats.maintenance.toLocaleString("id-ID")}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 relative">Perlu perhatian</p>
                        </Link>
                    </>
                )}
            </div>

            {/* ══ ACTIVITY + LOW STOCK ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Recent Activity — 3 cols */}
                <div className="lg:col-span-3 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Activity size={15} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm leading-none">Aktivitas Terbaru</h3>
                                <p className="text-[10px] text-slate-600 mt-0.5">Stok masuk & keluar</p>
                            </div>
                        </div>
                        <Link href="/reports" className="text-[11px] text-slate-500 hover:text-green-400 transition-colors flex items-center gap-1">
                            Semua <ChevronRight size={11} />
                        </Link>
                    </div>

                    <div className="space-y-0.5 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {recentTrx.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                                    <Zap size={22} className="text-slate-600" />
                                </div>
                                <p className="text-sm text-slate-500">Belum ada aktivitas hari ini</p>
                            </div>
                        ) : (
                            recentTrx.map((grp) => {
                                const isMulti = grp.items.length > 1;
                                const colorIn  = 'bg-green-500/10 text-green-400 border-green-500/15';
                                const colorOut = 'bg-red-500/10 text-red-400 border-red-500/15';
                                const color    = grp.type === 'IN' ? colorIn : colorOut;
                                const textColor = grp.type === 'IN' ? 'text-green-400' : 'text-red-400';
                                return (
                                    <div
                                        key={grp.groupId}
                                        className="px-3 py-2.5 rounded-xl hover:bg-white/[0.025] transition-colors"
                                    >
                                        {/* Header row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${color}`}>
                                                    {grp.type === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                </div>
                                                <div className="min-w-0">
                                                    {isMulti ? (
                                                        <p className="text-sm font-medium text-white leading-none">
                                                            {grp.items.length} item
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm font-medium text-white leading-none truncate">{grp.items[0].itemName}</p>
                                                    )}
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Building2 size={9} className="text-slate-600 shrink-0" />
                                                        <p className="text-[10px] text-slate-500 truncate">{grp.location}</p>
                                                        <span className="text-slate-700">·</span>
                                                        <p className="text-[10px] text-slate-600">{relativeTime(grp.date)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right ml-3 shrink-0">
                                                <p className={`text-sm font-bold font-mono ${textColor}`}>
                                                    {grp.type === 'IN' ? '+' : '-'}{grp.totalQty}
                                                </p>
                                                {isMulti && (
                                                    <p className="text-[10px] text-slate-600 mt-0.5">{grp.items.length} item</p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Item list for multi-item groups */}
                                        {isMulti && (
                                            <div className="ml-11 mt-1.5 space-y-0.5">
                                                {grp.items.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <p className="text-[11px] text-slate-500 truncate">• {item.itemName}</p>
                                                        <p className={`text-[11px] font-mono ml-2 shrink-0 ${textColor} opacity-70`}>×{item.qty}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts — 2 cols */}
                <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${criticalCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                <AlertTriangle size={15} className={criticalCount > 0 ? 'text-red-400' : 'text-amber-400'} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm leading-none">Stok Minimum</h3>
                                <p className="text-[10px] text-slate-600 mt-0.5">Perlu restock segera</p>
                            </div>
                        </div>
                        {lowStocks.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                {criticalCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">{criticalCount} kritis</span>
                                )}
                                {lowStocks.length - criticalCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">{lowStocks.length - criticalCount} rendah</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5 overflow-y-auto max-h-[360px] custom-scrollbar">
                        {lowStocks.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <Package size={22} className="text-green-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-slate-400 font-medium">Semua stok aman</p>
                                    <p className="text-xs text-slate-600 mt-0.5">Tidak ada yang di bawah minimum</p>
                                </div>
                            </div>
                        ) : (
                            lowStocks.map(alert => {
                                const sum = alert.stockNew + alert.stockDismantle + alert.stockDamaged;
                                const isCritical = sum === 0;
                                return (
                                    <div key={alert.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isCritical
                                            ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                            : 'bg-amber-500/5 border-amber-500/15 hover:border-amber-500/30'}`}>
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${isCritical ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                                                <Package size={12} className={isCritical ? 'text-red-400' : 'text-amber-400'} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-white truncate">{alert.item.name}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Building2 size={9} className="text-slate-600" />
                                                    <span className="text-[10px] text-slate-500 truncate">{alert.warehouse.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-2 shrink-0">
                                            <p className={`text-sm font-bold font-mono ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>{sum}</p>
                                            <p className="text-[10px] text-slate-600">min: {alert.minStock}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {lowStocks.length > 0 && (
                        <Link href="/stock"
                            className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-colors">
                            Lihat Direktori Stok <ChevronRight size={12} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
