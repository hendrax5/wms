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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
                <p className="text-muted-foreground">
                    Riwayat aktivitas sistem dan hasil transaksi.
                </p>
            </div>

            <Suspense fallback={<div>Loading logs...</div>}>
                <AuditLogsClient 
                    initialData={logs} 
                    totalPages={totalPages} 
                    currentPage={page} 
                />
            </Suspense>
        </div>
    );
}
