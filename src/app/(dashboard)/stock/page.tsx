import { Suspense } from "react";
import StockIndexClient from "./StockIndexClient";
import { Loader2 } from "lucide-react";

export default function StockIndexPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex justify-center flex-col items-center gap-4 py-20">
                <Loader2 className="animate-spin text-amber-500" size={32} />
                <p className="text-slate-500 text-sm">Memuat Direktori Gudang...</p>
            </div>
        }>
            <StockIndexClient />
        </Suspense>
    );
}
