"use client";

import {
    Package, ArrowDownLeft, ArrowUpRight, AlertTriangle,
    Building2, Activity, Hash, Boxes, TrendingUp, ArrowRight
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

const statCards = (stats: DashboardStats | null) => [
    {
        title: "Total Jenis Barang",
        value: stats?.totalItems.toLocaleString('id-ID') ?? "—",
        subtitle: "Item Aktif",
        icon: Package,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        accent: "from-blue-500/20",
        border: "hover:border-blue-500/30",
        delay: "delay-1",
        link: "/master/items"
    },
    {
        title: "Total Stok Gudang",
        value: stats?.totalFisik.toLocaleString('id-ID') ?? "—",
        subtitle: "Unit Fisik",
        icon: Boxes,
        iconBg: "bg-green-500/10",
        iconColor: "text-green-400",
        accent: "from-green-500/20",
        border: "hover:border-green-500/30",
        delay: "delay-2",
        link: "/stock"
    },
    {
        title: "Total SN Tersedia",
        value: stats?.totalSN.toLocaleString('id-ID') ?? "—",
        subtitle: "Siap Keluar",
        icon: Hash,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        accent: "from-purple-500/20",
        border: "hover:border-purple-500/30",
        delay: "delay-3",
        link: "/stock"
    },
    {
        title: "Transaksi Hari Ini",
        value: stats?.trxToday.toLocaleString('id-ID') ?? "—",
        subtitle: "In / Out",
        icon: TrendingUp,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-400",
        accent: "from-amber-500/20",
        border: "hover:border-amber-500/30",
        delay: "delay-4",
        link: "/reports"
    },
];

export default function DashboardClient({
    initialStats,
    initialAlerts,
    initialTrx
}: {
    initialStats: DashboardStats | null,
    initialAlerts: LowStockProp[],
    initialTrx: RecentTrx[]
}) {
    const stats = initialStats;
    const lowStocks = initialAlerts || [];
    const recentTrx = initialTrx || [];

    if (!stats) {
        return (
            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 text-red-400 p-5 rounded-xl">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-sm">Gagal memuat data</p>
                    <p className="text-xs mt-1 text-red-400/70">Terjadi kesalahan pada server saat memuat statistik dashboard.</p>
                </div>
            </div>
        );
    }

    const cards = statCards(stats);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Dashboard</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Ringkasan stok dan aktivitas WMS hari ini</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="badge badge-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Sistem Aktif
                    </span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {cards.map((card, i) => (
                    <Link href={card.link} key={i} className={`stat-card group animate-fade-in ${card.delay} ${card.border} cursor-pointer`}>
                        {/* Gradient top glow */}
                        <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${card.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                        <div className="flex items-start justify-between mb-4 relative">
                            <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                                <card.icon size={18} className={card.iconColor} />
                            </div>
                            <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" />
                        </div>

                        <p className="text-xs font-medium text-slate-500 mb-1 relative">{card.title}</p>
                        <p className={`text-2xl font-bold tracking-tight relative ${card.iconColor}`}>{card.value}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 relative">{card.subtitle}</p>
                    </Link>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                {/* Recent Activity — 3 cols */}
                <div className="lg:col-span-3 card animate-fade-in delay-2">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Activity size={15} className="text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-white text-sm">Aktivitas Terbaru</h3>
                        </div>
                        <Link href="/reports" className="text-xs text-slate-500 hover:text-green-400 transition-colors flex items-center gap-1">
                            Lihat semua <ArrowRight size={12} />
                        </Link>
                    </div>

                    <div className="space-y-1">
                        {recentTrx.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                                    <Activity size={20} className="text-slate-600" />
                                </div>
                                <p className="text-sm text-slate-500">Belum ada aktivitas hari ini</p>
                            </div>
                        ) : (
                            recentTrx.map((trx, idx) => (
                                <div
                                    key={trx.id}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04] group"
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${trx.type === 'IN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {trx.type === 'IN'
                                                ? <ArrowDownLeft size={15} />
                                                : <ArrowUpRight size={15} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white leading-none">{trx.itemName}</p>
                                            <p className="text-[11px] text-slate-500 mt-1">{trx.location}</p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
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
                <div className="lg:col-span-2 card animate-fade-in delay-3">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <AlertTriangle size={14} className="text-amber-400" />
                            </div>
                            <h3 className="font-semibold text-white text-sm">Stok Minimum</h3>
                        </div>
                        {lowStocks.length > 0 && (
                            <span className="badge badge-red">{lowStocks.length}</span>
                        )}
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[360px] custom-scrollbar">
                        {lowStocks.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                    <Package size={20} className="text-green-400" />
                                </div>
                                <p className="text-sm text-slate-500 text-center">Semua stok aman</p>
                            </div>
                        ) : (
                            lowStocks.map(alert => {
                                const sum = alert.stockNew + alert.stockDismantle + alert.stockDamaged;
                                const severity = sum === 0 ? 'critical' : 'warning';
                                return (
                                    <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border ${severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <Package size={14} className={severity === 'critical' ? 'text-red-400 mt-0.5 shrink-0' : 'text-amber-400 mt-0.5 shrink-0'} />
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
                </div>
            </div>
        </div>
    );
}
