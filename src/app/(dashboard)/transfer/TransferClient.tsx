"use client";

import { useState, useEffect, useRef } from "react";
import {
    ArrowRightLeft, ScanLine, X, Loader2, Save, AlertCircle,
    Building2, Package, Search, ChevronDown, ChevronUp, Hash,
    CheckCircle2, Plus, Trash2
} from "lucide-react";
import { createTransfer, checkSerialInWarehouse, getAvailableSNs, type TransferItem } from "@/app/actions/transfer";
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect } from "@/app/actions/pop";
import { useSession } from "next-auth/react";
import SearchableSelect from "@/components/SearchableSelect";

type ItemMeta = { id: number; name: string; code: string; hasSN: boolean; };
type WarehouseMeta = { id: number; name: string; type: string };

// Per-item state for each row in the cart
type LineItem = {
    uid: string;
    itemId: string;
    qty: number;
    serialNumbers: string[];
    // SN picker UI state
    availableSNs: { id: number; code: string }[];
    loadingSNs: boolean;
    snSearchFilter: string;
    isPickerOpen: boolean;
    currentScan: string;
    isVerifying: boolean;
};

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function makeBlankLine(): LineItem {
    return {
        uid: uid(),
        itemId: "",
        qty: 1,
        serialNumbers: [],
        availableSNs: [],
        loadingSNs: false,
        snSearchFilter: "",
        isPickerOpen: true,
        currentScan: "",
        isVerifying: false,
    };
}

