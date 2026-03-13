import DamagedClient from "./DamagedClient";

export default function DamagedPage() {
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-red-400">Pencatatan Barang Rusak</h1>
                    <p className="text-slate-400 mt-1">Laporkan unit hardware yang mati/rusak dan kurangi saldo fisik Gudang</p>
                </div>
            </div>

            <DamagedClient />
        </div>
    );
}
