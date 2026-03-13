import { Suspense } from "react";
import ItemDetailClient from "./ItemDetailClient";
import { Loader2 } from "lucide-react";

export default function ItemDetailMasterPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-400 w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Menghubungkan ke basis data...</p>
            </div>
        }>
            <ItemDetailClient />
        </Suspense>
    );
}
