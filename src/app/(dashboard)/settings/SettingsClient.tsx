"use client";

import { useState } from "react";
import { updateAppConfig, resetOperationalData } from "@/app/actions/settings";
import { Loader2, Save, AlertTriangle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
    initialConfig: any;
}

export default function SettingsClient({ initialConfig }: SettingsClientProps) {
    const router = useRouter();
    
    // Normal Settings State
    const [form, setForm] = useState({
        appName: initialConfig?.appName || "",
        companyName: initialConfig?.companyName || "",
        description: initialConfig?.description || "",
        logo: initialConfig?.logo || "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState({ text: "", type: "" });

    // Danger Zone State
    const [isResetting, setIsResetting] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [confirmCompany, setConfirmCompany] = useState("");
    const [resetMsg, setResetMsg] = useState({ text: "", type: "" });

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMsg({ text: "", type: "" });
        
        try {
            const res = await updateAppConfig(form);
            if (res.success) {
                setMsg({ text: "Pengaturan berhasil disimpan!", type: "success" });
                router.refresh();
            } else {
                setMsg({ text: res.error || "Gagal menyimpan", type: "error" });
            }
        } catch (err) {
            setMsg({ text: "Terjadi kesalahan sistem", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetData = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsResetting(true);
        setResetMsg({ text: "", type: "" });
        
        try {
            const res = await resetOperationalData(confirmCompany);
            if (res.success) {
                setResetMsg({ text: "Data operasional berhasil di-reset!", type: "success" });
                setTimeout(() => {
                    setShowResetModal(false);
                    setConfirmCompany("");
                    router.refresh();
                    router.push("/dashboard"); // Redirect to dashboard to see fresh data
                }, 2000);
            } else {
                setResetMsg({ text: res.error || "Gagal reset data", type: "error" });
            }
        } catch (err) {
            setResetMsg({ text: "Terjadi kesalahan sistem", type: "error" });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Pengaturan Aplikasi</h1>
                <p className="text-sm text-slate-400 mt-1">Kelola nama aplikasi, identitas perusahaan, dan manajemen data.</p>
            </div>

            {/* General Settings Card */}
            <div className="bg-[#020617] border border-[#1E293B] rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-[#1E293B] bg-[#0F172A]/50">
                    <h2 className="text-lg font-semibold text-white">Identitas Perusahaan</h2>
                </div>
                
                <form onSubmit={handleSaveSettings} className="p-5 sm:p-6 space-y-5">
                    {msg.text && (
                        <div className={`p-3 rounded-lg flex items-center gap-2.5 text-sm ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {msg.type === 'success' ? <ShieldAlert size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                            {msg.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Aplikasi</label>
                            <input type="text" value={form.appName} onChange={e => setForm({...form, appName: e.target.value})} required
                                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama PT / Perusahaan</label>
                            <input type="text" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} required
                                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">URL Logo (Opsional)</label>
                        <input type="url" value={form.logo || ""} onChange={e => setForm({...form, logo: e.target.value})} placeholder="https://..."
                            className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                        <p className="text-[10px] text-slate-500 mt-1.5">Masukkan link URL gambar logo perusahaan Anda. Kosongkan untuk menggunakan logo default.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Deskripsi Singkat (Opsional)</label>
                        <textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                            className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none" />
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>

            {/* Danger Zone Card */}
            <div className="bg-[#020617] border border-red-500/30 rounded-2xl overflow-hidden relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                <div className="p-5 border-b border-red-500/20 bg-red-500/5 flex items-center gap-3">
                    <AlertTriangle className="text-red-400" size={20} />
                    <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
                </div>
                <div className="p-5 sm:p-6 space-y-4">
                    <p className="text-sm text-slate-300">
                        Proses ini akan <strong className="text-white">menghapus SEMUA data transaksi</strong> (Barang Masuk, Keluar, Riwayat POP, Asset, Log) dan mengatur ulang stok fisik kembali ke nol.
                    </p>
                    <p className="text-sm text-slate-400">
                        Master Data (Daftar Barang, Kategori, Gudang, Pengguna, dan Pengaturan Aplikasi) <strong className="text-white">TIDAK</strong> akan dihapus. Gunakan fitur ini jika Anda ingin memulai WMS dari nol setelah masa testing selesai.
                    </p>
                    <div className="pt-2">
                        <button type="button" onClick={() => setShowResetModal(true)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                            Reset Data Transaksi
                        </button>
                    </div>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0F172A] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-red-500/20 bg-red-500/10 flex items-center gap-3">
                            <AlertTriangle className="text-red-400" size={20} />
                            <h3 className="font-bold text-red-400 text-lg">Konfirmasi Reset Data</h3>
                        </div>
                        <form onSubmit={handleResetData} className="p-5 sm:p-6 space-y-4">
                            {resetMsg.text && (
                                <div className={`p-3 rounded-lg flex items-center gap-2.5 text-sm ${resetMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {resetMsg.type === 'success' ? <ShieldAlert size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400 shrink-0" />}
                                    {resetMsg.text}
                                </div>
                            )}

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Tindakan ini <strong>PERMANEN</strong> dan tidak dapat dibatalkan. Semua history transaksi akan hilang selamanya.
                            </p>
                            <div className="bg-[#020617] p-4 rounded-lg border border-[#1E293B]">
                                <label className="block text-xs text-slate-400 mb-2">
                                    Ketik nama PT <span className="text-white font-bold select-all tracking-wider">"{form.companyName}"</span> untuk melanjutkan:
                                </label>
                                <input type="text" required value={confirmCompany} onChange={e => setConfirmCompany(e.target.value)}
                                    placeholder={form.companyName}
                                    className="w-full bg-[#0F172A] border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors" />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => { setShowResetModal(false); setConfirmCompany(""); setResetMsg({text:"",type:""}); }} disabled={isResetting} 
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                                <button type="submit" disabled={isResetting || confirmCompany !== form.companyName} 
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : "Ya, Reset Semua Data"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
