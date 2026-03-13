"use client";

import { Bell, Search, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

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
};

export default function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [showDropdown, setShowDropdown] = useState(false);

    const pageTitle = pathLabels[pathname] || "WMS-2026";
    const initials = (session?.user?.name || session?.user?.username || "U")
        .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

    return (
        <header className="h-14 bg-[#020617]/90 backdrop-blur-xl border-b border-[#0F172A] flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
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
                    className="w-full !bg-[#0F172A] !border-[#1E293B] rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-slate-600 focus:!border-green-500 focus:!ring-1 focus:!ring-green-500/25"
                    style={{ fontSize: '14px' }}
                />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#0F172A] transition-all relative">
                    <Bell size={17} />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />
                </button>

                {/* User Avatar + Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#0F172A] transition-all cursor-pointer"
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
                            <div className="absolute right-0 mt-1 w-44 glass-card border border-[#1E293B] py-1 z-50 shadow-xl">
                                <div className="px-3 py-2 border-b border-[#1E293B]">
                                    <p className="text-xs font-semibold text-white">{session?.user?.name || "Admin"}</p>
                                    <p className="text-[10px] text-slate-500">{session?.user?.level || "MASTER"}</p>
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
