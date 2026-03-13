import PopClient from "./PopClient";

export default function PopsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Point of Presence (POP)</h1>
                    <p className="text-slate-400 mt-1">Kelola daftar lokasi POP dan pemetaannya ke Gudang/Cabang</p>
                </div>
            </div>

            <PopClient />
        </div>
    );
}
