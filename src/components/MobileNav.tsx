"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Download, Upload, Package,
    ArrowRightLeft, Server, FileBarChart, Database, Grid2X2, X
} from "lucide-react";

const mainLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbound", label: "Masuk", icon: Download },
    { href: "/outbound", label: "Keluar", icon: Upload },
    { href: "/stock", label: "Stok", icon: Package },
    { href: "/more", label: "Lainnya", icon: Grid2X2 },
];

const allLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbound", label: "Barang Masuk", icon: Download },
    { href: "/outbound", label: "Barang Keluar", icon: Upload },
    { href: "/transfer", label: "Transfer Stok", icon: ArrowRightLeft },
    { href: "/pop", label: "Data POP", icon: Server },
    { href: "/stock", label: "Stok Gudang", icon: Package },
    { href: "/reports", label: "Laporan", icon: FileBarChart },
    { href: "/master", label: "Master Data", icon: Database },
];

export default function MobileNav() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            {/* Full Screen Overlay Menu */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[60] bg-[#020617]/95 backdrop-blur-xl flex flex-col animate-fade-in">
                    <div className="h-16 flex items-center justify-between px-5 border-b border-[#0F172A]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Package size={14} className="text-white" />
                            </div>
                            <h1 className="text-base font-bold text-white">WMS-2026</h1>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0F172A] text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-5 px-4 flex flex-col gap-1">
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Navigasi</p>
                        {allLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`nav-link ${isActive ? "active" : ""}`}
                                    style={{ padding: '0.75rem 1rem', fontSize: '0.9375rem' }}
                                >
                                    <link.icon size={20} className="shrink-0" />
                                    <span>{link.label}</span>
                                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-t border-[#0F172A]">
                <div className="flex items-center justify-around h-[60px] px-1">
                    {mainLinks.map((link) => {
                        const isMore = link.href === "/more";
                        const isActive = isMore
                            ? isMenuOpen
                            : pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

                        if (isMore) {
                            return (
                                <button
                                    key="more"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all ${isActive ? "text-green-400" : "text-slate-500 hover:text-slate-300"}`}
                                >
                                    <Grid2X2 size={20} />
                                    <span className="text-[10px] font-medium">Lainnya</span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all ${isActive ? "text-green-400" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                <div className={`relative flex items-center justify-center w-8 h-7 rounded-lg ${isActive ? "bg-green-500/10" : ""}`}>
                                    <link.icon size={19} />
                                    {isActive && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />}
                                </div>
                                <span className="text-[10px] font-medium">{link.label}</span>
                            </Link>
                        );
                    })}
                </div>
                {/* Safe area padding for iOS */}
                <div className="h-safe-bottom bg-transparent" />
            </nav>
        </>
    );
}
