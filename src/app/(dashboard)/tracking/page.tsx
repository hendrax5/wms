import TrackingClient from "./TrackingClient";

export default function TrackingPage() {
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#334155]/50 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Lacak Perangkat (Traceability)</h1>
                    <p className="text-slate-400 mt-1">Cari histori dan jejak rekam pergerakan fisik berdasarkan Serial Number (SN)</p>
                </div>
            </div>

            <TrackingClient />
        </div>
    );
}
