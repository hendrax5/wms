"use client";

import { useState, useEffect, useRef } from "react";
import { AlertOctagon, ScanLine, X, Loader2, Save, AlertCircle } from "lucide-react";
import { createDamagedReport } from "@/app/actions/damaged";
import { checkSerialInWarehouse } from "@/app/actions/transfer"; // Reusing validation
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect } from "@/app/actions/pop";
import { useRouter } from "next/navigation";

export default function DamagedClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
    const [items, setItems] = useState<{ id: number; name: string; code: string; hasSN: boolean; }[]>([]);

    const [warehouseId, setWarehouseId] = useState("");
    const [selectedItemId, setSelectedItemId] = useState("");
    const [qty, setQty] = useState(1);
    const [description, setDescription] = useState("");

    // Barcode Scanning
    const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
    const [currentScan, setCurrentScan] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const scannerInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        const [warehouseRes, itemRes] = await Promise.all([
            getWarehousesForSelect(),
            getItems()
        ]);

        if (warehouseRes.success && warehouseRes.data) setWarehouses(warehouseRes.data as any);
        if (itemRes.success && itemRes.data) setItems(itemRes.data as any);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedItem = items.find(i => i.id.toString() === selectedItemId);
    const requiresSN = selectedItem?.hasSN || false;

    // Auto-focus logic for scanner
    useEffect(() => {
        if (requiresSN && warehouseId && scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, [requiresSN, serialNumbers.length, warehouseId]);

    const handleScanComplete = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const scannedSN = currentScan.trim();
            if (!scannedSN) return;

            if (!warehouseId) {
                setError("Pilih Gudang terlebih dahulu.");
                return;
            }

            if (serialNumbers.includes(scannedSN)) {
                setError(`Serial Number ${scannedSN} sudah ada di daftar.`);
                setCurrentScan("");
                return;
            }

            setIsVerifying(true);
            setError("");

            // Verify SN exists and is healthy in source warehouse
            const validRes = await checkSerialInWarehouse(scannedSN, Number(warehouseId), Number(selectedItemId));

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!warehouseId || !selectedItemId) {
            setError("Gudang dan Barang wajib diisi");
            return;
        }

        if (qty <= 0) {
            setError("Quantity harus lebih dari 0");
            return;
        }

        if (requiresSN && serialNumbers.length !== qty) {
            setError(`Barang ini membutuhkan Serial Number. Scan ${serialNumbers.length} SN, Qty ${qty}.`);
            return;
        }

        setSubmitting(true);

        const payload = {
            warehouseId: Number(warehouseId),
            itemId: Number(selectedItemId),
            qty: qty,
            description,
            serialNumbers,
        };

        const res = await createDamagedReport(payload);

        if (res.success) {
            setSuccessMsg("Barang berhasil dilaporkan rusak.");
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
                <div className="glass p-6 rounded-xl border border-red-900/50">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <AlertOctagon size={20} className="text-red-500" />
                        Laporan Barang Rusak
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

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Lokasi Gudang Barang <span className="text-red-400">*</span></label>
                                <select
                                    value={warehouseId}
                                    onChange={(e) => {
                                        setWarehouseId(e.target.value);
                                        setSerialNumbers([]);
                                    }}
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                    required
                                >
                                    <option value="" disabled>Pilih Gudang...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id.toString()}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Pilih Barang <span className="text-red-400">*</span></label>
                                <select
                                    value={selectedItemId}
                                    onChange={(e) => {
                                        setSelectedItemId(e.target.value);
                                        setSerialNumbers([]);
                                    }}
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                    required
                                >
                                    <option value="" disabled>Pilih Barang...</option>
                                    {items.map(i => (
                                        <option key={i.id} value={i.id.toString()}>{i.code} - {i.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Quantity Rusak <span className="text-red-400">*</span></label>
                            <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setQty(Number(e.target.value))}
                                readOnly={requiresSN}
                                className={`w-full md:w-1/2 bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-red-500 focus:border-red-500 ${requiresSN ? 'opacity-50 cursor-not-allowed' : ''}`}
                                required
                            />
                            {requiresSN && <p className="text-[10px] text-slate-500">Qty mengikuti hasil scan SN di sebelah kanan.</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Keterangan / Deskripsi Kerusakan <span className="text-red-400">*</span></label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
                                required
                                placeholder="Jelaskan detail masalah fisik atau hardware..."
                            ></textarea>
                        </div>


                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || (requiresSN && serialNumbers.length === 0) || !selectedItemId || !warehouseId}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Laporkan Rusak ({qty} Unit)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* BARCODE SCANNER SIDEBAR */}
            <div className={`glass rounded-xl border ${requiresSN ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-[#334155] opacity-50'} overflow-hidden flex flex-col h-[600px] relative transition-all`}>
                <div className="p-4 border-b border-[#334155] bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <ScanLine size={18} className={requiresSN ? 'text-red-400' : 'text-slate-500'} />
                            Scan Unit Rusak
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Hanya bisa scan barang yang ada di gudang.
                        </p>
                    </div>
                    {isVerifying && <Loader2 className="animate-spin text-red-500" size={16} />}
                </div>

                <div className="p-4 bg-slate-900/80">
                    <input
                        ref={scannerInputRef}
                        type="text"
                        disabled={!requiresSN || isVerifying || !warehouseId}
                        value={currentScan}
                        onChange={(e) => setCurrentScan(e.target.value)}
                        onKeyDown={handleScanComplete}
                        placeholder={requiresSN ? (warehouseId ? "Scan S/N..." : "Pilih Gudang Asal") : "Scanner off"}
                        className={`w-full bg-black/50 border ${requiresSN ? 'border-red-500/50 focus:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-[#334155]'} text-white rounded-lg px-4 py-3 font-mono text-center focus:outline-none transition-all disabled:opacity-50`}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/30">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-sm font-medium text-slate-300">SN Konfirmasi Rusak:</span>
                        <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">{serialNumbers.length} SN</span>
                    </div>

                    <div className="space-y-2">
                        {serialNumbers.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border border-dashed border-[#334155] rounded-lg">
                                Belum ada scan
                            </div>
                        ) : (
                            serialNumbers.map((sn, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg text-sm group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-mono text-xs">{idx + 1}.</span>
                                        <span className="font-mono text-red-300">{sn}</span>
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
