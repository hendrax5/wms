'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Wrench, Plus, CheckCircle2, Clock, AlertCircle, Calendar, User2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Log = any;
type User = { id: number; name: string; jabatan: string | null };
type Asset = any;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    SCHEDULED: { label: 'Terjadwal', color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
    COMPLETED: { label: 'Selesai',   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    OVERDUE:   { label: 'Terlambat', color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
};

export default function MaintenanceClient({
    initialLogs, technicians, assets
}: {
    initialLogs: Log[];
    technicians: User[];
    assets: Asset[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [logs, setLogs] = useState<Log[]>(initialLogs);

    const [form, setForm] = useState({
        assetId: '',
        technicianId: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        findings: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.assetId || !form.technicianId || !form.scheduledDate) {
            setError('Harap isi semua field wajib');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/assets/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setShowForm(false);
            setForm({ assetId: '', technicianId: '', scheduledDate: new Date().toISOString().split('T')[0], findings: '' });
            startTransition(() => router.refresh());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleComplete = async (logId: number) => {
        const actionTaken = prompt('Tindakan yang diambil:');
        if (actionTaken === null) return;
        try {
            const res = await fetch(`/api/assets/maintenance/${logId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'COMPLETED', completedDate: new Date().toISOString(), actionTaken }),
            });
            if (res.ok) {
                startTransition(() => router.refresh());
            }
        } catch {}
    };

    const scheduled = initialLogs.filter((l: Log) => l.status === 'SCHEDULED' || l.status === 'OVERDUE');
    const completed = initialLogs.filter((l: Log) => l.status === 'COMPLETED');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Wrench size={20} className="text-yellow-400" />
                        Jadwal Maintenance
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">Kelola perawatan preventif semua aset</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/assets" className="px-3 py-2 text-sm text-slate-400 border border-border rounded-lg hover:border-white/20 transition-colors">
                        ← Daftar Aset
                    </Link>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {showForm ? <X size={14} /> : <Plus size={14} />}
                        {showForm ? 'Batal' : 'Jadwal Baru'}
                    </button>
                </div>
            </div>

            {/* New Schedule Form */}
            {showForm && (
                <div className="card border-yellow-500/20">
                    <h3 className="font-semibold text-white text-sm mb-4">Tambah Jadwal Maintenance Baru</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Aset <span className="text-red-400">*</span></label>
                            <select
                                value={form.assetId}
                                onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500/50"
                                required
                            >
                                <option value="">Pilih aset...</option>
                                {assets.map((a: Asset) => (
                                    <option key={a.id} value={a.id}>
                                        [{a.serialnumber?.code}] {a.item?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Teknisi <span className="text-red-400">*</span></label>
                            <select
                                value={form.technicianId}
                                onChange={e => setForm(f => ({ ...f, technicianId: e.target.value }))}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500/50"
                                required
                            >
                                <option value="">Pilih teknisi...</option>
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} {t.jabatan ? `(${t.jabatan})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Tanggal Jadwal <span className="text-red-400">*</span></label>
                            <input
                                type="date"
                                value={form.scheduledDate}
                                onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Catatan / Temuan Awal</label>
                            <input
                                type="text"
                                value={form.findings}
                                onChange={e => setForm(f => ({ ...f, findings: e.target.value }))}
                                placeholder="Opsional..."
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-500/50"
                            />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-between">
                            {error && <p className="text-red-400 text-xs">{error}</p>}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="ml-auto px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Upcoming / Scheduled */}
            <div className="card">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-4">
                    <Clock size={14} className="text-blue-400" />
                    Jadwal Mendatang
                    {scheduled.length > 0 && (
                        <span className="ml-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full font-medium">
                            {scheduled.length}
                        </span>
                    )}
                </h3>
                {scheduled.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-2">
                        <CheckCircle2 size={20} className="text-green-400" />
                        <p className="text-sm text-slate-500">Tidak ada jadwal maintenance mendatang</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {scheduled.map((log: Log) => {
                            const sc = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.SCHEDULED;
                            const isOverdue = new Date(log.scheduledDate) < new Date() && log.status === 'SCHEDULED';
                            return (
                                <div key={log.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-surface border-border'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center shrink-0`}>
                                            {isOverdue ? <AlertCircle size={14} className="text-red-400" /> : <Clock size={14} className={sc.color} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white text-sm">{log.asset?.item?.name}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">{log.asset?.serialnumber?.code}</p>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Calendar size={10} />
                                                    {new Date(log.scheduledDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                    <User2 size={10} />
                                                    {log.technician?.name}
                                                </span>
                                                {isOverdue && <span className="text-[10px] text-red-400 font-medium">TERLAMBAT</span>}
                                            </div>
                                            {log.findings && <p className="text-xs text-slate-500 mt-1">📋 {log.findings}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleComplete(log.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/20 text-green-400 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        <CheckCircle2 size={12} />
                                        Tandai Selesai
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Completed */}
            {completed.length > 0 && (
                <div className="card">
                    <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-4">
                        <CheckCircle2 size={14} className="text-green-400" />
                        Riwayat Selesai ({completed.length})
                    </h3>
                    <div className="space-y-2">
                        {completed.slice(0, 10).map((log: Log) => (
                            <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface">
                                <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{log.asset?.item?.name}</p>
                                    <p className="text-[11px] text-slate-500">
                                        {new Date(log.completedDate ?? log.scheduledDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })} · {log.technician?.name}
                                    </p>
                                </div>
                                {log.actionTaken && (
                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{log.actionTaken}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
