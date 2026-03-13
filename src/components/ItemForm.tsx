"use client";

import { useState } from "react";
import { X } from "lucide-react";

type ItemFormProps = {
    initialData?: {
        id: number;
        code: string;
        name: string;
        categoryId: number;
        minStock: number;
        hasSN: boolean;
    };
    categories: { id: number; name: string; code: string | null }[];
    onClose: () => void;
    onSubmit: (formData: FormData, id?: number) => Promise<{ success: boolean; error?: string }>;
};

export default function ItemForm({ initialData, categories, onClose, onSubmit }: ItemFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const res = await onSubmit(formData, initialData?.id);

        if (res.success) {
            onClose();
        } else {
            setError(res.error || "Terjadi kesalahan");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl w-full max-w-lg shadow-2xl animate-slide-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-[#334155] sticky top-0 bg-[#1e293b]/95 backdrop-blur z-10">
                    <h2 className="text-xl font-bold text-white">
                        {initialData ? "Edit Barang Master" : "Tambah Barang Master"}
                    </h2>
                    <button
                        onClick={onClose}
                        type="button"
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Kode Barang <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="code"
                                type="text"
                                defaultValue={initialData?.code}
                                required
                                placeholder="Contoh: SW-RB4011"
                                className="w-full"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nama Barang <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={initialData?.name}
                                required
                                placeholder="Contoh: Mikrotik Routerboard"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Kategori <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="categoryId"
                                required
                                defaultValue={initialData?.categoryId || ""}
                                className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            >
                                <option value="" disabled>Pilih kategori...</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Minimal Stok
                            </label>
                            <input
                                name="minStock"
                                type="number"
                                min="0"
                                defaultValue={initialData?.minStock ?? 0}
                                className="w-full"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">Peringatan jika stok dibawah angka ini.</p>
                        </div>

                        <div className="md:col-span-2 mt-2">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-[#334155] hover:bg-slate-800/30 transition-colors">
                                <input
                                    type="checkbox"
                                    name="hasSN"
                                    defaultChecked={initialData?.hasSN ?? true}
                                    className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-800"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-slate-300">Wajib Tag Serial Number (S/N)</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">Centang jika barang ini butuh tracking serial masuk/keluar.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 justify-end sticky bottom-0 bg-[#1e293b] pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn btn-secondary"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary min-w-24"
                        >
                            {loading ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
