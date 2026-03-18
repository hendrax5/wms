"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRightLeft, ScanLine, X, Loader2, Save, AlertCircle, Building2, Package, Search, ChevronDown, ChevronUp, Hash, CheckCircle2 } from "lucide-react";
import { createTransfer, checkSerialInWarehouse, getAvailableSNs } from "@/app/actions/transfer";
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect } from "@/app/actions/pop";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

export default function TransferClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Form Data
    const [warehouses, setWarehouses] = useState<{ id: number; name: string; type: string }[]>([]);
    const [items, setItems] = useState<{ id: number; name: string; code: string; hasSN: boolean; }[]>([]);

    const [sourceId, setSourceId] = useState("");
    const [targetId, setTargetId] = useState("");
    const [selectedItemId, setSelectedItemId] = useState("");
    const [qty, setQty] = useState(1);
    const [description, setDescription] = useState("");

    // Barcode Scanning State
    const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
    const [currentScan, setCurrentScan] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // SN Picker
    const [availableSNs, setAvailableSNs] = useState<{ id: number; code: string }[]>([]);
    const [loadingSNs, setLoadingSNs] = useState(false);
    const [snSearchFilter, setSnSearchFilter] = useState("");
    const [isPickerOpen, setIsPickerOpen] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const [warehouseRes, itemRes] = await Promise.all([
            getWarehousesForSelect(),
            getItems()
        ]);

        if (warehouseRes.success && warehouseRes.data) {
            setWarehouses(warehouseRes.data as any);
        }
        if (itemRes.success && itemRes.data) {
            setItems(itemRes.data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedItem = items.find(i => i.id.toString() === selectedItemId);
    const requiresSN = selectedItem?.hasSN || false;

    // Auto-focus logic for scanner
    useEffect(() => {
        if (requiresSN && sourceId && scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, [requiresSN, serialNumbers.length, sourceId]);

    // Load available SNs when source warehouse + item changes
    useEffect(() => {
        if (sourceId && selectedItemId && requiresSN) {
            setLoadingSNs(true);
            getAvailableSNs(Number(sourceId), Number(selectedItemId)).then(res => {
                if (res.success && res.data) {
                    setAvailableSNs(res.data as any);
                } else {
                    setAvailableSNs([]);
                }
                setLoadingSNs(false);
            });
        } else {
            setAvailableSNs([]);
        }
    }, [sourceId, selectedItemId, requiresSN]);

    const handleScanComplete = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const scannedSN = currentScan.trim();
            if (!scannedSN) return;

            if (!sourceId) {
                setError("Pilih Gudang Asal terlebih dahulu sebelum scan barcode.");
                return;
            }

            if (serialNumbers.includes(scannedSN)) {
                setError(`Serial Number ${scannedSN} sudah ada di daftar.`);
                setCurrentScan("");
                return;
            }

            setIsVerifying(true);
            setError("");

            // Verifikasi bahwa SN benar-benar ada di gudang asal
            const validRes = await checkSerialInWarehouse(scannedSN, Number(sourceId), Number(selectedItemId));

            if (validRes.success) {
                const newSNs = [...serialNumbers, scannedSN];
                setSerialNumbers(newSNs);
                if (requiresSN) {
                    setQty(newSNs.length);
                }
            } else {
                setError(validRes.error || "Gagal verifikasi SN.");
            }

            setIsVerifying(false);
            setCurrentScan("");
        }
    };

    const removeSN = (snToRemove: string) => {
        const newSNs = serialNumbers.filter(sn => sn !== snToRemove);
        setSerialNumbers(newSNs);
        if (requiresSN) {
            setQty(newSNs.length);
        }
    };

    const addSNFromPicker = (snCode: string) => {
        if (serialNumbers.includes(snCode)) return;
        const newSNs = [...serialNumbers, snCode];
        setSerialNumbers(newSNs);
        if (requiresSN) {
            setQty(newSNs.length);
        }
    };

    const filteredAvailableSNs = availableSNs.filter(sn =>
        !serialNumbers.includes(sn.code) &&
        (snSearchFilter.trim() === "" || sn.code.toLowerCase().includes(snSearchFilter.toLowerCase()))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!sourceId || !targetId || !selectedItemId) {
            setError("Gudang Asal, Gudang Tujuan, dan Barang wajib diisi");
            return;
        }

        if (sourceId === targetId) {
            setError("Gudang Asal dan Tujuan tidak boleh sama.");
            return;
        }

        if (qty <= 0) {
            setError("Quantity harus lebih dari 0");
            return;
        }

        if (requiresSN && serialNumbers.length !== qty) {
            setError(`Barang ini membutuhkan Serial Number. Anda men-scan ${serialNumbers.length} SN, tetapi Qty diatur ke ${qty}. Jumlah harus sama.`);
            return;
        }

        setSubmitting(true);

        const payload = {
            sourceWarehouseId: Number(sourceId),
            targetWarehouseId: Number(targetId),
            itemId: Number(selectedItemId),
            qty: qty,
            description: description,
            serialNumbers: serialNumbers
        };

        const res = await createTransfer(payload);

        if (res.success) {
            setSuccessMsg("Transfer stok berhasil diproses.");
            // Reset Form Partially
            setSelectedItemId("");
            setQty(1);
            setDescription("");
            setSerialNumbers([]);
            setTimeout(() => setSuccessMsg(""), 4000);
        } else {
            setError(res.error || "Terjadi kesalahan");
        }

        setSubmitting(false);
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="glass p-6 rounded-xl border border-[#334155]">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <ArrowRightLeft size={20} className="text-amber-400" />
                        Detail Transfer Antar Gudang
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-3">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-5">
                            {/* Source */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Gudang Asal <span className="text-red-400">*</span></label>
                                <SearchableSelect
                                    options={warehouses.map(w => ({ value: w.id.toString(), label: w.name, subLabel: w.type }))}
                                    value={sourceId}
                                    onChange={(val) => { setSourceId(val); setSerialNumbers([]); }}
                                    placeholder="Ketik nama gudang asal..."
                                    required
                                    accentColor="amber"
                                    icon={<Building2 size={14} />}
                                />
                            </div>

                            <div className="hidden sm:flex pb-3 justify-center text-slate-500">
                                <ArrowRightLeft size={20} />
                            </div>

                            {/* Target */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Gudang Tujuan <span className="text-red-400">*</span></label>
                                <SearchableSelect
                                    options={warehouses.map(w => ({ value: w.id.toString(), label: w.name, subLabel: w.type }))}
                                    value={targetId}
                                    onChange={setTargetId}
                                    placeholder="Ketik nama gudang tujuan..."
                                    required
                                    accentColor="amber"
                                    icon={<Building2 size={14} />}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Pilih Barang yang Dikirim <span className="text-red-400">*</span></label>
                                <SearchableSelect
                                    options={items.map(i => ({ value: i.id.toString(), label: `${i.code} - ${i.name}` }))}
                                    value={selectedItemId}
                                    onChange={(val) => { setSelectedItemId(val); setSerialNumbers([]); }}
                                    placeholder="Ketik kode atau nama barang..."
                                    required
                                    accentColor="amber"
                                    icon={<Package size={14} />}
                                />
                                {selectedItem && (
                                    <p className="text-xs text-amber-400">
                                        Stok akan dikurangi dari {warehouses.find(w => w.id.toString() === sourceId)?.name || 'Gudang Asal'}.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Quantity <span className="text-red-400">*</span></label>
                                <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(e) => setQty(Number(e.target.value))}
                                    readOnly={requiresSN} // ReadOnly if SN
                                    className={`w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 ${requiresSN ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    required
                                    placeholder="0"
                                />
                                {requiresSN && <p className="text-[10px] text-slate-500">Qty mengikuti total scan SN</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Keterangan / Alasan Transfer (Opsional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 min-h-[80px]"
                                placeholder="Contoh: Permintaan stok untuk instalasi proyek XYZ"
                            ></textarea>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || (requiresSN && serialNumbers.length === 0) || !selectedItemId || !sourceId || !targetId || sourceId === targetId}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
                                Proses Transfer ({qty} Unit)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* BARCODE SCANNER + SN PICKER SIDEBAR */}
            <div className={`glass rounded-xl border ${requiresSN ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-[#334155] opacity-50'} overflow-hidden flex flex-col relative transition-all`}>
                <div className="p-4 border-b border-[#334155] bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <ScanLine size={18} className={requiresSN ? 'text-amber-400' : 'text-slate-500'} />
                            Verifikasi Barcode
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {requiresSN ? "Scan atau pilih SN yang AKTIF di Gudang Asal" : "Barang non-SN"}
                        </p>
                    </div>
                    {isVerifying && <Loader2 className="animate-spin text-amber-500" size={16} />}
                </div>

                <div className="p-4 bg-slate-900/80">
                    <input
                        ref={scannerInputRef}
                        type="text"
                        disabled={!requiresSN || isVerifying || !sourceId}
                        value={currentScan}
                        onChange={(e) => setCurrentScan(e.target.value)}
                        onKeyDown={handleScanComplete}
                        placeholder={requiresSN ? (sourceId ? "Scan S/N Barang Transfer..." : "Pilih Gudang Asal dulu") : "Scanner off"}
                        className={`w-full bg-black/50 border ${requiresSN ? 'border-amber-500/50 focus:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-[#334155]'} text-white rounded-lg px-4 py-3 font-mono text-center focus:outline-none transition-all disabled:opacity-50`}
                    />
                </div>

                {/* SN PICKER - Available SNs */}
                {requiresSN && sourceId && selectedItemId && (
                    <div className="border-t border-[#334155]">
                        <button
                            type="button"
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/60 hover:bg-slate-800/60 transition-colors"
                        >
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                                <Hash size={12} className="text-amber-400" />
                                Pilih dari Daftar SN
                                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {loadingSNs ? '...' : filteredAvailableSNs.length}
                                </span>
                            </span>
                            {isPickerOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </button>

                        {isPickerOpen && (
                            <div className="bg-slate-900/30">
                                <div className="px-3 py-2 border-b border-[#334155]/50">
                                    <div className="relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={snSearchFilter}
                                            onChange={(e) => setSnSearchFilter(e.target.value)}
                                            placeholder="Filter serial number..."
                                            className="w-full bg-black/40 border border-[#334155]/50 text-white rounded-md pl-7 pr-3 py-1.5 text-[11px] font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {loadingSNs ? (
                                        <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-xs">
                                            <Loader2 size={14} className="animate-spin" /> Memuat SN...
                                        </div>
                                    ) : filteredAvailableSNs.length === 0 ? (
                                        <div className="text-center py-4 text-slate-600 text-[11px]">
                                            {availableSNs.length === 0 ? 'Tidak ada SN tersedia' : 'Semua SN sudah dipilih'}
                                        </div>
                                    ) : (
                                        filteredAvailableSNs.map(sn => (
                                            <button
                                                key={sn.id}
                                                type="button"
                                                onClick={() => addSNFromPicker(sn.code)}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-amber-500/10 transition-colors border-b border-[#334155]/30 last:border-0 group"
                                            >
                                                <Hash size={11} className="text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
                                                <span className="font-mono text-[11px] text-slate-300 group-hover:text-white transition-colors">{sn.code}</span>
                                                <CheckCircle2 size={12} className="ml-auto text-transparent group-hover:text-amber-400 transition-colors shrink-0" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SELECTED SN LIST */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/30 border-t border-[#334155]">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-sm font-medium text-slate-300">Siap Transfer:</span>
                        <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full">{serialNumbers.length} SN</span>
                    </div>

                    <div className="space-y-2">
                        {serialNumbers.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border border-dashed border-[#334155] rounded-lg text-xs">
                                Scan barcode atau pilih SN dari daftar di atas
                            </div>
                        ) : (
                            serialNumbers.map((sn, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg text-sm group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-mono text-xs">{idx + 1}.</span>
                                        <span className="font-mono text-amber-300">{sn}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSN(sn)}
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {!requiresSN && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] z-10"></div>
                )}
            </div>
        </div>
    );
}
