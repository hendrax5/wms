import { useState } from "react";
import { X, Save, Building } from "lucide-react";

export type PopData = {
    id?: number;
    name: string;
    location: string | null;
    areaId: number | null;
    warehouseId: number | null;
};

type Props = {
    initialData?: PopData;
    areas: { id: number; name: string }[];
    warehouses: { id: number; name: string; type: string }[];
    onClose: () => void;
    onSubmit: (formData: FormData, id?: number) => Promise<{ success: boolean; error?: string }>;
};

export default function PopForm({ initialData, areas, warehouses, onClose, onSubmit }: Props) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-[#334155]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <Building size={20} />
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                            {initialData ? "Edit Point of Presence (POP)" : "Tambah POP Baru"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama POP *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                defaultValue={initialData?.name}
                                placeholder="Masukkan nama POP (contoh: POP Sudirman)"
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Gudang Pengelola (Opsional)</label>
                            <select
                                name="warehouseId"
                                defaultValue={initialData?.warehouseId || ""}
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            >
                                <option value="">Tidak ada gudang spesifik...</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Area (Opsional)</label>
                            <select
                                name="areaId"
                                defaultValue={initialData?.areaId || ""}
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            >
                                <option value="">Pilih Area...</option>
                                {areas.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Lokasi / Alamat</label>
                            <input
                                type="text"
                                name="location"
                                defaultValue={initialData?.location || ""}
                                placeholder="Masukkan lokasi detail (opsional)"
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>Menyimpan...</>
                            ) : (
                                <>
                                    <Save size={18} /> Simpan POP
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
