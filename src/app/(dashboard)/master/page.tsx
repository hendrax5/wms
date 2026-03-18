import { Suspense } from "react";
import InventoryMasterClient from "./InventoryMasterClient";
import { Loader2 } from "lucide-react";

export default function MasterDataHub() {
    return (
        <Suspense fallback={
            <div className="p-8 flex justify-center flex-col items-center gap-4 py-20">
                <Loader2 className="animate-spin text-green-500" size={32} />
                <p className="text-slate-500 text-sm">Menyiapkan Inventory Master...</p>
            </div>
        }>
            <InventoryMasterClient />
        </Suspense>
    );
}
