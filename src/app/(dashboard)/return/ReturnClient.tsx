"use client";

import { useState, useEffect, useRef } from "react";
import { CornerDownLeft, ScanLine, X, Loader2, Save, AlertCircle, Building2, Package, Search, ChevronDown, ChevronUp, Hash, CheckCircle2, Plus, Trash2, MapPin, UserCheck } from "lucide-react";
import { createReturn } from "@/app/actions/return";
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect, getPops } from "@/app/actions/pop";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SearchableSelect from "@/components/SearchableSelect";

type CartItem = {
    id: string;
    itemId: string;
    itemName: string;
    itemCode: string;
    hasSN: boolean;
    qty: number;
    condition: "NEW" | "DISMANTLE" | "DAMAGED";
    serialNumbers: string[];
};

export default function ReturnClient() {
    const router = useRouter();
    const { data: session } = useSession();
    const userLevel = (session?.user as any)?.level || "";
    const userWarehouseId = (session?.user as any)?.warehouseId || null;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Lookups
    const [warehouses, setWarehouses] = useState<{ id: number; name: string; type: string }[]>([]);
    const [items, setItems] = useState<{ id: number; name: string; code: string; hasSN: boolean }[]>([]);
    const [pops, setPops] = useState<{ id: number; name: string }[]>([]);

    // Form General
    const [targetWarehouseId, setTargetWarehouseId] = useState("");
    const [returnSource, setReturnSource] = useState<"POP" | "CUSTOMER">("POP");
    const [sourcePopId, setSourcePopId] = useState("");
    const [sourceCustomerName, setSourceCustomerName] = useState("");
    const [techName, setTechName] = useState("");
    const [description, setDescription] = useState("");

    // Multi-item cart
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [activeCartIdx, setActiveCartIdx] = useState<number | null>(null);

    // Barcode scanning
    const [currentScan, setCurrentScan] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // Item adder
    const [addingItemId, setAddingItemId] = useState("");
    const [addingQty, setAddingQty] = useState(1);
    const [addingCondition, setAddingCondition] = useState<"NEW" | "DISMANTLE" | "DAMAGED">("DISMANTLE");

    const loadData = async () => {
        setLoading(true);
        const [warehouseRes, itemRes, popRes] = await Promise.all([
            getWarehousesForSelect(),
            getItems(),
            getPops()
        ]);

        if (warehouseRes.success && warehouseRes.data) {
            let wList = warehouseRes.data as any;
            if (userLevel !== "MASTER" && userWarehouseId) {
                wList = wList.filter((w: any) => w.id === userWarehouseId);
            }
            setWarehouses(wList);
            if (wList.length === 1) setTargetWarehouseId(String(wList[0].id));
        }
        if (itemRes.success && itemRes.data) setItems(itemRes.data as any);
        if (popRes.success && popRes.data) setPops(popRes.data as any);

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Active cart item
    const activeItem = activeCartIdx !== null ? cartItems[activeCartIdx] : null;
    const activeRequiresSN = activeItem?.hasSN || false;

    // Auto-focus scanner
    useEffect(() => {
        if (activeRequiresSN && scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, [activeRequiresSN, activeItem?.serialNumbers.length]);

    // Add item to cart
    const addItemToCart = () => {
        if (!addingItemId) return;

        const item = items.find(i => i.id.toString() === addingItemId);
        if (!item) return;

        const existing = cartItems.find(ci => ci.itemId === addingItemId);
        if (existing) {
            setError(`Barang "${item.name}" sudah ada di daftar.`);
            return;
        }

        const newCartItem: CartItem = {
            id: `${Date.now()}-${item.id}`,
            itemId: item.id.toString(),
            itemName: item.name,
            itemCode: item.code,
            hasSN: item.hasSN,
            qty: item.hasSN ? 0 : addingQty,
            condition: addingCondition,
            serialNumbers: [],
        };

        const newCart = [...cartItems, newCartItem];
        setCartItems(newCart);
        setActiveCartIdx(newCart.length - 1);
        setAddingItemId("");
        setAddingQty(1);
        setError("");
    };

    const removeCartItem = (idx: number) => {
        const newCart = cartItems.filter((_, i) => i !== idx);
        setCartItems(newCart);
        if (activeCartIdx === idx) {
            setActiveCartIdx(newCart.length > 0 ? 0 : null);
        } else if (activeCartIdx !== null && activeCartIdx > idx) {
            setActiveCartIdx(activeCartIdx - 1);
        }
    };

    const updateCartItemQty = (idx: number, newQty: number) => {
        const newCart = [...cartItems];
        if (!newCart[idx].hasSN) {
            newCart[idx].qty = newQty;
            setCartItems(newCart);
        }
    };

    const updateCartItemCondition = (idx: number, condition: "NEW" | "DISMANTLE" | "DAMAGED") => {
        const newCart = [...cartItems];
        newCart[idx].condition = condition;
        setCartItems(newCart);
    };

    // SN operations
    const handleScanComplete = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const scannedSN = currentScan.trim();
            if (!scannedSN || activeCartIdx === null) return;

            // Check duplicates across cart
            for (const ci of cartItems) {
                if (ci.serialNumbers.includes(scannedSN)) {
                    setError(`Serial Number ${scannedSN} sudah ada di daftar.`);
                    setCurrentScan("");
                    return;
                }
            }

            setIsVerifying(true);
            setError("");

            // For return, we just verify the SN exists in the system (it should be deployed)
            try {
                const { searchBySerialNumber } = await import("@/app/actions/master");
                const res = await searchBySerialNumber(scannedSN);

                if (res.success && res.data) {
                    const snData = res.data as any;
                    // Verify it belongs to the correct item
                    if (snData.itemId.toString() !== cartItems[activeCartIdx].itemId) {
                        setError(`SN ${scannedSN} bukan milik barang "${cartItems[activeCartIdx].itemName}".`);
                        setIsVerifying(false);
                        setCurrentScan("");
                        return;
                    }

                    const newCart = [...cartItems];
                    newCart[activeCartIdx].serialNumbers = [...newCart[activeCartIdx].serialNumbers, scannedSN];
                    newCart[activeCartIdx].qty = newCart[activeCartIdx].serialNumbers.length;
                    setCartItems(newCart);
                } else {
                    setError(`Serial Number ${scannedSN} tidak ditemukan di sistem.`);
                }
            } catch {
                setError("Gagal memverifikasi Serial Number.");
            }

            setIsVerifying(false);
            setCurrentScan("");
        }
    };

    const removeSNFromCart = (cartIdx: number, snToRemove: string) => {
        const newCart = [...cartItems];
        newCart[cartIdx].serialNumbers = newCart[cartIdx].serialNumbers.filter(sn => sn !== snToRemove);
        if (newCart[cartIdx].hasSN) {
            newCart[cartIdx].qty = newCart[cartIdx].serialNumbers.length;
        }
        setCartItems(newCart);
    };

    const totalQty = cartItems.reduce((sum, ci) => sum + ci.qty, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!targetWarehouseId) {
            setError("Gudang Tujuan wajib dipilih.");
            return;
        }

        if (cartItems.length === 0) {
            setError("Tambahkan minimal 1 barang ke daftar.");
            return;
        }

        if (returnSource === "POP" && !sourcePopId) {
            setError("Pilih POP Asal.");
            return;
        }

        if (returnSource === "CUSTOMER" && !sourceCustomerName) {
            setError("Nama Customer Asal wajib diisi.");
            return;
        }

        for (const ci of cartItems) {
            if (ci.qty <= 0) {
                setError(`Qty untuk "${ci.itemName}" harus lebih dari 0.`);
                return;
            }
            if (ci.hasSN && ci.serialNumbers.length !== ci.qty) {
                setError(`Barang "${ci.itemName}" membutuhkan Serial Number. Scan ${ci.serialNumbers.length} SN tapi Qty ${ci.qty}.`);
                return;
            }
        }

        setSubmitting(true);

        const payload = {
            targetWarehouseId: Number(targetWarehouseId),
            returnSource,
            sourcePopId: returnSource === "POP" ? Number(sourcePopId) : undefined,
            sourceCustomerName: returnSource === "CUSTOMER" ? sourceCustomerName : undefined,
            items: cartItems.map(ci => ({
                itemId: Number(ci.itemId),
                qty: ci.qty,
                condition: ci.condition,
                serialNumbers: ci.serialNumbers,
            })),
            techName,
            description,
        };

        const res = await createReturn(payload);

        if (res.success) {
            setSuccessMsg("Barang return berhasil diproses.");
            setCartItems([]);
            setActiveCartIdx(null);
            setDescription("");
            setSourceCustomerName("");
            setTechName("");
            setTimeout(() => setSuccessMsg(""), 4000);
        } else {
            setError(res.error || "Terjadi kesalahan");
        }

        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                <Loader2 size={20} className="animate-spin" /> Memuat data...
            </div>
        );
    }

    const CONDITION_OPTIONS = [
        { value: "NEW" as const, label: "Baru (New)", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
        { value: "DISMANTLE" as const, label: "Dismantle", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
        { value: "DAMAGED" as const, label: "Rusak (Damaged)", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-5">
            {/* Main form */}
            <div className="flex-1 bg-gradient-to-br from-[#0B1120] to-[#0F172A] rounded-2xl border border-[#1E293B] p-5 sm:p-6 shadow-xl">
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-sm flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError("")} className="ml-auto"><X size={14} /></button>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Source */}
                    <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                            <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">1</span>
                            Asal Barang Return
                        </h3>

                        <div className="flex gap-4 mb-4">
                            <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border ${returnSource === 'POP' ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-slate-700 hover:bg-slate-800/50 text-slate-400'}`}>
                                <input type="radio" name="returnSource" value="POP" checked={returnSource === 'POP'} onChange={() => setReturnSource("POP")} className="hidden" />
                                <MapPin size={18} /> Return dari POP
                            </label>
                            <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border ${returnSource === 'CUSTOMER' ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-slate-700 hover:bg-slate-800/50 text-slate-400'}`}>
                                <input type="radio" name="returnSource" value="CUSTOMER" checked={returnSource === 'CUSTOMER'} onChange={() => setReturnSource("CUSTOMER")} className="hidden" />
                                <UserCheck size={18} /> Return dari Customer
                            </label>
                        </div>

                        <div className="max-w-md">
                            {returnSource === "POP" ? (
                                <SearchableSelect
                                    options={pops.map(p => ({ value: p.id.toString(), label: p.name }))}
                                    value={sourcePopId}
                                    onChange={setSourcePopId}
                                    placeholder="Pilih POP Asal..."
                                    required
                                    accentColor="purple"
                                    icon={<MapPin size={14} />}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={sourceCustomerName}
                                    onChange={(e) => setSourceCustomerName(e.target.value)}
                                    placeholder="Nama Customer Asal"
                                    required
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm placeholder:text-slate-600"
                                />
                            )}
                        </div>
                    </div>

                    {/* Section 2: Target Warehouse */}
                    <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                            <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">2</span>
                            Gudang Tujuan
                        </h3>
                        <div className="max-w-md">
                            <SearchableSelect
                                options={warehouses.map(w => ({ value: w.id.toString(), label: w.name, subLabel: w.type }))}
                                value={targetWarehouseId}
                                onChange={setTargetWarehouseId}
                                placeholder="Ketik nama gudang..."
                                required
                                accentColor="purple"
                                icon={<Building2 size={14} />}
                            />
                        </div>
                    </div>

                    {/* Section 3: Cart items */}
                    <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                            <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">3</span>
                            Daftar Barang Return
                        </h3>

                        {/* Add item row */}
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-slate-500 mb-1 block">Tambah Barang</label>
                                <SearchableSelect
                                    options={items
                                        .filter(i => !cartItems.some(ci => ci.itemId === i.id.toString()))
                                        .map(i => ({ value: i.id.toString(), label: `${i.code} - ${i.name}`, subLabel: i.hasSN ? 'SN Required' : 'Non-SN' }))}
                                    value={addingItemId}
                                    onChange={setAddingItemId}
                                    placeholder="Cari barang..."
                                    accentColor="purple"
                                    icon={<Package size={14} />}
                                />
                            </div>
                            {addingItemId && !items.find(i => i.id.toString() === addingItemId)?.hasSN && (
                                <div className="w-24">
                                    <label className="text-xs text-slate-500 mb-1 block">Qty</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addingQty}
                                        onChange={(e) => setAddingQty(Number(e.target.value))}
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                    />
                                </div>
                            )}
                            <div className="w-40">
                                <label className="text-xs text-slate-500 mb-1 block">Kondisi</label>
                                <select
                                    value={addingCondition}
                                    onChange={(e) => setAddingCondition(e.target.value as any)}
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                >
                                    <option value="NEW">Baru (New)</option>
                                    <option value="DISMANTLE">Dismantle</option>
                                    <option value="DAMAGED">Rusak</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={addItemToCart}
                                disabled={!addingItemId}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors text-sm shrink-0"
                            >
                                <Plus size={16} /> Tambah
                            </button>
                        </div>

                        {/* Cart items table */}
                        {cartItems.length > 0 && (
                            <div className="rounded-xl border border-[#334155] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#020617] text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold">Barang</th>
                                            <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider font-semibold w-20">Qty</th>
                                            <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider font-semibold w-28">Kondisi</th>
                                            <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider font-semibold w-20">SN</th>
                                            <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider font-semibold w-20">Status</th>
                                            <th className="px-2 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#334155]/50">
                                        {cartItems.map((ci, idx) => {
                                            const isActive = activeCartIdx === idx;
                                            const isReady = ci.hasSN ? ci.serialNumbers.length > 0 && ci.serialNumbers.length === ci.qty : ci.qty > 0;
                                            const condOpt = CONDITION_OPTIONS.find(c => c.value === ci.condition);
                                            return (
                                                <tr
                                                    key={ci.id}
                                                    onClick={() => setActiveCartIdx(idx)}
                                                    className={`cursor-pointer transition-colors ${isActive ? 'bg-purple-500/[0.08] border-l-2 border-l-purple-500' : 'hover:bg-slate-800/50'}`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-white text-xs">{ci.itemName}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{ci.itemCode}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {ci.hasSN ? (
                                                            <span className="font-mono text-purple-300 font-bold">{ci.qty}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={ci.qty}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => updateCartItemQty(idx, Number(e.target.value))}
                                                                className="w-16 bg-[#0f172a] border border-[#334155] text-white rounded px-2 py-1 text-center text-xs focus:ring-1 focus:ring-purple-500"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <select
                                                            value={ci.condition}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => { e.stopPropagation(); updateCartItemCondition(idx, e.target.value as any); }}
                                                            className={`text-[10px] font-semibold px-2 py-1 rounded-full border bg-transparent ${condOpt?.color} ${condOpt?.bg}`}
                                                        >
                                                            <option value="NEW" className="bg-[#0f172a] text-white">Baru</option>
                                                            <option value="DISMANTLE" className="bg-[#0f172a] text-white">Dismantle</option>
                                                            <option value="DAMAGED" className="bg-[#0f172a] text-white">Rusak</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {ci.hasSN ? (
                                                            <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                                                                {ci.serialNumbers.length}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600 italic">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isReady ? (
                                                            <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />
                                                        ) : (
                                                            <span className="text-[10px] text-amber-400 font-semibold">
                                                                {ci.hasSN ? 'Scan SN' : 'Set Qty'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); removeCartItem(idx); }}
                                                            className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="bg-[#020617] px-4 py-2 flex justify-between items-center text-xs border-t border-[#334155]">
                                    <span className="text-slate-500">{cartItems.length} barang</span>
                                    <span className="font-bold text-purple-400">Total: {totalQty} unit</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Additional Info */}
                    <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                            <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">4</span>
                            Informasi Tambahan
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Nama Teknisi</label>
                                <input
                                    type="text"
                                    value={techName}
                                    onChange={(e) => setTechName(e.target.value)}
                                    placeholder="Nama teknisi..."
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm placeholder:text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Keterangan</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Catatan tambahan..."
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || cartItems.length === 0}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/30"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {submitting ? "Memproses..." : "Proses Return"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right sidebar - SN Scanner */}
            {activeRequiresSN && (
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-gradient-to-br from-[#0B1120] to-[#0F172A] rounded-2xl border border-[#1E293B] p-4 shadow-xl sticky top-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <ScanLine size={16} className="text-purple-400" />
                                Scan SN — {activeItem?.itemName}
                            </h4>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                                {activeItem?.serialNumbers.length || 0} SN
                            </span>
                        </div>

                        {/* Scanner input */}
                        <div className="relative">
                            <ScanLine size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                ref={scannerInputRef}
                                type="text"
                                value={currentScan}
                                onChange={(e) => setCurrentScan(e.target.value)}
                                onKeyDown={handleScanComplete}
                                placeholder="Scan / ketik SN, lalu Enter..."
                                disabled={isVerifying}
                                className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder:text-slate-600 disabled:opacity-50"
                            />
                            {isVerifying && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />}
                        </div>

                        {/* Scanned SN list */}
                        {activeItem && activeItem.serialNumbers.length > 0 && (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {activeItem.serialNumbers.map((sn, i) => (
                                    <div key={sn} className="flex items-center justify-between bg-[#1E293B]/60 rounded-lg px-3 py-2 group">
                                        <div className="flex items-center gap-2">
                                            <Hash size={10} className="text-slate-600" />
                                            <span className="text-xs font-mono text-slate-300">{sn}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSNFromCart(activeCartIdx!, sn)}
                                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-0.5"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
