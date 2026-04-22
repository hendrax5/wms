"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLogsClientProps {
    initialData: any[];
    totalPages: number;
    currentPage: number;
}

export default function AuditLogsClient({ initialData, totalPages, currentPage }: AuditLogsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
    const [actionFilter, setActionFilter] = useState(searchParams.get("action") || "ALL");

    const handleFilterChange = (type: "status" | "action", value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        
        if (type === "status") {
            setStatusFilter(value);
            if (value === "ALL") params.delete("status");
            else params.set("status", value);
        } else {
            setActionFilter(value);
            if (value === "ALL") params.delete("action");
            else params.set("action", value);
        }

        params.set("page", "1"); // reset to page 1 on filter
        router.push(`/logs?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/logs?${params.toString()}`);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Riwayat Aktivitas</h2>
                    <div className="flex flex-col md:flex-row gap-3">
                        <select 
                            value={actionFilter} 
                            onChange={(e) => handleFilterChange("action", e.target.value)}
                            className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 min-w-[180px]"
                        >
                            <option value="ALL">Semua Aksi</option>
                            <option value="INBOUND_IMPORT">Inbound / Import</option>
                            <option value="OUTBOUND_INSTALLATION">Outbound / Instalasi</option>
                            <option value="TRANSFER">Transfer Antar Gudang</option>
                            <option value="RETURN">Return Barang</option>
                        </select>

                        <select 
                            value={statusFilter} 
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 min-w-[150px]"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="SUCCESS">Sukses</option>
                            <option value="ERROR">Error</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-medium">Waktu</th>
                                <th className="px-6 py-3 font-medium">Aksi</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Gudang</th>
                                <th className="px-6 py-3 font-medium">Pesan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {initialData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Tidak ada log aktivitas ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                initialData.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                            {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss", { locale: id })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-xs text-slate-700">
                                            {log.action}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.status === "SUCCESS" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Sukses
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                    <AlertCircle className="h-3.5 w-3.5" /> Error
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                                            {log.warehouse?.name || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-600 max-w-md break-words">
                                            {log.message}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                        <div className="text-sm text-slate-500">
                            Halaman <span className="font-medium text-slate-900">{currentPage}</span> dari <span className="font-medium text-slate-900">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
