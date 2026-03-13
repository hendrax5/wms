"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSerialNumberHistory } from "@/app/actions/master";
import { ArrowLeft, Hash, Package, Calendar, MapPin, Activity, Tag, Loader2, ArrowUpRight, ArrowDownLeft, ShieldAlert, Hammer, User } from "lucide-react";
import Link from "next/link";

type SNDetail = {
    id: number;
    code: string;
    item: { name: string; code: string; category: { name: string } | null };
    status: { name: string };
    type: { name: string };
    warehouse: { name: string } | null;
    pop: { name: string } | null;
    updatedAt: Date;
    createdAt: Date;
};

type TimelineEvent = {
    id: string;
    date: Date;
    type: string;
    title: string;
    description: string;
    location: string;
    actor?: string;
};

export default function SNDetailClient() {
    const params = useParams();
    const router = useRouter();
    const [sn, setSn] = useState<SNDetail | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = Number(params.id);
        if (isNaN(id)) {
            router.push("/master");
            return;
        }

        const loadData = async () => {
            setLoading(true);
            const res = await getSerialNumberHistory(id);
            if (res.success && res.data) {
                setSn(res.data.sn as SNDetail);
                setTimeline(res.data.timeline as TimelineEvent[]);
            } else {
                router.push("/master/items");
            }
            setLoading(false);
        };

        loadData();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-purple-400 w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500">Memuat detail & riwayat Tracker...</p>
            </div>
        );
    }

    if (!sn) return null;

    const currentLocation = sn.warehouse ? sn.warehouse.name : sn.pop ? sn.pop.name : 'Unknown';

    return (
        <div className="space-y-6 animate-fade-in custom-scrollbar">
            {/* Header & Breadcrumb */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                    <ArrowLeft size={16} />
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link href="/master" className="hover:text-white transition-colors">Master Data</Link>
                    <span>/</span>
                    <button onClick={() => router.back()} className="hover:text-white transition-colors text-left truncate max-w-[100px] sm:max-w-[200px]">Item</button>
                    <span>/</span>
                    <span className="text-white font-medium break-all">{sn.code}</span>
                </div>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 border border-[#1E293B] relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] bg-purple-500/10 pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700" />

                <div className="flex gap-5 relative z-10 w-full mb-4 md:mb-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-purple-500/20 flex items-center justify-center shadow-inner shrink-0 shadow-purple-500/10">
                        <Hash size={32} className="text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold tracking-tight text-white break-all">{sn.code}</h2>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sn.status.name === 'In Stock' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                sn.status.name === 'Dipakai' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    sn.status.name === 'Rusak' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                {sn.status.name}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5 text-slate-300">
                                <Package size={14} className="text-slate-500" /> {sn.item.name}
                            </span>
                            <span className="text-slate-600 hidden sm:inline">•</span>
                            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-xs font-mono">{sn.item.code}</span>
                            <span className="text-slate-600 hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 text-slate-400 text-xs">
                                <Tag size={12} /> {sn.item.category?.name || 'Uncategorized'}
                            </span>
                            <span className="text-slate-600 hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 text-slate-400 text-xs">
                                <Activity size={12} /> Kondisi: {sn.type.name}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 relative z-10 md:min-w-[250px] shrink-0">
                    <div className="flex flex-col gap-1 w-full bg-[#020617]/50 p-3 rounded-lg border border-[#1E293B]">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin size={12} className="text-amber-400" /> Lokasi Saat Ini
                        </p>
                        <p className="text-sm font-bold text-white truncate">{currentLocation}</p>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Activity size={20} className="text-purple-400" />
                    Riwayat Perjalanan (Tracker)
                    <span className="text-xs font-normal text-slate-500 ml-1">({timeline.length} aktivitas)</span>
                </h3>

                <div className="card border border-[#1E293B] overflow-hidden">
                    {timeline.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                <Calendar size={20} className="text-slate-500" />
                            </div>
                            <p>Belum ada riwayat aktivitas tercatat untuk Serial Number ini.</p>
                        </div>
                    ) : (
                        <div className="relative p-6">
                            {/* Vertical Line */}
                            <div className="absolute left-10 md:left-14 top-10 bottom-10 w-0.5 bg-gradient-to-b from-purple-500/50 via-slate-700 to-transparent"></div>

                            <div className="space-y-8">
                                {timeline.map((event, i) => (
                                    <div key={event.id} className="relative flex gap-6 items-start">
                                        {/* Timeline Dot/Icon */}
                                        <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center border-2 border-[#0F172A] bg-[#1E293B] shadow-md ml-1 md:ml-2">
                                            {event.type === 'INBOUND' ? <ArrowDownLeft size={16} className="text-green-400" /> :
                                                event.type === 'TRANSFER' ? <ArrowUpRight size={16} className="text-amber-400" /> :
                                                    event.type === 'DAMAGED' ? <ShieldAlert size={16} className="text-red-400" /> :
                                                        event.type === 'CUSTOMER_INSTALL' ? <User size={16} className="text-blue-400" /> :
                                                            event.type === 'POP_INSTALL' ? <Hammer size={16} className="text-purple-400" /> :
                                                                <Activity size={16} className="text-slate-400" />}
                                        </div>

                                        {/* Content Card */}
                                        <div className="flex-1 bg-[#020617] border border-[#1E293B]/60 p-4 rounded-xl hover:border-purple-500/30 transition-all duration-300 group">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                                <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{event.title}</h4>
                                                <span className="text-[11px] font-mono text-slate-500 bg-[#0F172A] px-2 py-1 rounded shrink-0 flex items-center gap-1.5 border border-[#1E293B]">
                                                    <Calendar size={10} />
                                                    {new Date(event.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-400 mb-3 leading-relaxed">{event.description}</p>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded-md border border-[#1E293B]">
                                                    <MapPin size={12} className="text-amber-400" />
                                                    {event.location}
                                                </div>
                                                {event.actor && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded-md border border-[#1E293B]">
                                                        <User size={12} className="text-blue-400" />
                                                        Pihak Terkait: {event.actor}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Start Point */}
                                <div className="relative flex gap-6 items-start">
                                    <div className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center bg-[#0F172A] ml-1 md:ml-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                    </div>
                                    <div className="flex-1 flex items-center h-10">
                                        <p className="text-xs text-slate-500 italic">Pencatatan Serial Number dimulai.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

