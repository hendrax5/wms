"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export async function getStockSummaryReport() {
    noStore();
    try {
        // Get all warehouses and their stock
        const warehouses = await prisma.warehouse.findMany({
            include: {
                warehousestock: {
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

            w.warehousestock.forEach((s: any) => {
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
            (prisma as any).stockIn.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    item: true,
                    warehouse: true,
                    stockinserial: true,
                }
            }),
            (prisma as any).stockOut.findMany({
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    item: true,
                    warehouse_stockout_warehouseIdTowarehouse: true,
                    warehouse_stockout_targetWarehouseIdTowarehouse: true,
                    pop: true,
                    stockoutserial: true,
                }
            })
        ]);

        const history: any[] = [];

        inbounds.forEach((i: any) => {
            const serials = (i.stockinserial || []).map((s: any) => s.serialCode);
            history.push({
                id: `in-${i.id}`,
                rawId: i.id,
                date: i.createdAt,
                type: "INBOUND",
                item: i.item.name,
                itemCode: i.item.code,
                qty: i.qty,
                location: i.warehouse.name,
                target: "-",
                description: i.description || "Penerimaan Barang",
                serialNumbers: serials,
                techName1: null,
                techName2: null,
            });
        });

        outbounds.forEach((o: any) => {
            let target = "-";
            const srcWarehouse = o.warehouse_stockout_warehouseIdTowarehouse || o.warehouse;
            const tgtWarehouse = o.warehouse_stockout_targetWarehouseIdTowarehouse || o.targetWarehouse;
            if (o.outType === "TRANSFER") target = tgtWarehouse?.name || "-";
            if (o.outType === "POP_INSTALL") target = o.pop?.name || "-";
            if (o.outType === "CUSTOMER_INSTALL") target = o.customerName || "-";

            const serials = (o.stockoutserial || []).map((s: any) => s.serialCode);
            history.push({
                id: `out-${o.id}`,
                rawId: o.id,
                date: o.createdAt,
                type: o.outType,
                item: o.item.name,
                itemCode: o.item.code,
                qty: o.qty,
                location: srcWarehouse?.name || '-',
                target: target,
                description: o.description || "Barang Keluar",
                serialNumbers: serials,
                techName1: o.techName1 || null,
                techName2: o.techName2 || null,
            });
        });

        // Sort combined descending
        history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { success: true, data: history.slice(0, limit) };
    } catch (error) {
        console.error("Trans History Error:", error);
        return { success: false, error: "Gagal memuat history transaksi" };
    }
}

export async function getDamagedItemsReport() {
    noStore();
    try {
        const damaged = await (prisma as any).damagedItem.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                item: { include: { category: true } },
                warehouse: true,
                damagedserial: true
            }
        });

        const data = damaged.map((d: any) => ({
            id: d.id,
            date: d.createdAt,
            itemName: d.item.name,
            category: d.item.category?.name || "-",
            warehouseName: d.warehouse.name,
            qty: d.qty,
            description: d.description,
            serialNumbers: (d.damagedserial || d.serials || []).map((s: any) => s.serialCode)
        }));

        return { success: true, data };
    } catch (error) {
        console.error("Damaged Report Error:", error);
        return { success: false, error: "Gagal memuat laporan barang rusak" };
    }
}

export async function getAssetMutationReport() {
    noStore();
    try {
        const assets = await (prisma as any).asset.findMany({
            orderBy: { installedAt: 'desc' },
            include: {
                item: { include: { category: true } },
                serialnumber: true,
                user: true,
            }
        });

        const USEFUL_LIFE_YEARS = 5;
        const data = assets.map((a: any) => {
            const ageMs = Date.now() - new Date(a.installedAt).getTime();
            const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
            const annual = (a.purchasePrice || 0) / USEFUL_LIFE_YEARS;
            const accumulated = Math.min(annual * ageYears, a.purchasePrice || 0);
            const bookValue = Math.max((a.purchasePrice || 0) - accumulated, 0);
            return {
                id: a.id,
                installedAt: a.installedAt,
                itemName: a.item?.name || '-',
                category: a.item?.category?.name || '-',
                serialCode: a.serialnumber?.code || '-',
                technicianName: a.user?.name || 'Tidak Ditugaskan',
                status: a.status,
                purchasePrice: a.purchasePrice || 0,
                bookValue: Math.round(bookValue),
            };
        });

        return { success: true, data };
    } catch (error) {
        console.error("Asset Mutation Report Error:", error);
        return { success: false, error: "Gagal memuat laporan mutasi aset" };
    }
}
