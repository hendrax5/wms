"use client";

import { useState, useEffect, useRef } from "react";
import { Package, ScanLine, X, Loader2, Save, AlertCircle, Building2 } from "lucide-react";
import { createStockIn } from "@/app/actions/inbound";
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect } from "@/app/actions/pop";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

export default function InboundClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Form Data
    const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
    const [items, setItems] = useState<{ id: number; name: string; code: string; hasSN: boolean; category: { name: string } | null }[]>([]);

    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const [selectedItemId, setSelectedItemId] = useState("");
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [description, setDescription] = useState("");

    // Barcode Scanning State
    const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
    const [currentScan, setCurrentScan] = useState("");
    const scannerInputRef = useRef<HTMLInputElement>(null);

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
        if (requiresSN && scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, [requiresSN, serialNumbers.length]);

    const handleScanComplete = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const scannedSN = currentScan.trim();
            if (scannedSN) {
                if (serialNumbers.includes(scannedSN)) {
                    setError(`Serial Number ${scannedSN} sudah di-scan.`);
                } else {
                    setSerialNumbers([...serialNumbers, scannedSN]);
                    if (requiresSN) {
                        setQty(serialNumbers.length + 1); // Auto adjust QTY if using SN
                    }
                    setError("");
                }
                setCurrentScan("");
            }
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

        if (!selectedWarehouseId || !selectedItemId) {
            setError("Gudang dan Barang wajib dipilih");
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
        const totalPrice = price * qty;

        const payload = {
            warehouseId: Number(selectedWarehouseId),
            itemId: Number(selectedItemId),
            qty: qty,
            price: price,
            totalPrice: totalPrice,
            description: description,
            serialNumbers: serialNumbers
        };

        const res = await createStockIn(payload);

        if (res.success) {
            setSuccessMsg("Barang Masuk berhasil dicatat.");
            // Reset Form
            setSelectedItemId("");
            setQty(1);
            setPrice(0);
            setDescription("");
            setSerialNumbers([]);
            setTimeout(() => setSuccessMsg(""), 3000);
            // Optionally redirect
            // router.push("/stock");
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
                        <Package size={20} className="text-blue-400" />
                        Form Barang Masuk
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Gudang / Cabang Tujuan <span className="text-red-400">*</span></label>
                                <SearchableSelect
                                    options={warehouses.map(w => ({ value: w.id.toString(), label: w.name }))}
                                    value={selectedWarehouseId}
                                    onChange={setSelectedWarehouseId}
                                    placeholder="Ketik nama gudang..."
                                    required
                                    accentColor="blue"
                                    icon={<Building2 size={14} />}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Pilih Barang <span className="text-red-400">*</span></label>
                                <SearchableSelect
                                    options={items.map(i => ({ value: i.id.toString(), label: `${i.code} - ${i.name}`, subLabel: i.category?.name || undefined }))}
                                    value={selectedItemId}
                                    onChange={(val) => { setSelectedItemId(val); setSerialNumbers([]); }}
                                    placeholder="Ketik kode atau nama barang..."
                                    required
                                    accentColor="blue"
                                    icon={<Package size={14} />}
                                />
                                {selectedItem && (
                                    <p className="text-xs text-blue-400">
                                        Status: {selectedItem.hasSN ? "Wajib Serial Number (SN)" : "Tanpa Serial Number (Non-SN)"}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Quantity <span className="text-red-400">*</span></label>
                                <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(e) => setQty(Number(e.target.value))}
                                    readOnly={requiresSN} // ReadOnly if SN, it auto calculated based on scan count
                                    className={`w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${requiresSN ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    required
                                    placeholder="0"
                                />
                                {requiresSN && <p className="text-[10px] text-slate-500">Qty dihitung otomatis dari jumlah scan SN</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Harga Satuan (Opsional)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-500">Rp</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={price || ''}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg pl-12 pr-4 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Keterangan Tambahan / Nomor PO (Opsional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                                placeholder="Contoh: PO-2026-001 dari Supplier X"
                            ></textarea>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || (requiresSN && serialNumbers.length === 0) || !selectedItemId || !selectedWarehouseId}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Simpan Transaksi ({qty} Unit)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* BARCODE SCANNER SIDEBAR */}
            <div className={`glass rounded-xl border ${requiresSN ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-[#334155] opacity-50'} overflow-hidden flex flex-col h-[600px] relative transition-all`}>
                <div className="p-4 border-b border-[#334155] bg-slate-900/50">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <ScanLine size={18} className={requiresSN ? 'text-blue-400' : 'text-slate-500'} />
                        Barcode Scanner
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {requiresSN ? "Arahkan kursor ke kotak bawah dan scan barcode SN." : "Pilih barang dengan spesifikasi SN terlebih dahulu."}
                    </p>
                </div>

                <div className="p-4 bg-slate-900/80">
                    <input
                        ref={scannerInputRef}
                        type="text"
                        disabled={!requiresSN}
                        value={currentScan}
                        onChange={(e) => setCurrentScan(e.target.value)}
                        onKeyDown={handleScanComplete}
                        placeholder={requiresSN ? "Menunggu scan barcode..." : "Scanner dinonaktifkan"}
                        className={`w-full bg-black/50 border ${requiresSN ? 'border-blue-500/50 focus:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-[#334155]'} text-white rounded-lg px-4 py-3 font-mono text-center focus:outline-none transition-all`}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/30">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-sm font-medium text-slate-300">Hasil Scan:</span>
                        <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full">{serialNumbers.length} SN</span>
                    </div>

                    <div className="space-y-2">
                        {serialNumbers.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border border-dashed border-[#334155] rounded-lg">
                                Belum ada SN yang di-scan
                            </div>
                        ) : (
                            serialNumbers.map((sn, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg text-sm group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-mono text-xs">{idx + 1}.</span>
                                        <span className="font-mono text-blue-300">{sn}</span>
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
