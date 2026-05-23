"use client";

import { useState, useEffect } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory, importCategoryBatch } from "@/app/actions/master";
import { Tags, Plus, Pencil, Trash2, Loader2, Search, AlertTriangle, ArrowLeft, Package, X, Download, Upload, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

type Category = {
    id: number;
    name: string;
    code: string | null;
    hasSN: boolean;
    _count?: { item: number };
};

type ActiveFilter = { type: 'kode'; value: string; label: string };

export default function CategoryMasterPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

    const addFilter = (filter: ActiveFilter) => {
        if (!activeFilters.some(f => f.type === filter.type && f.value === filter.value)) {
            setActiveFilters(prev => [...prev, filter]);
        }
        setSearchInput("");
        setIsSuggestionsOpen(false);
    };

    const removeFilter = (filter: ActiveFilter) => {
        setActiveFilters(prev => prev.filter(f => !(f.type === filter.type && f.value === filter.value)));
    };

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", code: "", hasSN: true });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingCat, setDeletingCat] = useState<Category | null>(null);

    const loadData = async () => {
        setLoading(true);
        const res = await getCategories();
        if (res.success) {
            setCategories(res.data as Category[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Import Category Excel State
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importRows, setImportRows] = useState<any[]>([]);
    const [importLoading, setImportLoading] = useState(false);

    const exportToExcel = () => {
        if (filtered.length === 0) return;

        const exportData = filtered.map(c => ({
            "Nama Kategori": c.name,
            "Kode Prefix": c.code || "-",
            "Memiliki SN?": c.hasSN ? "YA" : "TIDAK",
            "Total Item": c._count?.item || 0
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kategori Barang");
        XLSX.writeFile(wb, `Kategori_Barang_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const downloadTemplateCategory = () => {
        const templateData = [
            {
                "Nama Kategori": "Router",
                "Kode Prefix": "RT",
                "Memiliki SN? (YA/TIDAK)": "YA"
            },
            {
                "Nama Kategori": "Kabel FO",
                "Kode Prefix": "KFO",
                "Memiliki SN? (YA/TIDAK)": "TIDAK"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Kategori");
        XLSX.writeFile(wb, "Template_Import_Kategori.xlsx");
    };

    const handleCategoryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json<any>(ws);

                if (rawData.length === 0) {
                    alert("File Excel kosong atau format tidak sesuai.");
                    return;
                }

                const validated = rawData.map((row: any) => {
                    const name = (row["Nama Kategori"] || row["Nama"] || row["name"] || "").toString().trim();
                    const code = (row["Kode Prefix"] || row["Prefix"] || row["code"] || "").toString().trim();
                    const snText = (row["Memiliki SN? (YA/TIDAK)"] || row["Memiliki SN?"] || row["hasSN"] || "YA").toString().trim().toUpperCase();
                    const hasSN = snText === "YA" || snText === "YES" || snText === "TRUE" || snText === "1";

                    const errors: string[] = [];
                    const warnings: string[] = [];

                    if (!name) {
                        errors.push("Nama kategori wajib diisi");
                    } else {
                        const catExists = categories.some(
                            c => c.name.toLowerCase().trim() === name.toLowerCase().trim()
                        );
                        if (catExists) {
                            errors.push("Kategori sudah terdaftar di sistem");
                        }
                    }

                    return {
                        name,
                        code,
                        hasSN,
                        errors,
                        warnings,
                        isValid: errors.length === 0
                    };
                });

                setImportRows(validated);
            } catch (err: any) {
                alert("Gagal membaca file Excel: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const submitCategoryImport = async () => {
        if (importRows.length === 0) return;
        const hasErrors = importRows.some(r => r.errors.length > 0);
        if (hasErrors) {
            alert("Harap perbaiki semua baris yang error sebelum melanjutkan.");
            return;
        }

        setImportLoading(true);
        try {
            const payload = importRows.map(r => ({
                name: r.name,
                code: r.code || undefined,
                hasSN: r.hasSN
            }));
            const res = await importCategoryBatch(payload);
            if (res.success) {
                alert(`Berhasil mengimpor ${res.createdCount} kategori.`);
                setIsImportOpen(false);
                setImportRows([]);
                loadData();
            } else {
                alert(res.error || "Gagal mengimpor data kategori.");
            }
        } catch (err: any) {
            alert("Terjadi kesalahan sistem: " + err.message);
        }
        setImportLoading(false);
    };

    const handleOpenModal = (cat?: Category) => {
        setErrorMsg("");
        if (cat) {
            setEditingCat(cat);
            setFormData({ name: cat.name, code: cat.code || "", hasSN: cat.hasSN ?? true });
        } else {
            setEditingCat(null);
            setFormData({ name: "", code: "", hasSN: true });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setErrorMsg("");

        let res;
        if (editingCat) {
            res = await updateCategory(editingCat.id, formData);
        } else {
            res = await createCategory(formData);
        }

        if (res.success) {
            setIsModalOpen(false);
            loadData();
        } else {
            setErrorMsg(res.error || "Terjadi kesalahan.");
        }
        setSubmitLoading(false);
    };

    const handleDelete = async () => {
        if (!deletingCat) return;
        setSubmitLoading(true);
        setErrorMsg("");

        const res = await deleteCategory(deletingCat.id);
        if (res.success) {
            setIsDeleteModalOpen(false);
            setDeletingCat(null);
            loadData();
        } else {
            setErrorMsg(res.error || "Gagal menghapus.");
        }
        setSubmitLoading(false);
    };

    // Build suggestions
    const uniqueCodes = Array.from(new Set(categories.map(c => c.code).filter(Boolean))) as string[];
    const suggestions: ActiveFilter[] = searchInput.trim().length > 0 ? [
        ...uniqueCodes
            .filter(c => c.toLowerCase().includes(searchInput.toLowerCase()))
            .filter(c => !activeFilters.some(f => f.type === 'kode' && f.value === c))
            .map(c => ({ type: 'kode' as const, value: c, label: `Prefix: ${c}` }))
    ] : [];

    const activeCodeFilters = activeFilters.filter(f => f.type === 'kode').map(f => f.value);

    const filtered = categories.filter(c => {
        const matchesCode = activeCodeFilters.length === 0 || activeCodeFilters.includes(c.code || '');
        const matchesFreeText = searchInput.trim() === '' ||
            c.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            (c.code || '').toLowerCase().includes(searchInput.toLowerCase());
        return matchesCode && matchesFreeText;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/master" className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Tags size={20} className="text-blue-400" />
                            Kategori Barang
                        </h2>
                        <p className="text-[13px] text-slate-400 mt-0.5">Kelola data master kategori / jenis perangkat.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={exportToExcel} disabled={filtered.length === 0} className="px-3 sm:px-4 h-8 sm:h-9 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 font-sans">
                        <Download size={14} /> Export
                    </button>
                    <button type="button" onClick={() => { setIsImportOpen(true); setImportRows([]); }} className="px-3 sm:px-4 h-8 sm:h-9 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shrink-0 font-sans">
                        <Upload size={14} /> Import
                    </button>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary text-sm px-3 sm:px-4 h-8 sm:h-9 flex items-center gap-1.5 whitespace-nowrap rounded-lg transition-all font-semibold shrink-0 shadow-lg shadow-blue-500/20">
                        <Plus size={14} /> Tambah Kategori
                    </button>
                </div>
            </div>

            {/* Content Card */}
            <div className="card !p-0 overflow-hidden border border-[#1E293B]">
                {/* Toolbar */}
                <div className="p-4 border-b border-[#1E293B] bg-[#0F172A]/50 space-y-3">
                    <div className="relative max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-20" />
                        <input
                            type="text"
                            placeholder="Ketik untuk filter: nama, kode prefix..."
                            value={searchInput}
                            onChange={(e) => { setSearchInput(e.target.value); setIsSuggestionsOpen(true); }}
                            onFocus={() => { if (searchInput.trim().length > 0) setIsSuggestionsOpen(true); }}
                            className="w-full bg-[#020617] border border-[#1E293B] rounded-lg pl-8 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all font-medium"
                        />

                        {/* Autocomplete Suggestions */}
                        {isSuggestionsOpen && suggestions.length > 0 && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsSuggestionsOpen(false)} />
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#020617]/60 flex items-center gap-1.5">
                                            <Tags size={10} /> Kode Prefix
                                        </div>
                                        {suggestions.map(s => (
                                            <button key={`code-${s.value}`} onClick={() => addFilter(s)} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left hover:bg-blue-500/10 transition-colors">
                                                <Tags size={12} className="text-blue-400 shrink-0" />
                                                <span className="text-slate-300">{s.label}</span>
                                                <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+ filter</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Active Filter Badges */}
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter Aktif:</span>
                            {activeFilters.map((f, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all bg-blue-500/10 border-blue-500/20 text-blue-400">
                                    <Tags size={10} />
                                    <span className="text-[11px] font-medium">{f.label}</span>
                                    <button onClick={() => removeFilter(f)} className="ml-0.5 p-0.5 rounded-full transition-colors hover:bg-white/10">
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setActiveFilters([])} className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-2">
                                Reset Semua
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center pt-20 pb-20 gap-3">
                            <Loader2 size={24} className="text-blue-500 animate-spin" />
                            <p className="text-sm text-slate-500">Memuat kategori...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-20 pb-20 gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                                <Tags size={20} className="text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-500">{(searchInput || activeFilters.length > 0) ? "Tidak ada kategori yang cocok dengan filter." : "Tidak ada kategori ditemukan."}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="px-5 py-3 w-16 text-center">No</th>
                                    <th className="px-5 py-3">Nama Kategori</th>
                                    <th className="px-5 py-3">Kode Prefix</th>
                                    <th className="px-5 py-3 text-center">SN</th>
                                    <th className="px-5 py-3 text-center">Total Item</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filtered.map((cat, idx) => (
                                    <tr key={cat.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 text-center text-slate-500">{idx + 1}</td>
                                        <td className="px-5 py-3.5 font-medium text-white">{cat.name}</td>
                                        <td className="px-5 py-3.5">
                                            {cat.code ? (
                                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-mono">
                                                    {cat.code}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">Kosong</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {cat.hasSN ? (
                                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">SN</span>
                                            ) : (
                                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">Non-SN</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs">
                                                {cat._count?.item || 0} item
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/master/items?search=${cat.name}`}
                                                    className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-colors"
                                                    title="Lihat Daftar Barang"
                                                >
                                                    <Package size={15} />
                                                </Link>
                                                <button
                                                    onClick={() => handleOpenModal(cat)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => { setDeletingCat(cat); setIsDeleteModalOpen(true); setErrorMsg(""); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div >

            {/* Form Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                                <h3 className="font-bold text-white text-lg">
                                    {editingCat ? "Edit Kategori" : "Tambah Kategori"}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    {/* x icon */}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {errorMsg && !isDeleteModalOpen && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                                        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-400">{errorMsg}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Kategori <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                        placeholder="Contoh: Router, Switch..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kode Prefix</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 font-mono"
                                        placeholder="Contoh: RT, SW..."
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1.5">Opsional. Digunakan sebagai awalan jika ada auto-generate SN/Item Code.</p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={formData.hasSN}
                                                onChange={(e) => setFormData({ ...formData, hasSN: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-5 bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                                Memiliki Serial Number (SN)
                                            </span>
                                            <p className="text-[11px] text-slate-500">
                                                {formData.hasSN
                                                    ? 'Barang dalam kategori ini wajib scan SN saat masuk/keluar'
                                                    : 'Barang dalam kategori ini cukup input Qty saja (misal: kabel, konektor)'}
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">
                                        Batal
                                    </button>
                                    <button type="submit" disabled={submitLoading} className="flex-1 btn btn-primary py-2 text-sm">
                                        {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Simpan"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirm Modal */}
            {
                isDeleteModalOpen && deletingCat && (
                    <div className="fixed inset-0 z-[100] bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="font-bold text-white text-lg mb-2">Hapus Kategori?</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Anda yakin ingin menghapus kategori <span className="font-semibold text-white">"{deletingCat.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                            </p>

                            {errorMsg && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left mb-4 flex items-start gap-2">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-400">{errorMsg}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => { setIsDeleteModalOpen(false); setDeletingCat(null); setErrorMsg(""); }} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">
                                    Batal
                                </button>
                                <button onClick={handleDelete} disabled={submitLoading} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all text-sm font-medium">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Ya, Hapus"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── IMPORT EXCEL MODAL ── */}
            {isImportOpen && (
                <div className="fixed inset-0 z-[100] bg-[#020617]/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsImportOpen(false)}>
                    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#020617]/50">
                            <div>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    <FileSpreadsheet className="text-blue-400" size={20} />
                                    Import Kategori via Excel
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Unggah file Excel untuk menambah banyak kategori sekaligus secara batch</p>
                            </div>
                            <button type="button" onClick={() => setIsImportOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Upload & Instructions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border-2 border-dashed border-[#334155] hover:border-blue-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center group transition-all relative cursor-pointer font-sans">
                                    <input type="file" accept=".xlsx, .xls" onChange={handleCategoryFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Upload size={32} className="text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
                                    <p className="text-sm font-semibold text-white">Pilih File Excel atau Drag & Drop</p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">Format: .xlsx, .xls</p>
                                </div>
                                <div className="bg-[#020617]/40 border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between font-sans">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Panduan Kolom Excel</h4>
                                        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                                            <li><strong className="text-white font-medium">Nama Kategori</strong>: Wajib diisi (mis. Router, Switch)</li>
                                            <li><strong className="text-white font-medium">Kode Prefix</strong>: Opsional (mis. RT, SW). Digunakan awalan SN</li>
                                            <li><strong className="text-white font-medium">Memiliki SN? (YA/TIDAK)</strong>: Opsional, default YA.</li>
                                        </ul>
                                    </div>
                                    <button type="button" onClick={downloadTemplateCategory} className="mt-4 px-4 py-2 w-full rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
                                        <Download size={14} /> Download Template Excel
                                    </button>
                                </div>
                            </div>

                            {/* Preview Grid */}
                            {importRows.length > 0 && (
                                <div className="space-y-3 font-sans">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pratinjau & Validasi Data</h4>
                                        <span className="text-xs text-slate-500 font-mono">Total: <span className="text-white font-semibold font-sans">{importRows.length}</span> baris</span>
                                    </div>
                                    <div className="border border-[#1E293B] rounded-xl overflow-hidden bg-[#020617]/20">
                                        <div className="overflow-x-auto max-h-60 custom-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[#1E293B] bg-[#020617]/50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold sticky top-0 z-10">
                                                        <th className="px-4 py-2">Baris</th>
                                                        <th className="px-4 py-2">Nama Kategori</th>
                                                        <th className="px-4 py-2">Kode Prefix</th>
                                                        <th className="px-4 py-2 text-center">Tipe SN</th>
                                                        <th className="px-4 py-2 text-center w-40">Status / Catatan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-xs">
                                                    {importRows.map((row, idx) => {
                                                        const hasError = row.errors.length > 0;
                                                        const hasWarning = row.warnings.length > 0;
                                                        
                                                        let badgeBg = "bg-green-500/10 text-green-400 border-green-500/20";
                                                        let badgeText = "Valid";
                                                        if (hasError) {
                                                            badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
                                                            badgeText = row.errors.join(", ");
                                                        } else if (hasWarning) {
                                                            badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                                            badgeText = row.warnings.join(", ");
                                                        }

                                                        return (
                                                            <tr key={idx} className="border-b border-[#1E293B]/40 hover:bg-white/[0.01]">
                                                                <td className="px-4 py-2.5 font-mono text-slate-600">{idx + 1}</td>
                                                                <td className="px-4 py-2.5 text-white font-medium">{row.name || <span className="text-red-500/60 italic">Kosong</span>}</td>
                                                                <td className="px-4 py-2.5 text-slate-300 font-mono">{row.code || "-"}</td>
                                                                <td className="px-4 py-2.5 text-center text-slate-300">
                                                                    {row.hasSN ? (
                                                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">SN</span>
                                                                    ) : (
                                                                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">Non-SN</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold text-left max-w-full truncate ${badgeBg}`} title={badgeText}>
                                                                        {badgeText}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-[#1E293B] bg-[#020617]/50 flex items-center justify-between font-sans">
                            <button type="button" onClick={() => { setIsImportOpen(false); setImportRows([]); }} className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium">Batal</button>
                            <button
                                type="button"
                                onClick={submitCategoryImport}
                                disabled={importRows.length === 0 || importRows.some(r => r.errors.length > 0) || importLoading}
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-1.5 shrink-0"
                            >
                                {importLoading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                                {importRows.some(r => r.errors.length > 0) ? "Ada Error di Excel" : "Konfirmasi Impor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
