"use client";

import { useState } from "react";
import { createUser, updateUser, deleteUser } from "@/app/actions/user";
import {
    Plus, Search, Edit2, Trash2, X, Building2, UserCircle,
    ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";

type User = {
    id: number;
    username: string;
    name: string;
    level: string;
    jabatan: string | null;
    phone: string | null;
    warehouseId: number | null;
    warehouse: { id: number; name: string } | null;
    isActive: boolean;
};

type Warehouse = {
    id: number;
    name: string;
};

type FormState = {
    name: string;
    username: string;
    password: string;
    level: string;
    jabatan: string;
    phone: string;
    warehouseId: string;
    isActive: boolean;
};

const emptyForm: FormState = {
    name: "",
    username: "",
    password: "",
    level: "STAFF",
    jabatan: "",
    phone: "",
    warehouseId: "",
    isActive: true,
};

type AlertMsg = { type: "success" | "error"; text: string } | null;

export default function UsersClient({ initialUsers, warehouses }: { initialUsers: any[], warehouses: Warehouse[] }) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [search, setSearch] = useState("");
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Partial<FormState>>({});
    const [alertMsg, setAlertMsg] = useState<AlertMsg>(null);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.level.toLowerCase().includes(search.toLowerCase()) ||
        (u.warehouse?.name || "").toLowerCase().includes(search.toLowerCase())
    );

    const openPanel = (user?: User) => {
        setErrors({});
        setAlertMsg(null);
        if (user) {
            setForm({
                name: user.name,
                username: user.username,
                password: "",
                level: user.level,
                jabatan: user.jabatan || "",
                phone: user.phone || "",
                warehouseId: user.warehouseId?.toString() || "",
                isActive: user.isActive,
            });
        } else {
            setForm(emptyForm);
        }
        setEditingUser(user || null);
        setIsPanelOpen(true);
    };

    const closePanel = () => {
        setEditingUser(null);
        setIsPanelOpen(false);
        setForm(emptyForm);
        setErrors({});
    };

    const setField = (key: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validate = (): boolean => {
        const errs: Partial<FormState> = {};
        if (!form.name.trim()) errs.name = "Nama Lengkap wajib diisi";
        if (!form.username.trim()) errs.username = "Username wajib diisi";
        if (!editingUser && !form.password.trim()) errs.password = "Password wajib diisi";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setAlertMsg(null);

        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("username", form.username);
        formData.append("password", form.password);
        formData.append("level", form.level);
        formData.append("jabatan", form.jabatan);
        formData.append("phone", form.phone);
        formData.append("warehouseId", form.warehouseId);
        if (form.isActive) formData.append("isActive", "on");

        const res = editingUser
            ? await updateUser(editingUser.id, formData)
            : await createUser(formData);

        if (res.success) {
            setAlertMsg({ type: "success", text: editingUser ? "Pengguna berhasil diperbarui!" : "Pengguna baru berhasil ditambahkan!" });
            setTimeout(() => { closePanel(); window.location.reload(); }, 1200);
        } else {
            setAlertMsg({ type: "error", text: res.error || "Terjadi kesalahan. Coba lagi." });
        }
        setLoading(false);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Yakin ingin menghapus pengguna "${name}"?`)) return;
        const res = await deleteUser(id);
        if (res.success) {
            setUsers(users.filter(u => u.id !== id));
        } else {
            alert(res.error || "Gagal menghapus pengguna");
        }
    };

    const levelBadge = (level: string) => {
        const map: Record<string, string> = {
            MASTER: "bg-red-500/10 text-red-400 border-red-500/20",
            CABANG: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            SPV: "bg-purple-500/10 text-purple-400 border-purple-500/20",
            STAFF: "bg-slate-800 text-slate-300 border-slate-700",
            USER: "bg-slate-800 text-slate-400 border-slate-700",
        };
        return map[level] || "bg-slate-800 text-slate-300 border-slate-700";
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Data Pengguna</h2>
                    <p className="text-sm text-slate-400">Kelola akun dan hak akses sistem.</p>
                </div>
                <button onClick={() => openPanel()} className="btn btn-primary shadow-lg shadow-purple-500/20 w-full md:w-auto">
                    <Plus size={16} /> Tambah Pengguna
                </button>
            </div>

            {/* Table Card */}
            <div className={`card !p-0 overflow-hidden border border-border transition-all duration-300`}>
                <div className="p-4 border-b border-border bg-surface/50">
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari nama, username, role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10 h-10 bg-background border-border text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-background/90 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-5 py-3 w-12 text-center">No</th>
                                <th className="px-5 py-3">Nama Pengguna</th>
                                <th className="px-5 py-3">Username</th>
                                <th className="px-5 py-3">Role / Jabatan</th>
                                <th className="px-5 py-3">Area</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                                        Tidak ada data pengguna.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user, idx) => (
                                    <tr key={user.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                        <td className="px-5 py-3 text-center text-xs text-slate-500">{idx + 1}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold border border-slate-700">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-white">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded">{user.username}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest w-fit ${levelBadge(user.level)}`}>
                                                    {user.level}
                                                </span>
                                                {user.jabatan && <span className="text-[10px] text-slate-500">{user.jabatan}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            {user.level === 'MASTER' ? (
                                                <span className="text-xs text-green-400 font-medium">Semua Akses (Global)</span>
                                            ) : user.warehouse ? (
                                                <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded w-fit border border-amber-500/20">
                                                    <Building2 size={12} /> {user.warehouse.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Belum di-assign</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {user.isActive ? (
                                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                            ) : (
                                                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openPanel(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Hapus">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Slide-in Side Panel */}
            {isPanelOpen && (
                <div className="fixed inset-0 z-40 flex justify-end" onClick={(e) => e.target === e.currentTarget && closePanel()}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closePanel} />

                    {/* Panel */}
                    <div className="relative z-50 w-full max-w-md bg-surface/95 backdrop-blur-xl border-l border-border h-full flex flex-col shadow-2xl overflow-y-auto animate-slide-in">

                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-border/60 sticky top-0 z-10 bg-surface/80 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner">
                                    <UserCircle size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">
                                        {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                        {editingUser ? `Mengubah data: ${editingUser.name}` : "Isi data pengguna baru dengan lengkap"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closePanel} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Alert Banner */}
                        {alertMsg && (
                            <div className={`mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${alertMsg.type === "success"
                                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}>
                                {alertMsg.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                                {alertMsg.text}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} noValidate className="flex-1 px-8 py-6 space-y-6">

                            {/* Nama Lengkap */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nama Lengkap <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    className={`input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 ${errors.name ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                    placeholder="Contoh: Budi Santoso"
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                />
                                {errors.name && <p className="text-xs text-red-400 animate-slide-in">{errors.name}</p>}
                            </div>

                            {/* Username & Password */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Username <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        className={`input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 ${errors.username ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        placeholder="budi"
                                        value={form.username}
                                        onChange={e => setField('username', e.target.value)}
                                    />
                                    {errors.username && <p className="text-xs text-red-400 animate-slide-in">{errors.username}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Password {editingUser && <span className="text-slate-500 normal-case font-normal">(opsional)</span>}
                                        {!editingUser && <span className="text-red-400"> *</span>}
                                    </label>
                                    <input
                                        type="password"
                                        className={`input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 ${errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        placeholder={editingUser ? "Kosongkan jika tetap" : "Kata sandi..."}
                                        value={form.password}
                                        onChange={e => setField('password', e.target.value)}
                                    />
                                    {errors.password && <p className="text-xs text-red-400 animate-slide-in">{errors.password}</p>}
                                </div>
                            </div>

                            {/* Level */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Level Hak Akses <span className="text-red-400">*</span></label>
                                <select className="input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300" value={form.level} onChange={e => setField('level', e.target.value)}>
                                    <option value="MASTER">SUPER ADMIN (MASTER)</option>
                                    <option value="CABANG">ADMIN CABANG</option>
                                    <option value="SPV">SPV / MANAGER</option>
                                    <option value="STAFF">STAFF / GUDANG</option>
                                    <option value="USER">USER (Baca Saja)</option>
                                </select>
                            </div>

                            {/* Warehouse */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Akses Cabang / Area</label>
                                <select className="input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300" value={form.warehouseId} onChange={e => setField('warehouseId', e.target.value)}>
                                    <option value="">-- Bebaskan Akses (Global) --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1">Batasi hak akses pengguna hanya pada satu lokasi gudang.</p>
                            </div>

                            {/* Jabatan & Phone */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Jabatan</label>
                                    <input type="text" className="input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300" placeholder="Contoh: Staff IT" value={form.jabatan} onChange={e => setField('jabatan', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">No. Telp</label>
                                    <input type="text" className="input-field bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300" placeholder="0812..." value={form.phone} onChange={e => setField('phone', e.target.value)} />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div
                                className="flex items-center gap-4 p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 cursor-pointer hover:bg-slate-900/60 transition-colors duration-200 mt-2"
                                onClick={() => setField('isActive', !form.isActive)}
                            >
                                <div className={`w-12 h-6 rounded-full transition-colors duration-300 ease-in-out relative ${form.isActive ? 'bg-primary' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${form.isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">Status Akun Aktif</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{form.isActive ? "Pengguna ini diizinkan untuk login" : "Akses login ditangguhkan"}</p>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-4 pt-6 pb-4">
                                <button type="button" onClick={closePanel} className="btn bg-slate-900/80 hover:bg-slate-800 border-none text-slate-300 hover:text-white transition-all duration-200 flex-1 py-2.5 rounded-xl">
                                    Batalkan
                                </button>
                                <button type="submit" disabled={loading} className="btn btn-primary flex-1 gap-2 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200">
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                            Menyimpan...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <ChevronRight size={18} />
                                            {editingUser ? "Simpan Perubahan" : "Simpan Pengguna Baru"}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
