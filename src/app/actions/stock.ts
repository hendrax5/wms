"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export async function getStockOverview(warehouseId?: number) {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }

        const whereClause = warehouseId ? { warehouseId } : {};

        const stocks = await prisma.warehouseStock.findMany({
            where: whereClause,
            include: {
                item: {
                    include: {
                        category: true
                    }
                },
                warehouse: true
            },
            orderBy: [
                { item: { name: 'asc' } },
                { warehouse: { name: 'asc' } }
            ]
        });

        return { success: true, data: stocks };
    } catch (error) {
        return { success: false, error: "Gagal memuat data stok" };
    }
}
