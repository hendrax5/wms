"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

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
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>Riwayat Aktivitas</CardTitle>
                    <div className="flex flex-col md:flex-row gap-3">
                        <Select value={actionFilter} onValueChange={(val) => handleFilterChange("action", val)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Semua Aksi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Aksi</SelectItem>
                                <SelectItem value="INBOUND_IMPORT">Inbound / Import</SelectItem>
                                <SelectItem value="OUTBOUND_INSTALLATION">Outbound / Instalasi</SelectItem>
                                <SelectItem value="TRANSFER">Transfer Antar Gudang</SelectItem>
                                <SelectItem value="RETURN">Return Barang</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={(val) => handleFilterChange("status", val)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Status</SelectItem>
                                <SelectItem value="SUCCESS">Sukses</SelectItem>
                                <SelectItem value="ERROR">Error</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Waktu</TableHead>
                                <TableHead>Aksi</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Gudang</TableHead>
                                <TableHead className="min-w-[300px]">Pesan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Tidak ada log aktivitas ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                initialData.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss", { locale: id })}
                                        </TableCell>
                                        <TableCell className="font-medium text-xs">
                                            {log.action}
                                        </TableCell>
                                        <TableCell>
                                            {log.status === "SUCCESS" ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Sukses
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                                                    <AlertCircle className="h-3 w-3" /> Error
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {log.warehouse?.name || "-"}
                                        </TableCell>
                                        <TableCell className="text-xs max-w-md break-words">
                                            {log.message}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="text-sm text-muted-foreground">
                            Halaman {currentPage} dari {totalPages}
                        </div>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
