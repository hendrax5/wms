import { Metadata } from "next";
import { Suspense } from "react";
import AuditLogsClient from "./AuditLogsClient";
import { getAuditLogs } from "@/app/actions/audit";

export const metadata: Metadata = {
    title: "System Logs | WMS",
    description: "System Activity and Audit Logs",
};

export default async function AuditLogsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const action = typeof searchParams.action === 'string' ? searchParams.action : undefined;
    const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;

    const res = await getAuditLogs({ limit, offset, action, status });
    const logs = res.success ? res.data : [];
    const total = res.success ? res.total : 0;
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Logs</h1>
                    <p className="text-slate-400 mt-1">Riwayat aktivitas sistem dan hasil transaksi.</p>
                </div>
            </div>

            <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading logs...</div>}>
                <AuditLogsClient 
                    initialData={logs} 
                    totalPages={totalPages} 
                    currentPage={page} 
                />
            </Suspense>
        </div>
    );
}
