import { Suspense } from "react";
import ItemsClient from "./ItemsClient";
import { Loader2 } from "lucide-react";

export default function ItemsMasterPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex justify-center flex-col items-center gap-4 py-20">
                <Loader2 className="animate-spin text-green-500" size={32} />
                <p className="text-slate-500 text-sm">Menyiapkan daftar barang...</p>
            </div>
        }>
            <ItemsClient />
        </Suspense>
    );
}
