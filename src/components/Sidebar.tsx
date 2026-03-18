"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Download,
    Upload,
    ArrowRightLeft,
    Server,
    Package,
    FileBarChart,
    Database,
    BoxIcon,
    Cpu,
    Wrench,
    ScanLine,
    RotateCcw
} from "lucide-react";

const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbound", label: "Barang Masuk", icon: Download },
    { href: "/outbound", label: "Barang Keluar", icon: Upload },
    { href: "/transfer", label: "Transfer Stok", icon: ArrowRightLeft },
    { href: "/pop", label: "Data POP", icon: Server },
    { href: "/stock", label: "Stok Gudang", icon: Package },
    { href: "/reports", label: "Laporan", icon: FileBarChart },
    { href: "/master", label: "Inventory Master", icon: Package },
];

const assetLinks = [
    { href: "/assets", label: "Daftar Aset", icon: Cpu },
    { href: "/assets/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/dashboard/technician/deploy", label: "Scan & Deploy", icon: ScanLine },
    { href: "/dashboard/technician/return", label: "Return Aset", icon: RotateCcw },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-60 bg-background border-r border-border hidden md:flex flex-col h-full shrink-0">
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                        <BoxIcon size={16} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight leading-none">WMS-2026</h1>
                        <p className="text-[10px] text-slate-500 mt-0.5">ServiceX / HSP</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Menu</p>
                {links.map((link) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link ${isActive ? "active" : ""}`}
                        >
                            <link.icon size={17} className="shrink-0" />
                            <span>{link.label}</span>
                            {isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-glow" />
                            )}
                        </Link>
                    );
                })}

                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-4">Asset Management</p>
                {assetLinks.map((link) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link ${isActive ? "active" : ""}`}
                        >
                            <link.icon size={17} className="shrink-0" />
                            <span>{link.label}</span>
                            {isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-glow" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-surface">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        H
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">Hendra</p>
                        <p className="text-[10px] text-slate-500 truncate">Master Admin</p>
                    </div>
                </div>
                <p className="text-[10px] text-slate-600 text-center mt-3">© 2026 PT. HSP / SCT</p>
            </div>
        </aside>
    );
}
