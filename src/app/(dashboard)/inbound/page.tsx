import InboundClient from "./InboundClient";

export default function InboundPage() {
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Barang Masuk (Inbound)</h1>
                    <p className="text-slate-400 mt-1">Catat penerimaan barang baru ke gudang menggunakan barcode scanner</p>
                </div>
            </div>

            <InboundClient />
        </div>
    );
}
