'use client';

import Link from 'next/link';
import {
    ArrowLeft, Cpu, Tag, MapPin, User2, Calendar,
    ShieldCheck, Wrench, TrendingDown, CheckCircle2, Clock, AlertCircle, RotateCcw
} from 'lucide-react';

type Asset = any;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ACTIVE:         { label: 'Aktif',         color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    MAINTENANCE:    { label: 'Maintenance',   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    DAMAGED:        { label: 'Rusak',         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
    DECOMMISSIONED: { label: 'Dinonaktifkan', color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20' },
    SCHEDULED:      { label: 'Terjadwal',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
    COMPLETED:      { label: 'Selesai',       color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    OVERDUE:        { label: 'Terlambat',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
};

// Simple Straight-Line Depreciation
function calcDepreciation(purchasePrice: number, installedAt: Date, usefulLifeYears = 5) {
    const now = new Date();
    const ageMs = now.getTime() - new Date(installedAt).getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    const annualDepreciation = purchasePrice / usefulLifeYears;
    const accumulated = Math.min(annualDepreciation * ageYears, purchasePrice);
    const bookValue = Math.max(purchasePrice - accumulated, 0);
    const depreciationPercent = (accumulated / purchasePrice) * 100;
    return {
        purchasePrice,
        accumulated: Math.round(accumulated),
        bookValue: Math.round(bookValue),
        annualDepreciation: Math.round(annualDepreciation),
        ageYears: ageYears.toFixed(1),
        depreciationPercent: Math.min(Math.round(depreciationPercent), 100),
    };
}

export default function AssetDetailClient({ asset }: { asset: Asset }) {
    const sc = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.DECOMMISSIONED;
    const dep = calcDepreciation(asset.purchasePrice || 0, asset.installedAt);
    const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Link href="/assets" className="p-2 rounded-lg bg-surface border border-border hover:border-white/20 transition-colors">
                    <ArrowLeft size={16} className="text-slate-400" />
                </Link>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">{asset.item?.name}</h2>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color} ${sc.bg} ${sc.border}`}>
                            {sc.label}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500">Asset ID #{asset.id}</p>
                </div>
                <Link
                    href={`/assets/maintenance?assetId=${asset.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Wrench size={14} />
                    Jadwal Maintenance
                </Link>
                {asset.status !== 'DECOMMISSIONED' && (
                    <Link
                        href={`/dashboard/technician/return?sn=${encodeURIComponent(asset.serialnumber?.code ?? '')}`}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <RotateCcw size={14} />
                        Return Aset
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left — Asset Info */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card space-y-4">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                            <Cpu size={15} className="text-blue-400" /> Informasi Aset
                        </h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <InfoRow icon={Tag} label="Nama Barang" value={asset.item?.name} />
                            <InfoRow icon={Tag} label="Kategori" value={asset.item?.category?.name ?? '—'} />
                            <InfoRow icon={Tag} label="Serial Number" value={
                                <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">{asset.serialnumber?.code ?? '—'}</span>
                            } />
                            <InfoRow icon={MapPin} label="Lokasi/Warehouse" value={asset.serialnumber?.warehouse?.name ?? 'Di Lapangan'} />
                            <InfoRow icon={User2} label="Ditugaskan ke" value={asset.user?.name ?? 'Tidak Ditugaskan'} />
                            <InfoRow icon={Calendar} label="Tanggal Pasang" value={new Date(asset.installedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
                            <InfoRow icon={ShieldCheck} label="Garansi s/d" value={
                                asset.warrantyExpiry
                                    ? new Date(asset.warrantyExpiry).toLocaleDateString('id-ID', { dateStyle: 'long' })
                                    : <span className="text-slate-600 italic">Tidak ada garansi</span>
                            } />
                            <InfoRow icon={Tag} label="Harga Beli" value={fmtIDR(asset.purchasePrice || 0)} />
                        </div>
                    </div>

                    {/* Maintenance History */}
                    <div className="card">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-4">
                            <Wrench size={15} className="text-yellow-400" /> Riwayat Maintenance
                        </h3>
                        {asset.maintenancelogs?.length === 0 ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <CheckCircle2 size={20} className="text-green-400" />
                                <p className="text-sm text-slate-500">Belum ada catatan maintenance</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {asset.maintenancelogs.map((log: any) => {
                                    const ls = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.SCHEDULED;
                                    return (
                                        <div key={log.id} className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-border">
                                            <div className={`w-7 h-7 rounded-lg ${ls.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                                {log.status === 'COMPLETED' ? <CheckCircle2 size={13} className={ls.color} /> :
                                                 log.status === 'OVERDUE' ? <AlertCircle size={13} className={ls.color} /> :
                                                 <Clock size={13} className={ls.color} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-xs font-semibold text-white">
                                                        {new Date(log.scheduledDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                                    </p>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${ls.color} ${ls.bg} ${ls.border}`}>{ls.label}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">Teknisi: {log.technician?.name ?? '—'}</p>
                                                {log.findings && <p className="text-xs text-slate-400 mt-1">📋 {log.findings}</p>}
                                                {log.actionTaken && <p className="text-xs text-green-400 mt-1">✅ {log.actionTaken}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right — Depreciation */}
                <div className="space-y-4">
                    <div className="card">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-4">
                            <TrendingDown size={15} className="text-purple-400" /> Nilai Depresiasi
                        </h3>
                        {dep.purchasePrice === 0 ? (
                            <p className="text-sm text-slate-500 italic">Harga beli belum diisi</p>
                        ) : (
                            <>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-xs">Harga Beli</span>
                                        <span className="text-white font-medium text-xs">{fmtIDR(dep.purchasePrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-xs">Umur Aset</span>
                                        <span className="text-white font-medium text-xs">{dep.ageYears} tahun</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-xs">Depresiasi/Tahun</span>
                                        <span className="text-red-400 font-medium text-xs">{fmtIDR(dep.annualDepreciation)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-xs">Total Terdepresiasi</span>
                                        <span className="text-red-400 font-medium text-xs">{fmtIDR(dep.accumulated)}</span>
                                    </div>

                                    <div className="h-px bg-border my-2" />

                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                            <span>Depresiasi</span>
                                            <span>{dep.depreciationPercent}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-400 to-red-500 rounded-full transition-all"
                                                style={{ width: `${dep.depreciationPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-400 text-xs font-medium">Nilai Buku Sekarang</span>
                                        <span className="text-green-400 font-bold">{fmtIDR(dep.bookValue)}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-600 mt-4 border-t border-border pt-3">
                                    * Metode Garis Lurus (Straight-Line), masa manfaat 5 tahun
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-1 text-slate-500 text-xs mb-0.5">
                <Icon size={10} />
                <span>{label}</span>
            </div>
            <div className="text-white text-sm font-medium">{value ?? '—'}</div>
        </div>
    );
}
