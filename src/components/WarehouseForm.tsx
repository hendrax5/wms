import { useState } from "react";
import { X, Save, Building2 } from "lucide-react";
import { WarehouseType } from "@prisma/client";

export type WarehouseData = {
    id?: number;
    name: string;
    location: string | null;
    type: WarehouseType;
    areaId: number | null;
};

type Props = {
    initialData?: WarehouseData;
    areas: { id: number; name: string }[];
    onClose: () => void;
    onSubmit: (formData: FormData, id?: number) => Promise<{ success: boolean; error?: string }>;
};

export default function WarehouseForm({ initialData, areas, onClose, onSubmit }: Props) {
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
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Building2 size={20} />
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                            {initialData ? "Edit Gudang/Cabang" : "Tambah Gudang Baru"}
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
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Gudang/Cabang *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                defaultValue={initialData?.name}
                                placeholder="Masukkan nama (contoh: Gudang Pusat Jakarta)"
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipe Gudang *</label>
                            <select
                                name="type"
                                required
                                defaultValue={initialData?.type || "CABANG"}
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            >
                                <option value="CABANG">Cabang</option>
                                <option value="PUSAT">Pusat</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Area (Opsional)</label>
                            <select
                                name="areaId"
                                defaultValue={initialData?.areaId || ""}
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            >
                                <option value="">Pilih Area...</option>
                                {areas.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Lokasi / Keterangan Alamat</label>
                            <input
                                type="text"
                                name="location"
                                defaultValue={initialData?.location || ""}
                                placeholder="Masukkan lokasi detail (opsional)"
                                className="w-full bg-slate-900 border border-[#334155] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                            className="px-5 py-2.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>Menyimpan...</>
                            ) : (
                                <>
                                    <Save size={18} /> Simpan Gudang
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
