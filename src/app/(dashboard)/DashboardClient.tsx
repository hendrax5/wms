"use client";

import {
    Package, ArrowDownLeft, ArrowUpRight, AlertTriangle,
    Building2, Activity, Hash, Boxes, TrendingUp, ArrowRight,
    Cpu, Wrench, ChevronRight
} from "lucide-react";
import { Prisma } from "@prisma/client";
import Link from "next/link";

type DashboardStats = {
    totalItems: number;
    totalFisik: number;
    totalSN: number;
    trxToday: number;
};

type LowStockProp = Prisma.WarehouseStockGetPayload<{
    include: { item: true; warehouse: true };
}>;

type RecentTrx = {
    id: string;
    type: 'IN' | 'OUT';
    date: Date;
    itemName: string;
    qty: number;
    location: string;
};

export default function DashboardClient({
    initialStats,
    initialAlerts,
    initialTrx,
    assetStats
}: {
    initialStats: DashboardStats | null,
    initialAlerts: LowStockProp[],
    initialTrx: RecentTrx[],
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

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Dashboard</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Ringkasan stok dan aktivitas WMS hari ini</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Sistem Aktif
                    </span>
                </div>
            </div>

            {/* ═══ ASYMMETRIC KPI GRID ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {/* Big card — Total Stok */}
                <Link href="/stock" className="lg:col-span-2 bg-gradient-to-br from-[#0F172A] to-[#020617] border border-[#1E293B] rounded-2xl p-5 sm:p-6 hover:border-green-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between mb-4 relative">
                        <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <Boxes size={22} className="text-green-400" />
                        </div>
                        <ArrowRight size={14} className="text-slate-600 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 relative">Total Stok Gudang</p>
                    <p className="text-3xl sm:text-4xl font-bold text-green-400 font-mono relative tracking-tight">{stats.totalFisik.toLocaleString("id-ID")}</p>
                    <p className="text-[11px] text-slate-600 mt-1 relative">Unit fisik di seluruh gudang</p>
                </Link>

                {/* SN Tersedia */}
                <Link href="/stock" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-purple-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 relative">
                        <Hash size={18} className="text-purple-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">SN Tersedia</p>
                    <p className="text-2xl font-bold text-purple-400 font-mono relative">{stats.totalSN.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 relative">Siap keluar</p>
                </Link>

                {/* Jenis Barang */}
                <Link href="/master/items" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 relative">
                        <Package size={18} className="text-blue-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Jenis Barang</p>
                    <p className="text-2xl font-bold text-blue-400 font-mono relative">{stats.totalItems.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 relative">Item aktif</p>
                </Link>
            </div>

            {/* ═══ TRANSAKSI + ASSET ROW ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <Link href="/reports" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-amber-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 relative">
                        <TrendingUp size={18} className="text-amber-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Transaksi Hari Ini</p>
                    <p className="text-2xl font-bold text-amber-400 font-mono relative">{stats.trxToday.toLocaleString("id-ID")}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 relative">In / Out</p>
                </Link>

                {assetStats !== undefined && (
                    <>
                        <Link href="/assets" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-cyan-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3 relative">
                                <Cpu size={18} className="text-cyan-400" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Aset Aktif</p>
                            <p className="text-2xl font-bold text-cyan-400 font-mono relative">{assetStats.active.toLocaleString("id-ID")}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 relative">Ter-deploy</p>
                        </Link>
                        <Link href="/assets/maintenance" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 hover:border-yellow-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-3 relative">
                                <Wrench size={18} className="text-yellow-400" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 relative">Maintenance</p>
                            <p className="text-2xl font-bold text-yellow-400 font-mono relative">{assetStats.maintenance.toLocaleString("id-ID")}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 relative">Perlu perhatian</p>
                        </Link>
                    </>
                )}
            </div>

            {/* ═══ ACTIVITY + LOW STOCK ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
                {/* Recent Activity — 3 cols wide */}
                <div className="lg:col-span-3 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Activity size={16} className="text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-white text-sm">Aktivitas Terbaru</h3>
                        </div>
                        <Link href="/reports" className="text-xs text-slate-500 hover:text-green-400 transition-colors flex items-center gap-1">
                            Semua <ChevronRight size={12} />
                        </Link>
                    </div>

                    <div className="space-y-1 max-h-[340px] overflow-y-auto custom-scrollbar">
                        {recentTrx.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                                    <Activity size={22} className="text-slate-600" />
                                </div>
                                <p className="text-sm text-slate-500">Belum ada aktivitas hari ini</p>
                            </div>
                        ) : (
                            recentTrx.slice(0, 7).map((trx, idx) => (
                                <div
                                    key={trx.id}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group"
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${trx.type === 'IN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {trx.type === 'IN' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white leading-none truncate">{trx.itemName}</p>
                                            <p className="text-[11px] text-slate-500 mt-1 truncate">{trx.location}</p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-3 shrink-0">
                                        <p className={`text-sm font-bold font-mono ${trx.type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                                            {trx.type === 'IN' ? '+' : '-'}{trx.qty}
                                        </p>
                                        <p className="text-[10px] text-slate-600 mt-0.5">
                                            {new Date(trx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts — 2 cols */}
                <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <AlertTriangle size={15} className="text-amber-400" />
                            </div>
                            <h3 className="font-semibold text-white text-sm">Stok Minimum</h3>
                        </div>
                        {lowStocks.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">{lowStocks.length}</span>
                        )}
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[340px] custom-scrollbar">
                        {lowStocks.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                    <Package size={22} className="text-green-400" />
                                </div>
                                <p className="text-sm text-slate-500 text-center">Semua stok aman 👍</p>
                            </div>
                        ) : (
                            lowStocks.map(alert => {
                                const sum = alert.stockNew + alert.stockDismantle + alert.stockDamaged;
                                const severity = sum === 0 ? 'critical' : 'warning';
                                return (
                                    <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${severity === 'critical' ? 'bg-red-500/5 border-red-500/15 hover:border-red-500/30' : 'bg-amber-500/5 border-amber-500/15 hover:border-amber-500/30'}`}>
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <Package size={14} className={`mt-0.5 shrink-0 ${severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-white truncate">{alert.item.name}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Building2 size={9} className="text-slate-500" />
                                                    <span className="text-[10px] text-slate-500 truncate">{alert.warehouse.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-3 shrink-0">
                                            <p className={`text-sm font-bold font-mono ${severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>{sum}</p>
                                            <p className="text-[10px] text-slate-600">min: {alert.minStock}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {lowStocks.length > 0 && (
                        <Link href="/reports" className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-colors">
                            Lihat Detail <ChevronRight size={13} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
