"use client";

import { Bell, Search, ChevronRight, AlertTriangle, PackageMinus, Cpu, X, ExternalLink } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const pathLabels: Record<string, string> = {
    "/": "Dashboard",
    "/inbound": "Barang Masuk",
    "/outbound": "Barang Keluar",
    "/transfer": "Transfer Stok",
    "/pop": "Data POP",
    "/stock": "Stok Gudang",
    "/reports": "Laporan",
    "/master": "Master Data",
    "/master/items": "Master Data · Barang",
    "/master/categories": "Master Data · Kategori",
    "/master/warehouses": "Master Data · Gudang",
    "/tracking": "Tracking Serial Number",
    "/damaged": "Barang Rusak",
    "/assets": "Asset Management",
    "/assets/maintenance": "Jadwal Maintenance",
};

type Notification = {
    id: string;
    type: 'LOW_STOCK' | 'MAINTENANCE_OVERDUE' | 'NEW_ASSET';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    link: string;
};

const SEVERITY_STYLE = {
    critical: { icon: AlertTriangle, color: 'text-red-400',   bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
    warning:  { icon: PackageMinus, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    info:     { icon: Cpu,          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
};

export default function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [criticalCount, setCriticalCount] = useState(0);
    const bellRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const pageTitle =
        pathLabels[pathname] ||
        pathLabels[Object.keys(pathLabels).find(k => k !== '/' && pathname.startsWith(k)) ?? ''] ||
        "WMS-2026";

    const initials = (session?.user?.name || session?.user?.username || "U")
        .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setCriticalCount(data.critical || 0);
        } catch {}
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const totalCount = notifications.length;

    return (
        <header className="h-14 bg-background/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
            {/* Left: Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 hidden sm:block">WMS-2026</span>
                <ChevronRight size={14} className="text-slate-600 hidden sm:block" />
                <span className="font-semibold text-white">{pageTitle}</span>
            </div>

            {/* Center: Search */}
            <div className="relative w-48 sm:w-64 lg:w-80 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                    type="text"
                    placeholder="Cari SN, Item, atau PO..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery.trim()) {
                            router.push(`/master/items?search=${encodeURIComponent(searchQuery.trim())}`);
                            setSearchQuery("");
                        }
                    }}
                    className="w-full !bg-surface !border-surface-2 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-slate-600 focus:!border-primary focus:!ring-1 focus:!ring-primary/25"
                    style={{ fontSize: '14px' }}
                />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <div ref={bellRef} className="relative">
                    <button
                        onClick={() => setShowNotifications(prev => !prev)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-surface transition-all relative"
                    >
                        <Bell size={17} />
                        {totalCount > 0 && (
                            <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${criticalCount > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                                {totalCount > 9 ? '9+' : totalCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                            <div className="absolute right-0 mt-2 w-80 glass-card border border-border z-50 shadow-2xl rounded-xl overflow-hidden">
                                {/* Panel Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/50">
                                    <div className="flex items-center gap-2">
                                        <Bell size={14} className="text-slate-400" />
                                        <p className="text-sm font-semibold text-white">Notifikasi</p>
                                        {totalCount > 0 && (
                                            <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">{totalCount}</span>
                                        )}
                                    </div>
                                    <button onClick={() => setShowNotifications(false)}>
                                        <X size={14} className="text-slate-500 hover:text-white" />
                                    </button>
                                </div>

                                {/* Panel Content */}
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center py-10 gap-2">
                                            <Bell size={20} className="text-green-400" />
                                            <p className="text-sm text-slate-500">Semua normal, tidak ada alert</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {notifications.map(n => {
                                                const sc = SEVERITY_STYLE[n.severity];
                                                const Icon = sc.icon;
                                                return (
                                                    <Link
                                                        key={n.id}
                                                        href={n.link}
                                                        onClick={() => setShowNotifications(false)}
                                                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                                                    >
                                                        <div className={`w-7 h-7 rounded-lg ${sc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                                            <Icon size={13} className={sc.color} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-white leading-tight">{n.title}</p>
                                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                                                        </div>
                                                        <ExternalLink size={11} className="text-slate-700 group-hover:text-slate-400 shrink-0 mt-1" />
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Panel Footer */}
                                {totalCount > 0 && (
                                    <div className="px-4 py-2.5 border-t border-border bg-surface/30">
                                        <p className="text-[10px] text-slate-600 text-center">Diperbarui otomatis setiap 30 detik</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* User Avatar + Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(prev => !prev)}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-surface transition-all cursor-pointer"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                            {initials}
                        </div>
                        <span className="text-sm font-medium text-slate-300 hidden md:block">
                            {session?.user?.name || session?.user?.username || "Admin"}
                        </span>
                    </button>

                    {showDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                            <div className="absolute right-0 mt-1 w-44 glass-card border border-border py-1 z-50 shadow-xl">
                                <div className="px-3 py-2 border-b border-border">
                                    <p className="text-xs font-semibold text-white">{session?.user?.name || "Admin"}</p>
                                    <p className="text-[10px] text-slate-500">{(session?.user as any)?.level || "MASTER"}</p>
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    Keluar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