export default function TransferClient() {
    const { data: session } = useSession();
    const userLevel = (session?.user as any)?.level || "";
    const userWarehouseId = (session?.user as any)?.warehouseId || null;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [warehouses, setWarehouses] = useState<WarehouseMeta[]>([]);
    const [items, setItems] = useState<ItemMeta[]>([]);

    const [sourceId, setSourceId] = useState("");
    const [targetId, setTargetId] = useState("");
    const [description, setDescription] = useState("");
    const [lines, setLines] = useState<LineItem[]>([makeBlankLine()]);

    // Which line is "active" for the scanner
    const [activeLineUid, setActiveLineUid] = useState<string | null>(null);
    const scannerRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [wRes, iRes] = await Promise.all([getWarehousesForSelect(), getItems()]);
            if (wRes.success && wRes.data) {
                let wList = wRes.data as any;
                if (userLevel !== "MASTER" && userWarehouseId) {
                    wList = wList.filter((w: any) => w.id === userWarehouseId);
                }
                setWarehouses(wList);
                if (wList.length === 1) setSourceId(String(wList[0].id));
            }
            if (iRes.success && iRes.data) setItems(iRes.data as any);
            setLoading(false);
        };
        load();
    }, []);

    // ---- Line Helpers ----
    const updateLine = (uid: string, patch: Partial<LineItem>) => {
        setLines(prev => prev.map(l => l.uid === uid ? { ...l, ...patch } : l));
    };

    const addLine = () => {
        setLines(prev => [...prev, makeBlankLine()]);
    };

    const removeLine = (uid: string) => {
        setLines(prev => prev.filter(l => l.uid !== uid));
    };

    // Load available SNs for a line when item + source change
    const loadSNsForLine = async (lineUid: string, itemId: string, srcId: string) => {
        if (!itemId || !srcId) return;
        updateLine(lineUid, { loadingSNs: true });
        const res = await getAvailableSNs(Number(srcId), Number(itemId));
        updateLine(lineUid, {
            loadingSNs: false,
            availableSNs: res.success && res.data ? (res.data as any) : [],
        });
    };

    const handleItemChange = (lineUid: string, newItemId: string) => {
        updateLine(lineUid, { itemId: newItemId, serialNumbers: [], availableSNs: [], qty: 1 });
        const item = items.find(i => i.id.toString() === newItemId);
        if (item?.hasSN && sourceId) {
            loadSNsForLine(lineUid, newItemId, sourceId);
        }
    };

    // When source warehouse changes, reload all SN pools
    const handleSourceChange = (val: string) => {
        setSourceId(val);
        setLines(prev => prev.map(l => {
            const item = items.find(i => i.id.toString() === l.itemId);
            if (item?.hasSN && val) {
                loadSNsForLine(l.uid, l.itemId, val);
            }
            return { ...l, serialNumbers: [], availableSNs: [] };
        }));
    };

    // ---- Scanner ----
    const handleScanComplete = async (lineUid: string, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const line = lines.find(l => l.uid === lineUid);
        if (!line) return;
        const scanned = line.currentScan.trim();
        if (!scanned) return;

        if (!sourceId) { setError("Pilih Gudang Asal terlebih dahulu."); return; }
        if (line.serialNumbers.includes(scanned)) {
            setError(`Serial Number ${scanned} sudah ada di daftar.`);
            updateLine(lineUid, { currentScan: "" });
            return;
        }

        updateLine(lineUid, { isVerifying: true });
        setError("");

        const validRes = await checkSerialInWarehouse(scanned, Number(sourceId), Number(line.itemId));
        if (validRes.success) {
            const newSNs = [...line.serialNumbers, scanned];
            updateLine(lineUid, { serialNumbers: newSNs, qty: newSNs.length, isVerifying: false, currentScan: "" });
        } else {
            setError(validRes.error || "Gagal verifikasi SN.");
            updateLine(lineUid, { isVerifying: false, currentScan: "" });
        }
    };

    const addSNFromPicker = (lineUid: string, snCode: string) => {
        const line = lines.find(l => l.uid === lineUid);
        if (!line || line.serialNumbers.includes(snCode)) return;
        const newSNs = [...line.serialNumbers, snCode];
        updateLine(lineUid, { serialNumbers: newSNs, qty: newSNs.length });
    };

    const removeSN = (lineUid: string, sn: string) => {
        const line = lines.find(l => l.uid === lineUid);
        if (!line) return;
        const newSNs = line.serialNumbers.filter(s => s !== sn);
        updateLine(lineUid, { serialNumbers: newSNs, qty: Math.max(newSNs.length, 1) });
    };

    // ---- Submit ----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!sourceId || !targetId) {
            setError("Gudang Asal dan Gudang Tujuan wajib diisi.");
            return;
        }
        if (sourceId === targetId) {
            setError("Gudang Asal dan Tujuan tidak boleh sama.");
            return;
        }

        const validLines = lines.filter(l => l.itemId);
        if (validLines.length === 0) {
            setError("Pilih minimal 1 barang yang akan di-transfer.");
            return;
        }

        for (const line of validLines) {
            const item = items.find(i => i.id.toString() === line.itemId);
            if (item?.hasSN && line.serialNumbers.length !== line.qty) {
                setError(`Barang "${item.name}" membutuhkan Serial Number. Scan atau pilih SN sesuai Qty.`);
                return;
            }
            if (line.qty <= 0) {
                setError("Quantity harus lebih dari 0 untuk setiap barang.");
                return;
            }
        }

        setSubmitting(true);
        const payload = {
            sourceWarehouseId: Number(sourceId),
            targetWarehouseId: Number(targetId),
            description,
            items: validLines.map(l => ({
                itemId: Number(l.itemId),
                qty: l.qty,
                serialNumbers: l.serialNumbers,
            })) satisfies TransferItem[],
        };

        const res = await createTransfer(payload);
        if (res.success) {
            setSuccessMsg(`Transfer ${validLines.length} item berhasil diproses.`);
            setLines([makeBlankLine()]);
            setDescription("");
            setTimeout(() => setSuccessMsg(""), 4000);
        } else {
            setError(res.error || "Terjadi kesalahan.");
        }
        setSubmitting(false);
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;
    }

    const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
    const totalItems = lines.filter(l => l.itemId).length;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Info */}
            <div className="glass p-5 rounded-xl border border-[#334155] space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft size={20} className="text-amber-400" />
                    Transfer Antar Gudang
                </h2>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-3">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {successMsg}
                    </div>
                )}

                {/* Warehouses */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Gudang Asal <span className="text-red-400">*</span></label>
                        <SearchableSelect
                            options={warehouses.map(w => ({ value: w.id.toString(), label: w.name, subLabel: w.type }))}
                            value={sourceId}
                            onChange={handleSourceChange}
                            placeholder="Pilih gudang asal..."
                            required
                            accentColor="amber"
                            icon={<Building2 size={14} />}
                        />
                    </div>
                    <div className="hidden sm:flex pb-3 justify-center text-slate-500">
                        <ArrowRightLeft size={20} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Gudang Tujuan <span className="text-red-400">*</span></label>
                        <SearchableSelect
                            options={warehouses.filter(w => w.id.toString() !== sourceId).map(w => ({ value: w.id.toString(), label: w.name, subLabel: w.type }))}
                            value={targetId}
                            onChange={setTargetId}
                            placeholder="Pilih gudang tujuan..."
                            required
                            accentColor="amber"
                            icon={<Building2 size={14} />}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Keterangan (Opsional)</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 min-h-[60px] text-sm"
                        placeholder="Contoh: Transfer stok untuk proyek XYZ"
                    />
                </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Package size={16} className="text-amber-400" />
                        Daftar Barang Transfer
                        {totalItems > 0 && (
                            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                {totalItems} item · {totalQty} unit
                            </span>
                        )}
                    </h3>
                    <button
                        type="button"
                        onClick={addLine}
                        className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus size={14} /> Tambah Barang
                    </button>
                </div>

                {lines.map((line, idx) => {
                    const selectedItem = items.find(i => i.id.toString() === line.itemId);
                    const requiresSN = selectedItem?.hasSN || false;
                    const filteredSNs = line.availableSNs.filter(
                        sn => !line.serialNumbers.includes(sn.code) &&
                            (line.snSearchFilter.trim() === "" || sn.code.toLowerCase().includes(line.snSearchFilter.toLowerCase()))
                    );

                    return (
                        <div key={line.uid} className="glass rounded-xl border border-[#334155] overflow-hidden">
                            {/* Line Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-[#334155]">
                                <span className="text-sm font-medium text-slate-400">
                                    Barang #{idx + 1}
                                    {selectedItem && (
                                        <span className="ml-2 text-white font-semibold">{selectedItem.code} – {selectedItem.name}</span>
                                    )}
                                </span>
                                {lines.length > 1 && (
                                    <button type="button" onClick={() => removeLine(line.uid)}
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
                                {/* Left: Item + Qty */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-400">Pilih Barang <span className="text-red-400">*</span></label>
                                            <SearchableSelect
                                                options={items.map(i => ({ value: i.id.toString(), label: `${i.code} – ${i.name}` }))}
                                                value={line.itemId}
                                                onChange={val => handleItemChange(line.uid, val)}
                                                placeholder="Ketik kode atau nama..."
                                                accentColor="amber"
                                                icon={<Package size={12} />}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-400">Quantity <span className="text-red-400">*</span></label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={line.qty}
                                                onChange={e => updateLine(line.uid, { qty: Number(e.target.value) })}
                                                readOnly={requiresSN}
                                                className={`w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-amber-500 ${requiresSN ? "opacity-50 cursor-not-allowed" : ""}`}
                                            />
                                            {requiresSN && <p className="text-[10px] text-slate-500">Qty mengikuti scan SN</p>}
                                        </div>
                                    </div>

                                    {/* SN List */}
                                    {requiresSN && line.serialNumbers.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs text-slate-400 font-medium">SN Siap Transfer ({line.serialNumbers.length})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {line.serialNumbers.map(sn => (
                                                    <span key={sn} className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono px-2 py-0.5 rounded-md">
                                                        {sn}
                                                        <button type="button" onClick={() => removeSN(line.uid, sn)}
                                                            className="text-amber-400/60 hover:text-red-400 transition-colors ml-0.5">
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Scanner + Picker for SN items */}
                                {requiresSN && (
                                    <div className="border border-[#334155] rounded-lg overflow-hidden bg-slate-900/50">
                                        {/* Scanner Input */}
                                        <div className="p-3 border-b border-[#334155]">
                                            <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
                                                <ScanLine size={10} className="text-amber-400" /> Scan Barcode
                                            </p>
                                            <input
                                                type="text"
                                                disabled={!sourceId || line.isVerifying}
                                                value={line.currentScan}
                                                onChange={e => updateLine(line.uid, { currentScan: e.target.value })}
                                                onKeyDown={e => handleScanComplete(line.uid, e)}
                                                onFocus={() => setActiveLineUid(line.uid)}
                                                placeholder={sourceId ? "Scan S/N lalu Enter..." : "Pilih gudang asal dulu"}
                                                className="w-full bg-black/50 border border-amber-500/40 text-white rounded-md px-3 py-2 font-mono text-xs text-center focus:outline-none focus:border-amber-400 disabled:opacity-50"
                                            />
                                            {line.isVerifying && (
                                                <div className="flex items-center justify-center mt-2 gap-1 text-amber-400 text-xs">
                                                    <Loader2 size={12} className="animate-spin" /> Verifikasi...
                                                </div>
                                            )}
                                        </div>

                                        {/* SN Picker */}
                                        {sourceId && line.itemId && (
                                            <div>
                                                <button type="button"
                                                    onClick={() => updateLine(line.uid, { isPickerOpen: !line.isPickerOpen })}
                                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 transition-colors">
                                                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                                        <Hash size={10} className="text-amber-400" />
                                                        Pilih SN
                                                        <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[9px]">
                                                            {line.loadingSNs ? "..." : filteredSNs.length}
                                                        </span>
                                                    </span>
                                                    {line.isPickerOpen ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                                                </button>

                                                {line.isPickerOpen && (
                                                    <div>
                                                        <div className="px-2 py-1.5 border-t border-[#334155]/50">
                                                            <div className="relative">
                                                                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                                                                <input
                                                                    type="text"
                                                                    value={line.snSearchFilter}
                                                                    onChange={e => updateLine(line.uid, { snSearchFilter: e.target.value })}
                                                                    placeholder="Filter SN..."
                                                                    className="w-full bg-black/30 border border-[#334155]/50 text-white rounded pl-6 pr-2 py-1 text-[10px] font-mono placeholder:text-slate-600 focus:outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[160px] overflow-y-auto">
                                                            {line.loadingSNs ? (
                                                                <div className="flex justify-center py-4">
                                                                    <Loader2 size={12} className="animate-spin text-slate-400" />
                                                                </div>
                                                            ) : filteredSNs.length === 0 ? (
                                                                <div className="text-center py-4 text-slate-600 text-[10px]">
                                                                    {line.availableSNs.length === 0 ? "Tidak ada SN tersedia" : "Semua SN dipilih"}
                                                                </div>
                                                            ) : (
                                                                filteredSNs.map(sn => (
                                                                    <button key={sn.id} type="button"
                                                                        onClick={() => addSNFromPicker(line.uid, sn.code)}
                                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-amber-500/10 border-b border-[#334155]/20 last:border-0 group">
                                                                        <Hash size={9} className="text-slate-600 group-hover:text-amber-400 shrink-0" />
                                                                        <span className="font-mono text-[10px] text-slate-400 group-hover:text-white">{sn.code}</span>
                                                                        <CheckCircle2 size={10} className="ml-auto text-transparent group-hover:text-amber-400 shrink-0" />
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Submit */}
            <div className="flex justify-between items-center glass p-4 rounded-xl border border-[#334155]">
                <div className="text-sm text-slate-400">
                    {totalItems > 0 ? (
                        <span>
                            <span className="text-white font-semibold">{totalItems}</span> jenis barang ·{" "}
                            <span className="text-amber-400 font-semibold">{totalQty}</span> total unit
                        </span>
                    ) : (
                        <span>Belum ada barang dipilih</span>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={submitting || !sourceId || !targetId || sourceId === targetId || totalItems === 0}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {submitting ? "Memproses..." : `Proses Transfer`}
                </button>
            </div>
        </form>
    );
}
