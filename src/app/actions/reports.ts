"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export async function getStockSummaryReport() {
    noStore();
    try {
        // Get all warehouses and their stock
        const warehouses = await prisma.warehouse.findMany({
            include: {
                stocks: {
                    include: {
                        item: {
                            include: { category: true }
                        }
                    }
                }
            }
        });

        // Compute total per category per warehouse
        const data = warehouses.map(w => {
            let totalNew = 0;
            let totalDismantle = 0;
            let totalDamaged = 0;

            const categories: Record<string, number> = {};

            w.stocks.forEach(s => {
                totalNew += s.stockNew;
                totalDismantle += s.stockDismantle;
                totalDamaged += s.stockDamaged;

                const catName = s.item.category?.name || "Uncategorized";
                if (!categories[catName]) categories[catName] = 0;
                categories[catName] += (s.stockNew + s.stockDismantle);
            });

            return {
                warehouseId: w.id,
                warehouseName: w.name,
                type: w.type,
                totalNew,
                totalDismantle,
                totalDamaged,
                totalActive: totalNew + totalDismantle,
                categories
            };
        });

        return { success: true, data };
    } catch (error) {
        console.error("Stock Summary Error:", error);
        return { success: false, error: "Gagal memuat laporan stok" };
    }
}

export async function getTransactionHistoryReport(limit = 50) {
    noStore();
    try {
        const [inbounds, outbounds] = await Promise.all([
            prisma.stockIn.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    item: true,
                    warehouse: true,
                }
            }),
            prisma.stockOut.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    item: true,
                    warehouse: true,
                    targetWarehouse: true,
                    pop: true,
                }
            })
        ]);

        const history: any[] = [];

        inbounds.forEach(i => {
            history.push({
                id: `in-${i.id}`,
                date: i.createdAt,
                type: "INBOUND",
                item: i.item.name,
                qty: i.qty,
                location: i.warehouse.name,
                target: "-",
                description: i.description || "Penerimaan Barang"
            });
        });

        outbounds.forEach(o => {
            let target = "-";
            if (o.outType === "TRANSFER") target = o.targetWarehouse?.name || "-";
            if (o.outType === "POP_INSTALL") target = o.pop?.name || "-";
            if (o.outType === "CUSTOMER_INSTALL") target = o.customerName || "-";

            history.push({
                id: `out-${o.id}`,
                date: o.createdAt,
                type: o.outType,
                item: o.item.name,
                qty: o.qty,
                location: o.warehouse.name,
                target: target,
                description: o.description || "Barang Keluar"
            });
        });

        // Sort combined descending
        history.sort((a, b) => b.date.getTime() - a.date.getTime());

        return { success: true, data: history.slice(0, limit) };
    } catch (error) {
        console.error("Trans History Error:", error);
        return { success: false, error: "Gagal memuat history transaksi" };
    }
}

export async function getDamagedItemsReport() {
    noStore();
    try {
        const damaged = await prisma.damagedItem.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                item: { include: { category: true } },
                warehouse: true,
                serials: true
            }
        });

        const data = damaged.map(d => ({
            id: d.id,
            date: d.createdAt,
            itemName: d.item.name,
            category: d.item.category?.name || "-",
            warehouseName: d.warehouse.name,
            qty: d.qty,
            description: d.description,
            serialNumbers: d.serials.map(s => s.serialCode)
        }));

        return { success: true, data };
    } catch (error) {
        console.error("Damaged Report Error:", error);
        return { success: false, error: "Gagal memuat laporan barang rusak" };
    }
}
