import { Suspense } from "react";
import OperasiStokClient from "./OperasiStokClient";

export default function OperasiPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <OperasiStokClient />
        </Suspense>
    );
}
