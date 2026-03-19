"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPopDetails, getInstallationsForPop, convertToAsset, moveRack } from "@/app/actions/pop";
import {
    ArrowLeft, Server, Package, Loader2, MapPin, Clock, User, Hash,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search,
    Building2, Cpu, CheckCircle, X, HardDrive, TriangleAlert,
} from "lucide-react";
import Link from "next/link";

/* ── Pagination ── */
const PP = 10;
function PaginationBar({ page, totalPages, setPage, total, perPage, label }: {
    page: number; totalPages: number; setPage: (n: number) => void; total: number; perPage: number; label?: string;
}) {
    if (total <= perPage) return null;
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push("..."); for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i); if (page < totalPages - 2) pages.push("..."); pages.push(totalPages); }
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1">
            <span className="text-[11px] text-slate-500">Menampilkan <span className="text-white font-medium">{start}–{end}</span> dari <span className="text-white font-medium">{total}</span> {label || "data"}</span>
            <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14} /></button>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                {pages.map((p, i) => p === "..." ? (<span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>) : (
                    <button key={p} type="button" onClick={() => setPage(p as number)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${page === p ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-white hover:bg-white/5"}`}>{p}</button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14} /></button>
            </div>
        </div>
    );
}

/* ── Convert Dialog ── */
function ConvertDialog({ installation, popId, onClose, onSuccess }: {
    installation: any; popId: number; onClose: () => void; onSuccess: () => void;
}) {
    const [purchasePrice, setPurchasePrice] = useState("");
    const [warrantyExpiry, setWarrantyExpiry] = useState("");
    const [rackLocation, setRackLocation] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const handleSubmit = async () => {
        setSaving(true);
        setErr("");
        const res = await convertToAsset(installation.id, {
            purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
            warrantyExpiry: warrantyExpiry || null,
            rackLocation: rackLocation || null,
            note: note || null,
        });
        setSaving(false);
        if (res.success) { onSuccess(); onClose(); }
        else { setErr(res.error ?? "Gagal"); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Cpu size={15} className="text-purple-400" /> Jadikan Asset</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[300px]">{installation.item?.name} · SN: {installation.serialnumber?.code}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
                </div>
                <div className="p-4 space-y-3">
                    {err && <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2"><TriangleAlert size={13} /> {err}</div>}
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Harga Beli (Rp)</label>
                        <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0"
                            className="mt-1 w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Garansi Sampai</label>
                        <input type="date" value={warrantyExpiry} onChange={e => setWarrantyExpiry(e.target.value)}
                            className="mt-1 w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Posisi Rak</label>
                        <input type="text" value={rackLocation} onChange={e => setRackLocation(e.target.value)} placeholder="cth. Rak-A/Slot-3"
                            className="mt-1 w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Catatan</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Opsional..."
                            className="mt-1 w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-purple-500/50 resize-none" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-[#1E293B]">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">Batal</button>
                    <button type="button" onClick={handleSubmit} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Konfirmasi
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Move Rack Dialog ── */
function MoveRackDialog({ installation, onClose, onSuccess }: {
    installation: any; onClose: () => void; onSuccess: () => void;
}) {
    const [rack, setRack] = useState(installation.rackLocation ?? "");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const handleSubmit = async () => {
        if (!rack.trim()) { setErr("Posisi rak wajib diisi"); return; }
        setSaving(true);
        setErr("");
        const res = await moveRack(installation.id, rack.trim(), note || undefined);
        setSaving(false);
        if (res.success) { onSuccess(); onClose(); }
        else { setErr(res.error ?? "Gagal"); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><HardDrive size={15} className="text-cyan-400" /> Pindah Rak</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[220px]">{installation.item?.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
                </div>
                <div className="p-4 space-y-3">
                    {err && <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</div>}
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Posisi Rak Baru <span className="text-red-400">*</span></label>
                        <input type="text" value={rack} onChange={e => setRack(e.target.value)} placeholder="cth. Rak-B/Slot-1"
                            className="mt-1 w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Alasan / Catatan</label>
                        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional..."
                            className="mt-1 w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-[#1E293B]">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">Batal</button>
                    <button type="button" onClick={handleSubmit} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <HardDrive size={12} />} Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}

type TabKey = "items" | "history" | "assets";

export default function PopDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>("items");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Assets tab state
    const [installations, setInstallations] = useState<any[]>([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [convertTarget, setConvertTarget] = useState<any>(null);
    const [moveTarget, setMoveTarget] = useState<any>(null);

    const popId = Number(params.id);

    const loadMain = useCallback(async () => {
        if (isNaN(popId)) { router.push("/pop"); return; }
        setLoading(true);
        const res = await getPopDetails(popId);
        if (res.success && res.data) { setData(res.data); }
        else { router.push("/pop"); }
        setLoading(false);
    }, [popId, router]);

    useEffect(() => { loadMain(); }, [loadMain]);

    const loadInstallations = useCallback(async () => {
        if (isNaN(popId)) return;
        setAssetsLoading(true);
        const res = await getInstallationsForPop(popId);
        if (res.success) setInstallations(res.data as any[]);
        setAssetsLoading(false);
    }, [popId]);

    useEffect(() => {
        if (activeTab === "assets") loadInstallations();
    }, [activeTab, loadInstallations]);

    useEffect(() => { setPage(1); }, [search, activeTab]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-purple-400 w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500">Memuat detail POP...</p>
            </div>
        );
    }

    if (!data) return null;
    const { pop, installations: rawInstallations, serialNumbers, stockOuts } = data;

    // --- Items at POP ---
    const itemMap = new Map<number, { id: number; name: string; code: string; unit: string; count: number }>();
    serialNumbers.forEach((sn: any) => {
        const it = sn.item;
        if (!itemMap.has(it.id)) {
            itemMap.set(it.id, { id: it.id, name: it.name, code: it.code, unit: it.unit || "pcs", count: 0 });
        }
        itemMap.get(it.id)!.count++;
    });
    const itemsList = Array.from(itemMap.values()).sort((a, b) => b.count - a.count);

    // --- History ---
    const filteredHistory = (stockOuts as any[]).filter((so: any) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return so.item.name.toLowerCase().includes(q) || so.item.code.toLowerCase().includes(q) ||
            (so.techName1 || "").toLowerCase().includes(q) || (so.techName2 || "").toLowerCase().includes(q) ||
            (so.description || "").toLowerCase().includes(q);
    });

    // --- Assets ---
    const filteredAssets = installations.filter((inst: any) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return inst.item?.name.toLowerCase().includes(q) || inst.serialnumber?.code.toLowerCase().includes(q);
    });

    const currentList = activeTab === "items" ? itemsList : activeTab === "history" ? filteredHistory : filteredAssets;
    const totalPages = Math.max(1, Math.ceil(currentList.length / PP));
    const safePage = Math.min(page, totalPages);
    const pagedList = currentList.slice((safePage - 1) * PP, safePage * PP);

    const totalSN = serialNumbers.length;
    const totalInstallations = rawInstallations.length;
    const totalAssets = installations.filter((i: any) => i.assetId).length;

    const fmtRp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
    const fmtDate = (d: string | Date | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Dialogs */}
            {convertTarget && (
                <ConvertDialog installation={convertTarget} popId={popId}
                    onClose={() => setConvertTarget(null)}
                    onSuccess={() => loadInstallations()} />
            )}
            {moveTarget && (
                <MoveRackDialog installation={moveTarget}
                    onClose={() => setMoveTarget(null)}
                    onSuccess={() => loadInstallations()} />
            )}

            {/* Breadcrumb + Header */}
            <div>
                <button type="button" onClick={() => router.push("/pop")} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors mb-3">
                    <ArrowLeft size={14} /> Kembali ke Data POP
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <Server size={20} className="text-purple-400" /> {pop.name}
                        </h2>
                        <div className="flex items-center flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                            {pop.location && <span className="flex items-center gap-1"><MapPin size={11} /> {pop.location}</span>}
                            {pop.area && <span className="flex items-center gap-1">Area: <span className="text-slate-300">{pop.area.name}</span></span>}
                            {pop.warehouse && <span className="flex items-center gap-1"><Building2 size={11} /> {pop.warehouse.name}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                    { label: "Total SN", value: totalSN, color: "text-purple-400", bg: "bg-purple-500/10" },
                    { label: "Item Unik", value: itemsList.length, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Instalasi", value: totalInstallations, color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Transaksi", value: stockOuts.length, color: "text-amber-400", bg: "bg-amber-500/10" },
                ].map((s, i) => (
                    <div key={i} className={`card !p-3 border border-[#1E293B] ${s.bg}`}>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</span>
                        <span className={`text-xl sm:text-2xl font-bold font-mono mt-1 block ${s.color}`}>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Tabs + Search */}
            <div className="card !p-0 border border-[#1E293B] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 border-b border-[#1E293B] bg-[#020617]/50">
                    <div className="flex gap-2 flex-wrap">
                        <button type="button" onClick={() => setActiveTab("items")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeTab === "items" ? "bg-purple-500/15 border-purple-500/30 text-purple-400" : "bg-transparent border-[#1E293B] text-slate-500 hover:text-white"}`}>
                            <Package size={13} className="inline mr-1.5 -mt-0.5" />Barang ({itemsList.length})
                        </button>
                        <button type="button" onClick={() => setActiveTab("history")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeTab === "history" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-transparent border-[#1E293B] text-slate-500 hover:text-white"}`}>
                            <Clock size={13} className="inline mr-1.5 -mt-0.5" />Riwayat ({stockOuts.length})
                        </button>
                        <button type="button" onClick={() => setActiveTab("assets")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeTab === "assets" ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" : "bg-transparent border-[#1E293B] text-slate-500 hover:text-white"}`}>
                            <Cpu size={13} className="inline mr-1.5 -mt-0.5" />Asset
                        </button>
                    </div>
                    {(activeTab === "history" || activeTab === "assets") && (
                        <div className="relative w-full sm:w-56">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder={activeTab === "assets" ? "Cari item, SN..." : "Cari barang, teknisi..."} value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all" />
                        </div>
                    )}
                </div>

                {/* ── Tab: Barang ── */}
                {activeTab === "items" && (
                    <>
                        <div className="hidden sm:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="px-4 py-3">Barang</th>
                                        <th className="px-4 py-3 text-right w-20">Jumlah</th>
                                        <th className="px-4 py-3 text-center w-20">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {(pagedList as any[]).length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-500">Belum ada barang di POP ini.</td></tr>
                                    ) : (pagedList as any[]).map((it: any) => (
                                        <tr key={it.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-white text-sm truncate max-w-[250px] group-hover:text-purple-400 transition-colors">{it.name}</p>
                                                <p className="text-[10px] text-slate-600 font-mono">{it.code}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-purple-400">{it.count} <span className="text-[10px] text-slate-500 font-normal">{it.unit}</span></td>
                                            <td className="px-4 py-3 text-center">
                                                <Link href={`/master/items/${it.id}`} className="text-xs text-slate-500 hover:text-purple-400 transition-colors">Detail →</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-2 p-3">
                            {(pagedList as any[]).length === 0 ? (
                                <div className="flex flex-col items-center py-12 gap-2">
                                    <Package size={20} className="text-slate-600" />
                                    <p className="text-sm text-slate-500">Belum ada barang.</p>
                                </div>
                            ) : (pagedList as any[]).map((it: any) => (
                                <Link key={it.id} href={`/master/items/${it.id}`} className="block bg-[#020617] border border-[#1E293B] rounded-xl p-3 hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-white text-sm truncate">{it.name}</p>
                                            <p className="text-[10px] text-slate-600 font-mono">{it.code}</p>
                                        </div>
                                        <span className="font-mono font-bold text-purple-400 text-lg shrink-0 ml-3">{it.count}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Tab: Riwayat ── */}
                {activeTab === "history" && (
                    <>
                        <div className="hidden sm:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="px-4 py-3">Barang</th>
                                        <th className="px-4 py-3 text-right w-16">Qty</th>
                                        <th className="px-4 py-3 w-28">Teknisi</th>
                                        <th className="px-4 py-3 text-right w-28">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {(pagedList as any[]).length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Tidak ada riwayat.</td></tr>
                                    ) : (pagedList as any[]).map((so: any) => (
                                        <tr key={so.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-white text-sm truncate max-w-[200px]">{so.item.name}</p>
                                                <p className="text-[10px] text-slate-600 font-mono">{so.item.code}
                                                    {so.stockoutserial?.length > 0 && <span className="text-slate-500 ml-1">· SN: {so.stockoutserial.map((s: any) => s.serialnumber.code).join(", ")}</span>}
                                                </p>
                                                {so.description && <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[250px]">{so.description}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">{so.qty}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    {so.techName1 && <span className="text-[11px] text-slate-300 flex items-center gap-1"><User size={10} className="text-slate-500" /> {so.techName1}</span>}
                                                    {so.techName2 && <span className="text-[10px] text-slate-500">{so.techName2}</span>}
                                                    {!so.techName1 && <span className="text-[10px] text-slate-600 italic">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">
                                                {new Date(so.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-2 p-3">
                            {(pagedList as any[]).length === 0 ? (
                                <div className="flex flex-col items-center py-12 gap-2">
                                    <Clock size={20} className="text-slate-600" />
                                    <p className="text-sm text-slate-500">Tidak ada riwayat.</p>
                                </div>
                            ) : (pagedList as any[]).map((so: any) => (
                                <div key={so.id} className="bg-[#020617] border border-[#1E293B] rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="font-medium text-white text-sm truncate flex-1 min-w-0">{so.item.name}</p>
                                        <span className="font-mono font-bold text-amber-400 shrink-0 ml-2">×{so.qty}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                                        {so.techName1 && <span className="flex items-center gap-1"><User size={9} /> {so.techName1}</span>}
                                        <span className="font-mono">{new Date(so.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                    </div>
                                    {so.stockoutserial?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {so.stockoutserial.map((s: any, i: number) => (
                                                <span key={i} className="font-mono text-[9px] bg-slate-900 border border-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">{s.serialnumber.code}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Tab: Asset ── */}
                {activeTab === "assets" && (
                    <>
                        {assetsLoading ? (
                            <div className="flex items-center justify-center py-16 gap-2">
                                <Loader2 size={16} className="animate-spin text-cyan-400" />
                                <span className="text-sm text-slate-500">Memuat data asset...</span>
                            </div>
                        ) : (
                            <>
                                <div className="hidden sm:block">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                                <th className="px-4 py-3">Item / SN</th>
                                                <th className="px-4 py-3 w-28">Status</th>
                                                <th className="px-4 py-3 w-32">Posisi Rak</th>
                                                <th className="px-4 py-3 text-right w-32">Harga Beli</th>
                                                <th className="px-4 py-3 w-32">Garansi</th>
                                                <th className="px-4 py-3 text-center w-32">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {(pagedList as any[]).length === 0 ? (
                                                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Belum ada instalasi di POP ini.</td></tr>
                                            ) : (pagedList as any[]).map((inst: any) => {
                                                const isAsset = !!inst.assetId;
                                                const lastLog = inst.asset?.locationlogs?.[0];
                                                return (
                                                    <tr key={inst.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-white text-sm truncate max-w-[220px]">{inst.item?.name}</p>
                                                            <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                                                <Hash size={9} /> {inst.serialnumber?.code ?? <span className="italic text-slate-600">tanpa SN</span>}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isAsset ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-semibold">
                                                                    <CheckCircle size={9} /> Asset
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-500/10 border border-slate-500/20 text-slate-500 px-2 py-0.5 rounded-full">
                                                                    Instalasi
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                                                            {inst.rackLocation ?? (lastLog?.rackLocation ?? "—")}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs text-slate-400 font-mono">
                                                            {isAsset && inst.asset?.purchasePrice ? fmtRp(inst.asset.purchasePrice) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-500">
                                                            {isAsset ? fmtDate(inst.asset?.warrantyExpiry) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {!isAsset && inst.serialnumber && (
                                                                    <button type="button" onClick={() => setConvertTarget(inst)}
                                                                        className="text-[10px] px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all whitespace-nowrap">
                                                                        Jadikan Asset
                                                                    </button>
                                                                )}
                                                                {isAsset && (
                                                                    <button type="button" onClick={() => setMoveTarget(inst)}
                                                                        className="text-[10px] px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all whitespace-nowrap">
                                                                        Pindah Rak
                                                                    </button>
                                                                )}
                                                                {isAsset && (
                                                                    <Link href={`/assets/${inst.assetId}`} className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors whitespace-nowrap">
                                                                        Detail →
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile cards */}
                                <div className="sm:hidden space-y-2 p-3">
                                    {(pagedList as any[]).length === 0 ? (
                                        <div className="flex flex-col items-center py-12 gap-2">
                                            <Cpu size={20} className="text-slate-600" />
                                            <p className="text-sm text-slate-500">Belum ada instalasi.</p>
                                        </div>
                                    ) : (pagedList as any[]).map((inst: any) => {
                                        const isAsset = !!inst.assetId;
                                        return (
                                            <div key={inst.id} className="bg-[#020617] border border-[#1E293B] rounded-xl p-3">
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-white text-sm truncate">{inst.item?.name}</p>
                                                        <p className="text-[10px] font-mono text-slate-500">{inst.serialnumber?.code ?? "—"}</p>
                                                    </div>
                                                    {isAsset ? (
                                                        <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full shrink-0 ml-2">Asset</span>
                                                    ) : (
                                                        <span className="text-[9px] bg-slate-500/10 border border-slate-500/20 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0 ml-2">Instalasi</span>
                                                    )}
                                                </div>
                                                {inst.rackLocation && (
                                                    <p className="text-[10px] text-slate-500 font-mono mb-1.5">Rak: {inst.rackLocation}</p>
                                                )}
                                                <div className="flex gap-2 mt-2">
                                                    {!isAsset && inst.serialnumber && (
                                                        <button type="button" onClick={() => setConvertTarget(inst)}
                                                            className="flex-1 text-[10px] py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-center">
                                                            Jadikan Asset
                                                        </button>
                                                    )}
                                                    {isAsset && (
                                                        <>
                                                            <button type="button" onClick={() => setMoveTarget(inst)}
                                                                className="flex-1 text-[10px] py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-center">
                                                                Pindah Rak
                                                            </button>
                                                            <Link href={`/assets/${inst.assetId}`} className="flex-1 text-[10px] py-1.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-lg text-center">
                                                                Detail
                                                            </Link>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}

                <div className="px-3 pb-3">
                    <PaginationBar page={safePage} totalPages={totalPages} setPage={setPage}
                        total={currentList.length} perPage={PP}
                        label={activeTab === "items" ? "barang" : activeTab === "history" ? "transaksi" : "instalasi"} />
                </div>
            </div>
        </div>
    );
}
