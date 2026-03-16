'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RotateCcw, ScanLine, Search, AlertTriangle, CheckCircle2, Building2, X } from 'lucide-react';

type ScannedAsset = {
    assetId: number;
    itemName: string;
    category: string;
    serialCode: string;
    status: string;
    installedAt: string;
    technicianName: string;
};

type Warehouse = {
    id: number;
    name: string;
    type: string;
};

function ReturnPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefillSN = searchParams.get('sn') || '';

    const [snInput, setSnInput] = useState(prefillSN);
    const [scanning, setScanning] = useState(false);
    const [asset, setAsset] = useState<ScannedAsset | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [form, setForm] = useState({
        warehouseId: '',
        returnCondition: 'DISMANTLE',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Fetch warehouses on mount
    useEffect(() => {
        fetch('/api/warehouses')
            .then(r => r.json())
            .then(data => setWarehouses(data?.warehouses || data || []))
            .catch(() => {});
    }, []);

    // Auto-scan if SN was pre-filled from URL
    useEffect(() => {
        if (prefillSN) {
            handleScan(prefillSN);
        }
    }, [prefillSN]);

    const handleScan = async (sn?: string) => {
        const serialCode = (sn ?? snInput).trim();
        if (!serialCode) return;
        setScanning(true);
        setScanError(null);
        setAsset(null);
        try {
            const res = await fetch(`/api/assets/scan-by-sn?sn=${encodeURIComponent(serialCode)}`);
            const data = await res.json();
            if (!res.ok) { setScanError(data.error || 'SN tidak ditemukan'); return; }
            setAsset(data);
        } catch {
            setScanError('Gagal menghubungi server');
        } finally {
            setScanning(false);
        }
    };

    const handleReturn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!asset || !form.warehouseId) return;
        setSubmitError(null);
        setSubmitting(true);
        try {
            const res = await fetch('/api/assets/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: asset.assetId,
                    warehouseId: form.warehouseId,
                    returnCondition: form.returnCondition,
                    notes: form.notes,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setSubmitError(data.error); return; }
            setSuccess(`Aset ${asset.serialCode} berhasil dikembalikan ke gudang! Stok telah diperbarui.`);
            setAsset(null);
            setSnInput('');
            setForm({ warehouseId: '', returnCondition: 'DISMANTLE', notes: '' });
        } catch {
            setSubmitError('Gagal menghubungi server');
        } finally {
            setSubmitting(false);
        }
    };

    const STATUS_LABELS: Record<string, string> = {
        ACTIVE: 'Aktif', MAINTENANCE: 'Maintenance', DAMAGED: 'Rusak', DECOMMISSIONED: 'Non-Aktif',
    };
    const STATUS_COLOR: Record<string, string> = {
        ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/20',
        MAINTENANCE: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        DAMAGED: 'text-red-400 bg-red-500/10 border-red-500/20',
        DECOMMISSIONED: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <RotateCcw size={20} className="text-orange-400" />
                    Return Aset
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Kembalikan aset dari lapangan ke gudang</p>
            </div>

            {/* Success State */}
            {success && (
                <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-green-400">Return Berhasil!</p>
                        <p className="text-xs text-slate-400 mt-0.5">{success}</p>
                    </div>
                    <button onClick={() => setSuccess(null)}>
                        <X size={14} className="text-slate-500 hover:text-white" />
                    </button>
                </div>
            )}

            {/* Step 1 — Scan SN */}
            <div className="card space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">1</span>
                    Scan / Input Serial Number Aset
                </h3>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={snInput}
                            onChange={e => setSnInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleScan()}
                            placeholder="Ketik Serial Number aset yang akan dikembalikan..."
                            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50"
                        />
                    </div>
                    <button
                        onClick={() => handleScan()}
                        disabled={scanning || !snInput.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <ScanLine size={15} />
                        {scanning ? 'Mencari...' : 'Cari'}
                    </button>
                </div>

                {scanError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        <AlertTriangle size={14} className="shrink-0" />
                        {scanError}
                    </div>
                )}

                {/* Asset Info Card */}
                {asset && (
                    <div className="p-4 bg-surface border border-border rounded-xl space-y-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-semibold text-white">{asset.itemName}</p>
                                <p className="text-[11px] text-slate-500">{asset.category}</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[asset.status] ?? STATUS_COLOR.DECOMMISSIONED}`}>
                                {STATUS_LABELS[asset.status] ?? asset.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-slate-500 mb-0.5">Serial Number</p>
                                <p className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded inline-block">{asset.serialCode}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Teknisi</p>
                                <p className="text-white">{asset.technicianName}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Dipasang</p>
                                <p className="text-white">{new Date(asset.installedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
                            </div>
                        </div>

                        {asset.status === 'DECOMMISSIONED' && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2 bg-slate-800/50 rounded-lg">
                                <AlertTriangle size={12} />
                                Aset ini sudah berstatus Dinonaktifkan, tidak perlu dikembalikan lagi.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Step 2 — Return Form */}
            {asset && asset.status !== 'DECOMMISSIONED' && (
                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
                        Detail Pengembalian
                    </h3>

                    <form onSubmit={handleReturn} className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">
                                Gudang Tujuan <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <select
                                    value={form.warehouseId}
                                    onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}
                                    className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-orange-500/50 appearance-none"
                                    required
                                >
                                    <option value="">Pilih gudang tujuan...</option>
                                    {warehouses.map((w: Warehouse) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-500 mb-1">
                                Kondisi Aset Kembali <span className="text-red-400">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'DISMANTLE', label: 'Bongkar / Dismantle', desc: 'Bisa dipakai lagi', color: 'orange' },
                                    { value: 'DAMAGED',   label: 'Rusak / Damaged',     desc: 'Tidak bisa dipakai', color: 'red' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, returnCondition: opt.value }))}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            form.returnCondition === opt.value
                                                ? opt.value === 'DISMANTLE'
                                                    ? 'border-orange-500/50 bg-orange-500/10'
                                                    : 'border-red-500/50 bg-red-500/10'
                                                : 'border-border bg-surface hover:border-white/20'
                                        }`}
                                    >
                                        <p className={`text-sm font-semibold ${
                                            form.returnCondition === opt.value
                                                ? opt.value === 'DISMANTLE' ? 'text-orange-400' : 'text-red-400'
                                                : 'text-white'
                                        }`}>{opt.label}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Catatan (Opsional)</label>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Alasan pengembalian, kondisi fisik, dll..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 resize-none"
                            />
                        </div>

                        {submitError && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                <AlertTriangle size={14} className="shrink-0" />
                                {submitError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || !form.warehouseId}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                        >
                            <RotateCcw size={16} />
                            {submitting ? 'Memproses...' : 'Konfirmasi Return Aset'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default function ReturnAssetPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-20"><div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" /></div>}>
            <ReturnPageInner />
        </Suspense>
    );
}
