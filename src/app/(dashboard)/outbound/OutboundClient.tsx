"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, ScanLine, X, Loader2, Save, AlertCircle, MapPin, UserCheck, Building2, Package, Search, ChevronDown, ChevronUp, Hash, CheckCircle2 } from "lucide-react";
import { createInstallation } from "@/app/actions/outbound";
import { checkSerialInWarehouse, getAvailableSNs } from "@/app/actions/transfer";
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect, getPops } from "@/app/actions/pop";
import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";
import SearchableSelect from "@/components/SearchableSelect";

export default function OutboundClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Lookups
    const [warehouses, setWarehouses] = useState<{ id: number; name: string; type: string }[]>([]);
    const [items, setItems] = useState<{ id: number; name: string; code: string; hasSN: boolean; }[]>([]);
    const [pops, setPops] = useState<{ id: number; name: string }[]>([]);

    // Form General
    const [sourceId, setSourceId] = useState("");
    const [selectedItemId, setSelectedItemId] = useState("");
    const [qty, setQty] = useState(1);
    const [installType, setInstallType] = useState<"POP" | "CUSTOMER">("POP");

    // Install Specific
    const [targetPopId, setTargetPopId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerLocation, setCustomerLocation] = useState("");
    const [techName1, setTechName1] = useState("");
    const [techName2, setTechName2] = useState("");
    const [description, setDescription] = useState("");

    // Barcode Scanning
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
        const [warehouseRes, itemRes, popRes] = await Promise.all([
            getWarehousesForSelect(),
            getItems(),
            getPops()
        ]);

        if (warehouseRes.success && warehouseRes.data) setWarehouses(warehouseRes.data as any);
        if (itemRes.success && itemRes.data) setItems(itemRes.data as any);
        if (popRes.success && popRes.data) setPops(popRes.data as any);

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

    // Load available SNs when warehouse + item changes
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

    // Filter available SNs (exclude already selected, and apply search)
    const filteredAvailableSNs = availableSNs.filter(sn => 
        !serialNumbers.includes(sn.code) &&
        (snSearchFilter.trim() === "" || sn.code.toLowerCase().includes(snSearchFilter.toLowerCase()))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!sourceId || !selectedItemId) {
            setError("Gudang Asal dan Barang wajib diisi");
            return;
        }

        if (installType === "POP" && !targetPopId) {
            setError("Pilih POP Tujuan.");
            return;
        }

        if (installType === "CUSTOMER" && !customerName) {
            setError("Nama Customer wajib diisi.");
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
            itemId: Number(selectedItemId),
            qty: qty,
            installType: installType,
            targetPopId: installType === "POP" ? Number(targetPopId) : undefined,
            targetCustomerName: installType === "CUSTOMER" ? customerName : undefined,
            targetCustomerLocation: customerLocation,
            techName1,
            techName2,
            description,
            serialNumbers,
        };

        const res = await createInstallation(payload as any);

        if (res.success) {
            setSuccessMsg("Pemasangan perangkat berhasil diproses.");
            // Reset Form Partially
            setSelectedItemId("");
            setQty(1);
            setDescription("");
            setCustomerName("");
            setCustomerLocation("");
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
                        <Upload size={20} className="text-rose-400" />
                        Form Pemasangan & Barang Keluar
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
                        {/* Section 1: Item & Source */}
                        <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">1</span>
                                Asal Barang Keluar
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Gudang Asal <span className="text-red-400">*</span></label>
                                    <SearchableSelect
                                        options={warehouses.map(w => ({ value: w.id.toString(), label: w.name, subLabel: w.type }))}
                                        value={sourceId}
                                        onChange={(val) => { setSourceId(val); setSerialNumbers([]); }}
                                        placeholder="Ketik nama gudang..."
                                        required
                                        accentColor="rose"
                                        icon={<Building2 size={14} />}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Pilih Barang <span className="text-red-400">*</span></label>
                                    <SearchableSelect
                                        options={items.map(i => ({ value: i.id.toString(), label: `${i.code} - ${i.name}` }))}
                                        value={selectedItemId}
                                        onChange={(val) => { setSelectedItemId(val); setSerialNumbers([]); }}
                                        placeholder="Ketik kode atau nama barang..."
                                        required
                                        accentColor="rose"
                                        icon={<Package size={14} />}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Destination */}
                        <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">2</span>
                                Tujuan Pemasangan
                            </h3>

                            <div className="flex gap-4 mb-4">
                                <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border ${installType === 'POP' ? 'border-rose-500 bg-rose-500/10 text-rose-300' : 'border-slate-700 hover:bg-slate-800/50 text-slate-400'}`}>
                                    <input type="radio" name="installType" value="POP" checked={installType === 'POP'} onChange={() => setInstallType("POP")} className="hidden" />
                                    <MapPin size={18} /> Instalasi POP
                                </label>
                                <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border ${installType === 'CUSTOMER' ? 'border-rose-500 bg-rose-500/10 text-rose-300' : 'border-slate-700 hover:bg-slate-800/50 text-slate-400'}`}>
                                    <input type="radio" name="installType" value="CUSTOMER" checked={installType === 'CUSTOMER'} onChange={() => setInstallType("CUSTOMER")} className="hidden" />
                                    <UserCheck size={18} /> Instalasi Customer
                                </label>
                            </div>

                            {installType === "POP" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-sm font-medium text-slate-300">Target POP <span className="text-red-400">*</span></label>
                                    <SearchableSelect
                                        options={pops.map(p => ({ value: p.id.toString(), label: p.name }))}
                                        value={targetPopId}
                                        onChange={setTargetPopId}
                                        placeholder="Ketik nama POP..."
                                        required={installType === "POP"}
                                        accentColor="rose"
                                        icon={<MapPin size={14} />}
                                    />
                                </div>
                            )}

                            {installType === "CUSTOMER" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Nama Customer <span className="text-red-400">*</span></label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                            required={installType === "CUSTOMER"}
                                            placeholder="PT. Maju Mundur"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Lokasi / Alamat</label>
                                        <input
                                            type="text"
                                            value={customerLocation}
                                            onChange={(e) => setCustomerLocation(e.target.value)}
                                            className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                            placeholder="Gedung Cyber Lt 5..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 3: Detail Eksekusi */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">3</span>
                                Detail Pekerjaan
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Teknisi 1</label>
                                    <input
                                        type="text"
                                        value={techName1}
                                        onChange={(e) => setTechName1(e.target.value)}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                        placeholder="Nama Teknisi Utama"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Teknisi 2</label>
                                    <input
                                        type="text"
                                        value={techName2}
                                        onChange={(e) => setTechName2(e.target.value)}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                                        placeholder="Nama Teknisi Pendamping"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Quantity <span className="text-red-400">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) => setQty(Number(e.target.value))}
                                        readOnly={requiresSN} // ReadOnly if SN
                                        className={`w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 ${requiresSN ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        required
                                        placeholder="0"
                                    />
                                    {requiresSN && <p className="text-[10px] text-slate-500">Qty mengikuti scan SN</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Keterangan / SPK (Opsional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 min-h-[80px]"
                                    placeholder="Contoh: SPK L-1249/2026 Instalasi Radio Router"
                                ></textarea>
                            </div>
                        </div>


                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || (requiresSN && serialNumbers.length === 0) || !selectedItemId || !sourceId}
                                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Konfirmasi Instalasi ({qty} Unit)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* BARCODE SCANNER + SN PICKER SIDEBAR */}
            <div className={`glass rounded-xl border ${requiresSN ? 'border-rose-500/50 ring-1 ring-rose-500/20' : 'border-[#334155] opacity-50'} overflow-hidden flex flex-col relative transition-all`}>
                <div className="p-4 border-b border-[#334155] bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <ScanLine size={18} className={requiresSN ? 'text-rose-400' : 'text-slate-500'} />
                            Verifikasi Barcode
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {requiresSN ? "Scan atau pilih SN yang AKTIF di Gudang Asal" : "Barang non-SN"}
                        </p>
                    </div>
                    {isVerifying && <Loader2 className="animate-spin text-rose-500" size={16} />}
                </div>

                <div className="p-4 bg-slate-900/80">
                    <input
                        ref={scannerInputRef}
                        type="text"
                        disabled={!requiresSN || isVerifying || !sourceId}
                        value={currentScan}
                        onChange={(e) => setCurrentScan(e.target.value)}
                        onKeyDown={handleScanComplete}
                        placeholder={requiresSN ? (sourceId ? "Scan S/N Barang Instalasi..." : "Pilih Gudang Asal dulu") : "Scanner off"}
                        className={`w-full bg-black/50 border ${requiresSN ? 'border-rose-500/50 focus:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-[#334155]'} text-white rounded-lg px-4 py-3 font-mono text-center focus:outline-none transition-all disabled:opacity-50`}
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
                                <Hash size={12} className="text-rose-400" />
                                Pilih dari Daftar SN
                                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {loadingSNs ? '...' : filteredAvailableSNs.length}
                                </span>
                            </span>
                            {isPickerOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </button>

                        {isPickerOpen && (
                            <div className="bg-slate-900/30">
                                {/* Search filter */}
                                <div className="px-3 py-2 border-b border-[#334155]/50">
                                    <div className="relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={snSearchFilter}
                                            onChange={(e) => setSnSearchFilter(e.target.value)}
                                            placeholder="Filter serial number..."
                                            className="w-full bg-black/40 border border-[#334155]/50 text-white rounded-md pl-7 pr-3 py-1.5 text-[11px] font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500/40"
                                        />
                                    </div>
                                </div>

                                {/* SN List */}
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
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-rose-500/10 transition-colors border-b border-[#334155]/30 last:border-0 group"
                                            >
                                                <Hash size={11} className="text-slate-600 group-hover:text-rose-400 transition-colors shrink-0" />
                                                <span className="font-mono text-[11px] text-slate-300 group-hover:text-white transition-colors">{sn.code}</span>
                                                <CheckCircle2 size={12} className="ml-auto text-transparent group-hover:text-rose-400 transition-colors shrink-0" />
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
                        <span className="text-sm font-medium text-slate-300">Siap Instal:</span>
                        <span className="text-xs font-bold bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full">{serialNumbers.length} SN</span>
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
                                        <span className="font-mono text-rose-300">{sn}</span>
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
