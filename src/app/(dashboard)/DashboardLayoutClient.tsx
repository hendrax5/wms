"use client";

import { useState, useEffect } from "react";
import Sidebar, { SidebarContext } from "@/components/Sidebar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";

const STORAGE_KEY = "wms:sidebar-collapsed";

export default function DashboardLayoutClient({ children, appConfig }: { children: React.ReactNode, appConfig?: any }) {
    // Initialize from localStorage to avoid layout flash
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
    });

    const toggle = () => setCollapsed(v => {
        const next = !v;
        try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
        return next;
    });

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            <div className="flex h-screen w-full bg-background overflow-hidden">
                <Sidebar appConfig={appConfig} />
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
                        {children}
                    </main>
                    <MobileNav />
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
