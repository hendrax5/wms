"use client";

import { useState, useEffect, useRef } from "react";
import { Package, ScanLine, X, Loader2, Save, AlertCircle, Building2, Plus, Trash2, CheckCircle2, Download } from "lucide-react";
import { createStockIn } from "@/app/actions/inbound";
import { getItems } from "@/app/actions/item";
import { getWarehousesForSelect } from "@/app/actions/pop";
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
    price: number;
    serialNumbers: string[];
};

export default function InboundClient() {
    const router = useRouter();
    const { data: session } = useSession();
    const userLevel = (session?.user as any)?.level || "";
    const userWarehouseId = (session?.user as any)?.warehouseId || null;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Lookups
    const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
    const [items, setItems] = useState<{ id: number; name: string; code: string; hasSN: boolean; category: { name: string } | null }[]>([]);

    // Form General
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const [description, setDescription] = useState("");

    // Multi-item cart
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [activeCartIdx, setActiveCartIdx] = useState<number | null>(null);

    // Barcode Scanning for active cart item
    const [currentScan, setCurrentScan] = useState("");
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // Item adder
    const [addingItemId, setAddingItemId] = useState("");
    const [addingQty, setAddingQty] = useState(1);
    const [addingPrice, setAddingPrice] = useState(0);

    const loadData = async () => {
        setLoading(true);
        const [warehouseRes, itemRes] = await Promise.all([
            getWarehousesForSelect(),
            getItems()
        ]);

        if (warehouseRes.success && warehouseRes.data) {
            let wList = warehouseRes.data as any;
            if (userLevel !== "MASTER" && userWarehouseId) {
                wList = wList.filter((w: any) => w.id === userWarehouseId);
            }
            setWarehouses(wList);
            if (wList.length === 1) setSelectedWarehouseId(String(wList[0].id));
        }
        if (itemRes.success && itemRes.data) setItems(itemRes.data as any);
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
            price: addingPrice,
            serialNumbers: [],
        };

        const newCart = [...cartItems, newCartItem];
        setCartItems(newCart);
        setActiveCartIdx(newCart.length - 1);
        setAddingItemId("");
        setAddingQty(1);
        setAddingPrice(0);
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

    const updateCartItemPrice = (idx: number, newPrice: number) => {
        const newCart = [...cartItems];
        newCart[idx].price = newPrice;
        setCartItems(newCart);
    };

    // SN scanning for active cart item
    const handleScanComplete = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const scannedSN = currentScan.trim();
            if (!scannedSN || activeCartIdx === null) return;

            const cart = cartItems[activeCartIdx];
            if (cart.serialNumbers.includes(scannedSN)) {
                setError(`Serial Number ${scannedSN} sudah di-scan.`);
                setCurrentScan("");
                return;
            }

            // Check other cart items too
            for (const ci of cartItems) {
                if (ci.serialNumbers.includes(scannedSN)) {
                    setError(`Serial Number ${scannedSN} sudah digunakan di barang "${ci.itemName}".`);
                    setCurrentScan("");
                    return;
                }
            }

            const newCart = [...cartItems];
            newCart[activeCartIdx].serialNumbers = [...cart.serialNumbers, scannedSN];
            newCart[activeCartIdx].qty = newCart[activeCartIdx].serialNumbers.length;
            setCartItems(newCart);
            setCurrentScan("");
            setError("");
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
    const totalPrice = cartItems.reduce((sum, ci) => sum + (ci.price * ci.qty), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!selectedWarehouseId) {
            setError("Gudang Tujuan wajib dipilih.");
            return;
        }

        if (cartItems.length === 0) {
            setError("Tambahkan minimal 1 barang ke daftar.");
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
            warehouseId: Number(selectedWarehouseId),
            items: cartItems.map(ci => ({
                itemId: Number(ci.itemId),
                qty: ci.qty,
                price: ci.price,
                serialNumbers: ci.serialNumbers,
            })),
            description,
        };

        const res = await createStockIn(payload as any);

        if (res.success) {
            setSuccessMsg("Barang Masuk berhasil dicatat.");
            setCartItems([]);
            setActiveCartIdx(null);
            setDescription("");
            setTimeout(() => setSuccessMsg(""), 4000);
        } else {
            setError(res.error || "Terjadi kesalahan");
        }

        setSubmitting(false);
    };

    // Print Bukti Masuk
    const printBuktiMasuk = () => {
        const wh = warehouses.find(w => w.id.toString() === selectedWarehouseId)?.name || '-';
        const now = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

        const itemRows = cartItems.map((ci, idx) => {
            const snList = ci.serialNumbers.length > 0
                ? ci.serialNumbers.map((sn, i) => `${i + 1}. ${sn}`).join('<br/>')
                : '<i style="color:#999">Tanpa SN</i>';
            return `<tr>
                <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
                <td style="border:1px solid #ddd;padding:8px">[${ci.itemCode}] ${ci.itemName}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:center">${ci.qty}</td>
                <td style="border:1px solid #ddd;padding:8px;font-family:monospace;font-size:11px">${snList}</td>
            </tr>`;
        }).join('');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow) {
            printWindow.document.write(`
                <html><head><title>Bukti Penerimaan Barang</title>
                <style>body{font-family:Arial,sans-serif;padding:30px;color:#333}h1{font-size:20px;margin:0}h2{font-size:14px;color:#666;margin:4px 0 20px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.info-item{padding:8px 12px;background:#f8f9fa;border-radius:4px}.info-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:700}.info-value{font-size:13px;margin-top:2px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#f1f5f9;border:1px solid #ddd;padding:8px;font-size:11px;text-transform:uppercase;text-align:left}td{font-size:12px;vertical-align:top}.footer{margin-top:50px;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;font-size:12px}.footer div{padding-top:60px;border-top:1px solid #ccc;margin-top:10px}@media print{body{padding:15px}}</style>
                </head><body>
                <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:10px">
                    <h1>BUKTI PENERIMAAN BARANG</h1>
                    <h2>${now}</h2>
                </div>
                <div class="info-grid">
                    <div class="info-item"><div class="info-label">Gudang Tujuan</div><div class="info-value">${wh}</div></div>
                    <div class="info-item"><div class="info-label">Total Unit</div><div class="info-value">${totalQty} unit</div></div>
                    <div class="info-item"><div class="info-label">Keterangan</div><div class="info-value">${description || '-'}</div></div>
                </div>
                <h3 style="font-size:14px;margin-bottom:6px">Daftar Barang (${cartItems.length} item)</h3>
                <table>
                    <thead><tr>
                        <th style="width:40px">No</th>
                        <th>Barang</th>
                        <th style="width:60px">Qty</th>
                        <th>Serial Numbers</th>
                    </tr></thead>
                    <tbody>${itemRows}</tbody>
                </table>
                <div class="footer"><div>Pengirim</div><div>Penerima</div><div>Mengetahui</div></div>
                <script>setTimeout(()=>window.print(),300)</script>
                </body></html>
            `);
            printWindow.document.close();
        }
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

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Warehouse */}
                        <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">1</span>
                                Gudang Tujuan
                            </h3>
                            <div className="max-w-md">
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
                        </div>

                        {/* Section 2: Add Items to Cart */}
                        <div className="space-y-4 pb-4 border-b border-[#334155]/50">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">2</span>
                                Daftar Barang Masuk
                            </h3>

                            {/* Add item row */}
                            <div className="flex gap-3 items-end flex-wrap">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-xs text-slate-500 mb-1 block">Tambah Barang</label>
                                    <SearchableSelect
                                        options={items
                                            .filter(i => !cartItems.some(ci => ci.itemId === i.id.toString()))
                                            .map(i => ({ value: i.id.toString(), label: `${i.code} - ${i.name}`, subLabel: i.hasSN ? 'SN Required' : 'Non-SN' }))}
                                        value={addingItemId}
                                        onChange={setAddingItemId}
                                        placeholder="Cari barang..."
                                        accentColor="blue"
                                        icon={<Package size={14} />}
                                    />
                                </div>
                                {addingItemId && !items.find(i => i.id.toString() === addingItemId)?.hasSN && (
                                    <div className="w-20">
                                        <label className="text-xs text-slate-500 mb-1 block">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={addingQty}
                                            onChange={(e) => setAddingQty(Number(e.target.value))}
                                            className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={addItemToCart}
                                    disabled={!addingItemId}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors text-sm shrink-0"
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

                                                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider font-semibold w-16">SN</th>
                                                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider font-semibold w-20">Status</th>
                                                <th className="px-2 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#334155]/50">
                                            {cartItems.map((ci, idx) => {
                                                const isActive = activeCartIdx === idx;
                                                const isReady = ci.hasSN ? ci.serialNumbers.length > 0 && ci.serialNumbers.length === ci.qty : ci.qty > 0;
                                                return (
                                                    <tr
                                                        key={ci.id}
                                                        onClick={() => setActiveCartIdx(idx)}
                                                        className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-500/[0.08] border-l-2 border-l-blue-500' : 'hover:bg-slate-800/50'}`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-white text-xs">{ci.itemName}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono">{ci.itemCode} {ci.hasSN ? '• SN' : '• Non-SN'}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {ci.hasSN ? (
                                                                <span className="font-mono text-blue-300 font-bold">{ci.qty}</span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={ci.qty}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => updateCartItemQty(idx, Number(e.target.value))}
                                                                    className="w-16 bg-[#0f172a] border border-[#334155] text-white rounded px-2 py-1 text-center text-xs focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            )}
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
                                        <div className="flex gap-4">

                                            <span className="font-bold text-blue-400">Total: {totalQty} unit</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 3: Notes */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className="bg-slate-800 p-1.5 rounded-md text-slate-300">3</span>
                                Keterangan
                            </h3>
                            <div className="space-y-2">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                                    placeholder="Contoh: PO-2026-001 dari Supplier X"
                                ></textarea>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between items-center">
                            {cartItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={printBuktiMasuk}
                                    className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm"
                                >
                                    <Download size={16} /> Print Bukti Masuk
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={submitting || cartItems.length === 0 || !selectedWarehouseId || cartItems.some(ci => ci.qty <= 0 || (ci.hasSN && ci.serialNumbers.length === 0))}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors ml-auto"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Simpan Barang Masuk ({totalQty} Unit)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* BARCODE SCANNER SIDEBAR */}
            <div className={`glass rounded-xl border ${activeItem?.hasSN ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-[#334155] opacity-50'} overflow-hidden flex flex-col relative transition-all`}>
                <div className="p-4 border-b border-[#334155] bg-slate-900/50">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <ScanLine size={18} className={activeItem?.hasSN ? 'text-blue-400' : 'text-slate-500'} />
                        {activeItem ? activeItem.itemName : 'Pilih Barang'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {activeItem?.hasSN ? "Scan barcode SN untuk barang ini" : activeItem ? "Barang ini tidak perlu Serial Number" : "Klik barang di tabel untuk scan SN"}
                    </p>
                </div>

                {activeItem?.hasSN && (
                    <div className="p-4 bg-slate-900/80">
                        <input
                            ref={scannerInputRef}
                            type="text"
                            disabled={!activeItem?.hasSN}
                            value={currentScan}
                            onChange={(e) => setCurrentScan(e.target.value)}
                            onKeyDown={handleScanComplete}
                            placeholder="Scan Serial Number..."
                            className="w-full bg-black/50 border border-blue-500/50 focus:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] text-white rounded-lg px-4 py-3 font-mono text-center focus:outline-none transition-all"
                        />
                    </div>
                )}

                {/* SELECTED SN LIST for active item */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/30 border-t border-[#334155]">
                    {activeItem ? (
                        <>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-sm font-medium text-slate-300">
                                    {activeItem.hasSN ? 'SN Terpilih:' : 'Item Non-SN'}
                                </span>
                                {activeItem.hasSN && (
                                    <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full">{activeItem.serialNumbers.length} SN</span>
                                )}
                            </div>

                            {activeItem.hasSN ? (
                                <div className="space-y-2">
                                    {activeItem.serialNumbers.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 border border-dashed border-[#334155] rounded-lg text-xs">
                                            Scan barcode SN untuk mendaftarkan
                                        </div>
                                    ) : (
                                        activeItem.serialNumbers.map((sn, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-lg text-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500 font-mono text-xs">{idx + 1}.</span>
                                                    <span className="font-mono text-blue-300">{sn}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSNFromCart(activeCartIdx!, sn)}
                                                    className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500 border border-dashed border-[#334155] rounded-lg text-xs">
                                    <Package size={24} className="mx-auto mb-2 text-slate-600" />
                                    Barang Non-SN.<br />
                                    Cukup atur Qty di tabel barang.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 text-slate-500 text-xs">
                            Pilih barang di tabel untuk mengelola Serial Number
                        </div>
                    )}
                </div>

                {!activeItem?.hasSN && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] z-10 pointer-events-none"></div>
                )}
            </div>
        </div>
    );
}
