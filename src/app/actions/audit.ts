"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function logAudit(data: {
    action: string;
    status: "SUCCESS" | "ERROR";
    userId?: number | null;
    warehouseId?: number | null;
    message: string;
    details?: string | null;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                action: data.action,
                status: data.status,
                userId: data.userId,
                warehouseId: data.warehouseId,
                message: data.message,
                details: data.details,
            }
        });
    } catch (error) {
        // Silently fail logging so it doesn't break the main transaction
        console.error("Failed to write to AuditLog:", error);
    }
}

export async function getAuditLogs(params?: { limit?: number; offset?: number; status?: string; action?: string }) {
    try {
        const { limit = 100, offset = 0, status, action } = params || {};
        
        const where: any = {};
        if (status) where.status = status;
        if (action) where.action = action;

        const logs = await prisma.auditLog.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } },
                warehouse: { select: { name: true } },
            }
        });

        const total = await prisma.auditLog.count({ where });

        return { success: true, data: logs, total };
    } catch (error) {
        console.error("Failed to fetch AuditLogs:", error);
        return { success: false, error: "Gagal memuat log sistem", data: [], total: 0 };
    }
}
