"use client";

import { useState } from "react";
import { Search, History, Activity, MapPin, Box, Loader2, AlertCircle, ArrowRight, ShieldAlert, Cpu } from "lucide-react";
import { getSerialNumberHistory } from "@/app/actions/tracking";

export default function TrackingClient() {
    const [searchCode, setSearchCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [snData, setSnData] = useState<any>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = searchCode.trim();
        if (!code) return;

        setLoading(true);
        setError("");
        setSnData(null);

        const res = await getSerialNumberHistory(code);

        if (res.success && res.data) {
            setSnData(res.data);
        } else {
            setError(res.error || "Gagal melacak Serial Number");
        }

        setLoading(false);
    };

    const getTimelineIcon = (type: string) => {
        switch (type) {
            case "INBOUND": return <Box className="text-blue-400" size={20} />;
            case "TRANSFER": return <ArrowRight className="text-amber-400" size={20} />;
            case "POP_INSTALL":
            case "CUSTOMER_INSTALL": return <Activity className="text-rose-400" size={20} />;
            case "DAMAGED": return <ShieldAlert className="text-red-500" size={20} />;
            default: return <History className="text-slate-400" size={20} />;
        }
    };

    const getTimelineColor = (type: string) => {
        switch (type) {
            case "INBOUND": return "border-blue-500/30 bg-blue-500/10";
            case "TRANSFER": return "border-amber-500/30 bg-amber-500/10";
            case "POP_INSTALL":
            case "CUSTOMER_INSTALL": return "border-rose-500/30 bg-rose-500/10";
            case "DAMAGED": return "border-red-500/50 bg-red-500/20";
            default: return "border-slate-500/30 bg-slate-800";
        }
    };

    return (
        <div className="space-y-6">
            {/* SEARCH BOX */}
            <div className="glass p-6 rounded-xl border border-[#334155] max-w-3xl">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="text-slate-500" size={20} />
                        </div>
                        <input
                            type="text"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            placeholder="Scan atau ketik Serial Number..."
                            className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg pl-12 pr-4 py-3 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg transition-all"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !searchCode.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : "Lacak"}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            {/* RESULTS */}
            {snData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">

                    {/* DETAILS CARD */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass p-6 rounded-xl border border-[#334155] sticky top-6">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider mb-6">
                                <Cpu size={16} /> Identitas Perangkat
                            </h3>

                            <div className="space-y-5">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Serial Number</p>
                                    <p className="font-mono text-xl font-bold text-white bg-slate-900 px-3 py-1.5 rounded-md inline-block border border-slate-700">
                                        {snData.details.code}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Tipe / Model Barang</p>
                                    <p className="font-medium text-slate-200">{snData.details.itemName}</p>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">{snData.details.itemCode} • {snData.details.category}</p>
                                </div>

                                <div className="pt-4 border-t border-[#334155]/50">
                                    <p className="text-xs text-slate-500 mb-1">Status Saat Ini</p>
                                    <div className="flex gap-2 mb-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${snData.details.status === "In Stock" ? "bg-emerald-500/20 text-emerald-400" :
                                                snData.details.status === "Dipakai" ? "bg-rose-500/20 text-rose-400" :
                                                    snData.details.status === "Rusak" ? "bg-red-500/20 text-red-400 font-bold" :
                                                        "bg-slate-500/20 text-slate-400"
                                            }`}>
                                            {snData.details.status || "Unknown"}
                                        </span>
                                        <span className="px-2.5 py-1 border border-slate-600 bg-slate-800 text-slate-300 text-xs font-bold rounded-full">
                                            {snData.details.type || "Baru"}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-500 mb-1">Lokasi Terakhir</p>
                                    <p className="font-medium text-blue-300 flex items-center gap-2 bg-blue-900/20 p-2 rounded-lg border border-blue-900/50">
                                        <MapPin size={16} />
                                        {snData.details.currentLocation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TIMELINE */}
                    <div className="lg:col-span-2">
                        <div className="glass p-6 sm:p-8 rounded-xl border border-[#334155]">
                            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                                <History size={24} className="text-blue-400" />
                                Jejak Rekam (Audit Trail)
                            </h3>

                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">

                                {snData.timeline.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">Belum ada riwayat tercatat untuk perangkat ini.</p>
                                ) : (
                                    snData.timeline.map((event: any, idx: number) => (
                                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                                            {/* Icon */}
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10 transition-transform group-hover:scale-110`}>
                                                {getTimelineIcon(event.type)}
                                            </div>

                                            {/* Content Card */}
                                            <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] rounded-xl border p-4 shadow-lg transition-colors ${getTimelineColor(event.type)}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-4">
                                                    <span className="font-semibold text-slate-100">{event.title}</span>
                                                    <time className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                                                        {new Date(event.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </time>
                                                </div>

                                                <div className="text-sm text-slate-300 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={14} className="mt-0.5 text-slate-500 shrink-0" />
                                                        <div>
                                                            <span className="text-slate-400">Dari:</span> {event.location}
                                                            {event.target && (
                                                                <>
                                                                    <br />
                                                                    <span className="text-slate-400">Ke:</span> <span className="text-amber-300">{event.target}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {event.description && (
                                                        <p className="bg-black/20 p-2 rounded border border-white/5 text-xs text-slate-400">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    ))
                                )}

                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
