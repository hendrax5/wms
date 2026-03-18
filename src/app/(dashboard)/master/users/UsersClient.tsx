"use client";

import { useState, useEffect } from "react";
import { createUser, updateUser, deleteUser } from "@/app/actions/user";
import {
    Plus, Search, Pencil, Trash2, X, Building2, UserCircle,
    ChevronRight, CheckCircle2, AlertCircle, Loader2,
    ChevronLeft, ChevronsLeft, ChevronsRight
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

type Warehouse = { id: number; name: string };

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
    name: "", username: "", password: "", level: "STAFF",
    jabatan: "", phone: "", warehouseId: "", isActive: true,
};

type AlertMsg = { type: "success" | "error"; text: string } | null;

/* ── Pagination ── */
const PP = 10;
function PaginationBar({ page, totalPages, setPage, total, perPage, label }: {
    page: number; totalPages: number; setPage: (n: number) => void; total: number; perPage: number; label?: string;
}) {
    if (total <= perPage) return null;
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push("..."); for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i); if (page < totalPages - 2) pages.push("..."); pages.push(totalPages); }
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 px-1">
            <span className="text-[11px] text-slate-500">Menampilkan <span className="text-white font-medium">{start}–{end}</span> dari <span className="text-white font-medium">{total}</span> {label || "data"}</span>
            <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14} /></button>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /></button>
                {pages.map((p, i) => p === "..." ? (<span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>) : (
                    <button key={p} type="button" onClick={() => setPage(p as number)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${page === p ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-white hover:bg-white/5"}`}>{p}</button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14} /></button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14} /></button>
            </div>
        </div>
    );
}

export default function UsersClient({ initialUsers, warehouses }: { initialUsers: any[]; warehouses: Warehouse[] }) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Partial<FormState>>({});
    const [alertMsg, setAlertMsg] = useState<AlertMsg>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

    // Pagination
    const [page, setPage] = useState(1);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.level.toLowerCase().includes(search.toLowerCase()) ||
        (u.warehouse?.name || "").toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PP));
    const safePage = Math.min(page, totalPages);
    const pagedUsers = filteredUsers.slice((safePage - 1) * PP, safePage * PP);

    useEffect(() => { setPage(1); }, [search]);

    const openModal = (user?: User) => {
        setErrors({});
        setAlertMsg(null);
        if (user) {
            setForm({
                name: user.name, username: user.username, password: "",
                level: user.level, jabatan: user.jabatan || "",
                phone: user.phone || "", warehouseId: user.warehouseId?.toString() || "",
                isActive: user.isActive,
            });
            setEditingUser(user);
        } else {
            setForm(emptyForm);
            setEditingUser(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
        setForm(emptyForm);
        setErrors({});
    };

    const setField = (key: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validate = (): boolean => {
        const errs: Partial<FormState> = {};
        if (!form.name.trim()) errs.name = "Nama wajib diisi";
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
        const res = editingUser ? await updateUser(editingUser.id, formData) : await createUser(formData);
        if (res.success) {
            setAlertMsg({ type: "success", text: editingUser ? "Berhasil diperbarui!" : "Pengguna baru ditambahkan!" });
            setTimeout(() => { closeModal(); window.location.reload(); }, 1000);
        } else {
            setAlertMsg({ type: "error", text: res.error || "Gagal. Coba lagi." });
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const res = await deleteUser(deleteTarget.id);
        if (res.success) {
            setUsers(users.filter(u => u.id !== deleteTarget.id));
            setDeleteTarget(null);
        } else {
            alert(res.error || "Gagal menghapus");
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-0.5">Data Pengguna</h2>
                    <p className="text-xs sm:text-sm text-slate-400">Kelola akun dan hak akses sistem.</p>
                </div>
                <button type="button" onClick={() => openModal()} className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 flex items-center gap-1.5 shrink-0">
                    <Plus size={14} /> Tambah Pengguna
                </button>
            </div>

            {/* Card */}
            <div className="card !p-0 border border-[#1E293B] overflow-hidden">
                {/* Search */}
                <div className="p-2.5 sm:p-3 border-b border-[#1E293B] bg-[#020617]/50">
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Cari nama, username, role..." value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition-all font-medium" />
                    </div>
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-4 py-3">Pengguna</th>
                                <th className="px-4 py-3">Role / Area</th>
                                <th className="px-4 py-3 text-center w-16">Status</th>
                                <th className="px-4 py-3 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {pagedUsers.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-sm">Tidak ada pengguna ditemukan.</td></tr>
                            ) : pagedUsers.map(user => (
                                <tr key={user.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${user.isActive ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-600" : "bg-slate-800 text-slate-500 border-slate-700"}`}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white text-sm truncate group-hover:text-purple-400 transition-colors">{user.name}</p>
                                                <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${levelBadge(user.level)}`}>{user.level}</span>
                                                {user.jabatan && <span className="text-[10px] text-slate-500">• {user.jabatan}</span>}
                                            </div>
                                            {user.level === "MASTER" ? (
                                                <p className="text-[10px] text-green-400 font-medium">Global Access</p>
                                            ) : user.warehouse ? (
                                                <p className="text-[10px] text-amber-400 flex items-center gap-1"><Building2 size={9} /> {user.warehouse.name}</p>
                                            ) : (
                                                <p className="text-[10px] text-slate-600 italic">Belum di-assign</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {user.isActive ? (
                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block shadow-[0_0_6px_rgba(34,197,94,0.5)]"></span>
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button type="button" onClick={() => openModal(user)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit"><Pencil size={14} /></button>
                                            <button type="button" onClick={() => setDeleteTarget(user)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Hapus"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2 p-3">
                    {pagedUsers.length === 0 ? (
                        <div className="flex flex-col items-center py-12 gap-2">
                            <UserCircle size={24} className="text-slate-600" />
                            <p className="text-sm text-slate-500">Tidak ada pengguna.</p>
                        </div>
                    ) : pagedUsers.map(user => (
                        <div key={user.id} className="bg-[#020617] border border-[#1E293B] rounded-xl p-3">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${user.isActive ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-600" : "bg-slate-800 text-slate-500 border-slate-700"}`}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white text-sm truncate">{user.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">@{user.username}</p>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${levelBadge(user.level)}`}>{user.level}</span>
                                {user.isActive ? <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span> : <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>}
                            </div>
                            <div className="text-[11px] text-slate-500 mb-2">
                                {user.warehouse ? <span className="flex items-center gap-1"><Building2 size={10} /> {user.warehouse.name}</span> : user.level === "MASTER" ? <span className="text-green-400">Global Access</span> : <span className="italic">Belum di-assign</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => openModal(user)} className="flex-1 text-center py-1.5 rounded-lg bg-[#0F172A] border border-[#1E293B] text-[11px] font-medium text-slate-400 hover:text-blue-400 transition-all">Edit</button>
                                <button type="button" onClick={() => setDeleteTarget(user)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-3 pb-3">
                    <PaginationBar page={safePage} totalPages={totalPages} setPage={setPage} total={filteredUsers.length} perPage={PP} label="pengguna" />
                </div>
            </div>

            {/* ═══════ ADD/EDIT MODAL ═══════ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ animation: "fadeIn .25s ease-out" }}>
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                    <UserCircle size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</h3>
                                    <p className="text-[11px] text-slate-500">{editingUser ? `Mengubah: ${editingUser.name}` : "Isi data pengguna baru"}</p>
                                </div>
                            </div>
                            <button type="button" onClick={closeModal} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"><X size={18} /></button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
                            {alertMsg && (
                                <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${alertMsg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                                    {alertMsg.type === "success" ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                                    {alertMsg.text}
                                </div>
                            )}

                            {/* Nama */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Nama Lengkap <span className="text-red-400">*</span></label>
                                <input type="text" className={`w-full bg-[#020617] border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all ${errors.name ? "border-red-500/50 focus:border-red-500" : "border-[#1E293B] focus:border-purple-500/50"}`}
                                    placeholder="Contoh: Budi Santoso" value={form.name} onChange={e => setField("name", e.target.value)} />
                                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                            </div>

                            {/* Username + Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Username <span className="text-red-400">*</span></label>
                                    <input type="text" className={`w-full bg-[#020617] border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all ${errors.username ? "border-red-500/50" : "border-[#1E293B] focus:border-purple-500/50"}`}
                                        placeholder="budi" value={form.username} onChange={e => setField("username", e.target.value)} />
                                    {errors.username && <p className="text-xs text-red-400">{errors.username}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                        Password {editingUser && <span className="text-slate-600 normal-case">(opsional)</span>}
                                        {!editingUser && <span className="text-red-400"> *</span>}
                                    </label>
                                    <input type="password" className={`w-full bg-[#020617] border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all ${errors.password ? "border-red-500/50" : "border-[#1E293B] focus:border-purple-500/50"}`}
                                        placeholder={editingUser ? "Kosongkan jika tetap" : "Kata sandi..."} value={form.password} onChange={e => setField("password", e.target.value)} />
                                    {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                                </div>
                            </div>

                            {/* Level + Warehouse */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Level Akses <span className="text-red-400">*</span></label>
                                    <select className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all" value={form.level} onChange={e => setField("level", e.target.value)}>
                                        <option value="MASTER">SUPER ADMIN</option>
                                        <option value="CABANG">ADMIN CABANG</option>
                                        <option value="SPV">SPV / MANAGER</option>
                                        <option value="STAFF">STAFF</option>
                                        <option value="USER">USER (Baca)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Akses Cabang</label>
                                    <select className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all" value={form.warehouseId} onChange={e => setField("warehouseId", e.target.value)}>
                                        <option value="">Global (Semua)</option>
                                        {warehouses.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                                    </select>
                                </div>
                            </div>

                            {/* Jabatan + Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Jabatan</label>
                                    <input type="text" className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                        placeholder="Staff IT" value={form.jabatan} onChange={e => setField("jabatan", e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">No. Telp</label>
                                    <input type="text" className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                        placeholder="0812..." value={form.phone} onChange={e => setField("phone", e.target.value)} />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center gap-3 p-3 bg-[#020617] rounded-xl border border-[#1E293B] cursor-pointer hover:border-purple-500/20 transition-colors" onClick={() => setField("isActive", !form.isActive)}>
                                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? "bg-green-500" : "bg-slate-700"}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Status Aktif</p>
                                    <p className="text-[10px] text-slate-500">{form.isActive ? "Bisa login" : "Akses ditangguhkan"}</p>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#020617] border border-[#1E293B] text-sm font-medium text-slate-400 hover:text-white transition-colors">Batal</button>
                                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><CheckCircle2 size={14} /> {editingUser ? "Simpan" : "Tambah"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════ DELETE CONFIRM ═══════ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ animation: "fadeIn .25s ease-out" }}>
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Hapus Pengguna?</h3>
                        <p className="text-sm text-slate-400 mb-5">Yakin hapus <span className="text-white font-semibold">{deleteTarget.name}</span>?</p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl bg-[#020617] border border-[#1E293B] text-sm font-medium text-slate-400 hover:text-white transition-colors">Batal</button>
                            <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-colors">Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
