"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, createContext, useContext } from "react";
import {
    LayoutDashboard,
    ArrowRightLeft,
    Server,
    Package,
    FileBarChart,
    BoxIcon,
    Cpu,
    Wrench,
    ScanLine,
    RotateCcw,
    Building2,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";

/* ── Sidebar context (shared with layout) ── */
export const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} });
export function useSidebar() { return useContext(SidebarContext); }

const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/operasi", label: "Operasi Stok", icon: ArrowRightLeft },
    { href: "/pop", label: "Data POP", icon: Server },
    { href: "/stock", label: "Direktori Gudang", icon: Building2 },
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
    const { collapsed, toggle } = useSidebar();

    return (
        <aside className={`bg-[#020617] border-r border-[#1E293B] hidden md:flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${collapsed ? "w-[68px]" : "w-60"}`}>
            {/* Logo */}
            <div className="h-16 flex items-center px-3 border-b border-[#1E293B] gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0">
                    <BoxIcon size={16} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-white tracking-tight leading-none whitespace-nowrap">WMS-2026</h1>
                        <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">ServiceX / HSP</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-0.5">
                {!collapsed && <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Menu</p>}
                {links.map((link) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            title={collapsed ? link.label : undefined}
                            className={`flex items-center gap-2.5 rounded-xl transition-all duration-200 group relative ${
                                collapsed ? "justify-center px-0 py-2.5 mx-auto w-11 h-11" : "px-3 py-2.5"
                            } ${isActive
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                            }`}
                        >
                            <link.icon size={18} className="shrink-0" />
                            {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
                            {!collapsed && isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-glow" />
                            )}
                            {/* Tooltip on collapsed */}
                            {collapsed && (
                                <span className="absolute left-full ml-2 px-2.5 py-1 bg-[#1E293B] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-xl pointer-events-none">
                                    {link.label}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {!collapsed && <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-4">Asset Management</p>}
                {collapsed && <div className="border-t border-[#1E293B] my-3 mx-2" />}
                {assetLinks.map((link) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            title={collapsed ? link.label : undefined}
                            className={`flex items-center gap-2.5 rounded-xl transition-all duration-200 group relative ${
                                collapsed ? "justify-center px-0 py-2.5 mx-auto w-11 h-11" : "px-3 py-2.5"
                            } ${isActive
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                            }`}
                        >
                            <link.icon size={18} className="shrink-0" />
                            {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
                            {!collapsed && isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-glow" />
                            )}
                            {collapsed && (
                                <span className="absolute left-full ml-2 px-2.5 py-1 bg-[#1E293B] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-xl pointer-events-none">
                                    {link.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse toggle + Footer */}
            <div className="border-t border-[#1E293B] p-2">
                <button
                    type="button"
                    onClick={toggle}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all"
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /><span className="text-xs font-medium">Collapse</span></>}
                </button>
                {!collapsed && <p className="text-[10px] text-slate-600 text-center mt-2">© 2026 PT. HSP / SCT</p>}
            </div>
        </aside>
    );
}
