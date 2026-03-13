"use client";

import { useState } from "react";
import { X } from "lucide-react";

type CategoryFormProps = {
    initialData?: { id: number; name: string; code: string | null };
    onClose: () => void;
    onSubmit: (formData: FormData, id?: number) => Promise<{ success: boolean; error?: string }>;
};

export default function CategoryForm({ initialData, onClose, onSubmit }: CategoryFormProps) {
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
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl w-full max-w-md shadow-2xl animate-slide-in">
                <div className="flex items-center justify-between p-6 border-b border-[#334155]">
                    <h2 className="text-xl font-bold text-white">
                        {initialData ? "Edit Kategori" : "Tambah Kategori Baru"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nama Kategori <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            type="text"
                            defaultValue={initialData?.name}
                            required
                            placeholder="Contoh: Switch"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Kode Kategori
                        </label>
                        <input
                            name="code"
                            type="text"
                            defaultValue={initialData?.code || ""}
                            placeholder="Contoh: SW"
                            className="w-full"
                        />
                        <p className="mt-1 text-xs text-slate-500">Opsional. Berguna untuk sinkronisasi kode barcode.</p>
                    </div>

                    <div className="pt-4 flex gap-3 justify-end">
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
