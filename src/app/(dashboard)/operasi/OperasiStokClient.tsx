"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Download, Upload, ArrowRightLeft, CornerDownLeft, Package } from "lucide-react";
import InboundClient from "@/app/(dashboard)/inbound/InboundClient";
import OutboundClient from "@/app/(dashboard)/outbound/OutboundClient";
import TransferClient from "@/app/(dashboard)/transfer/TransferClient";
import ReturnClient from "@/app/(dashboard)/return/ReturnClient";

const TABS = [
    { key: "masuk",    label: "Barang Masuk",    icon: Download,       color: "text-green-400",  activeBg: "bg-green-500/10 border-green-500/30", desc: "Catat penerimaan barang baru ke gudang" },
    { key: "keluar",   label: "Barang Keluar",   icon: Upload,         color: "text-orange-400", activeBg: "bg-orange-500/10 border-orange-500/30", desc: "Keluarkan barang untuk dipasang di POP / Pelanggan" },
    { key: "transfer", label: "Transfer Stok",   icon: ArrowRightLeft, color: "text-blue-400",   activeBg: "bg-blue-500/10 border-blue-500/30", desc: "Pindahkan unit perangkat antar gudang" },
    { key: "return",   label: "Barang Return", icon: CornerDownLeft,  color: "text-purple-400", activeBg: "bg-purple-500/10 border-purple-500/30", desc: "Terima kembali barang dari POP / Pelanggan" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function OperasiStokClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = (searchParams.get("tab") as TabKey) || "masuk";
    const [activeTab, setActiveTab] = useState<TabKey>(TABS.some(t => t.key === initialTab) ? initialTab : "masuk");

    const currentTab = TABS.find(t => t.key === activeTab)!;

    const switchTab = (key: TabKey) => {
        setActiveTab(key);
        router.replace(`/operasi?tab=${key}`, { scroll: false });
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 mb-0.5">
                    <Package size={22} className="text-green-400" /> Operasi Stok
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">Kelola pergerakan barang masuk, keluar, transfer, dan return</p>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => switchTab(tab.key)}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all whitespace-nowrap shrink-0 ${
                                isActive
                                    ? `${tab.activeBg} ${tab.color}`
                                    : "bg-transparent border-[#1E293B] text-slate-500 hover:text-slate-300 hover:border-slate-600"
                            }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div>
                {activeTab === "masuk" && <InboundClient />}
                {activeTab === "keluar" && <OutboundClient />}
                {activeTab === "transfer" && <TransferClient />}
                {activeTab === "return" && <ReturnClient />}
            </div>
        </div>
    );
}
