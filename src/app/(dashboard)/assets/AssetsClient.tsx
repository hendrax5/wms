'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Cpu, CheckCircle2, Wrench, AlertTriangle, PackageX,
    Search, ChevronRight, ScanLine, Calendar, User2
} from 'lucide-react';

type Asset = any;
type Stats = { active: number; maintenance: number; damaged: number; decommissioned: number; total: number };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ACTIVE:        { label: 'Aktif',         color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    MAINTENANCE:   { label: 'Maintenance',   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    DAMAGED:       { label: 'Rusak',         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
    DECOMMISSIONED:{ label: 'Pensiunkan',    color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20' },
};

export default function AssetsClient({ initialAssets, stats }: { initialAssets: Asset[]; stats: Stats }) {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const filtered = initialAssets.filter((a: Asset) => {
        const matchSearch = a.item?.name?.toLowerCase().includes(search.toLowerCase()) ||
            a.serialnumber?.code?.toLowerCase().includes(search.toLowerCase()) ||
            a.user?.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
        return matchSearch && matchStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Cpu size={20} className="text-blue-400" />
                        Asset Management
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">Daftar semua aset aktif perusahaan</p>
                </div>
                <Link
                    href="/dashboard/technician/deploy"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <ScanLine size={15} />
                    Scan & Deploy
                </Link>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Aktif',      value: stats.active,         icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10',  filter: 'ACTIVE' },
                    { label: 'Maintenance',      value: stats.maintenance,    icon: Wrench,       color: 'text-yellow-400', bg: 'bg-yellow-500/10', filter: 'MAINTENANCE' },
                    { label: 'Rusak',            value: stats.damaged,        icon: AlertTriangle,color: 'text-red-400',    bg: 'bg-red-500/10',    filter: 'DAMAGED' },
                    { label: 'Dinonaktifkan',    value: stats.decommissioned, icon: PackageX,     color: 'text-slate-400',  bg: 'bg-slate-500/10',  filter: 'DECOMMISSIONED' },
                ].map(s => (
                    <button
                        key={s.filter}
                        onClick={() => setFilterStatus(prev => prev === s.filter ? 'ALL' : s.filter)}
                        className={`stat-card text-left transition-all ${filterStatus === s.filter ? 'ring-1 ring-white/20' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                            <s.icon size={16} className={s.color} />
                        </div>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                    </button>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="card">
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nama barang, SN, atau teknisi..."
                            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="DAMAGED">Rusak</option>
                        <option value="DECOMMISSIONED">Dinonaktifkan</option>
                    </select>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
                            <Cpu size={24} className="text-slate-600" />
                        </div>
                        <p className="text-slate-500 text-sm">Belum ada data aset</p>
                        <Link href="/dashboard/technician/deploy" className="text-xs text-green-400 hover:underline">
                            Deploy aset pertama Anda →
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Perangkat', 'Serial Number', 'Teknisi/User', 'Lokasi', 'Dipasang', 'Status', ''].map(h => (
                                        <th key={h} className="text-left text-xs font-medium text-slate-500 pb-3 pr-4 last:pr-0">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((asset: Asset) => {
                                    const sc = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.DECOMMISSIONED;
                                    return (
                                        <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="py-3 pr-4">
                                                <p className="font-medium text-white">{asset.item?.name ?? '—'}</p>
                                                <p className="text-[11px] text-slate-500">{asset.item?.category?.name ?? ''}</p>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                                                    {asset.serialnumber?.code ?? '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <User2 size={12} />
                                                    <span className="text-xs">{asset.user?.name ?? 'Tidak Ditugaskan'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-xs text-slate-400">
                                                {asset.serialnumber?.warehouse?.name ?? (
                                                    <span className="text-slate-600 italic">Di Lapangan</span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                    <Calendar size={11} />
                                                    {new Date(asset.installedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color} ${sc.bg} ${sc.border}`}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <Link
                                                    href={`/assets/${asset.id}`}
                                                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    Detail <ChevronRight size={12} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-600 mt-4">Menampilkan {filtered.length} dari {initialAssets.length} aset</p>
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="flex gap-3">
                <Link
                    href="/assets/maintenance"
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-yellow-500/30 rounded-lg text-sm text-slate-400 hover:text-yellow-400 transition-all"
                >
                    <Wrench size={15} />
                    Jadwal Maintenance
                </Link>
            </div>
        </div>
    );
}
