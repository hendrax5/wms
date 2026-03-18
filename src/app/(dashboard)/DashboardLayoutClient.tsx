"use client";

import { useState } from "react";
import Sidebar, { SidebarContext } from "@/components/Sidebar";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";

export default function DashboardLayoutClient({ children, appConfig }: { children: React.ReactNode, appConfig?: any }) {
    const [collapsed, setCollapsed] = useState(false);
    const toggle = () => setCollapsed(v => !v);

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
