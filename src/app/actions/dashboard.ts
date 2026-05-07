"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import { auth, getBranchScope } from "@/lib/auth";

async function getDashboardFilter() {
    const session = await auth();
    const branchId = await getBranchScope();
    
    if (branchId) return branchId;
    
    if (session?.user && session.user.level !== "MASTER" && session.user.accessibleWarehouseIds?.length) {
        return { in: session.user.accessibleWarehouseIds };
    }
    
    return undefined;
}

export async function getDashboardStats() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return {
                success: true, data: {
                    totalItems: 0, totalFisik: 0, totalSN: 0,
                    trxToday: 0, trxIn: 0, trxOut: 0, trxYesterday: 0
                }
            };
        }

        const warehouseFilter = await getDashboardFilter();

        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd   = new Date(todayEnd);   yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

        const today = { gte: todayStart, lte: todayEnd };
        const yesterday = { gte: yesterdayStart, lte: yesterdayEnd };

        const [stocks, totalSN, stockInToday, stockOutToday, stockInYesterday, stockOutYesterday] = await Promise.all([
            prisma.warehouseStock.findMany({
                where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
                select: { stockNew: true, stockDismantle: true, stockDamaged: true, itemId: true }
            }),
            prisma.serialNumber.count({
                where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
            }),
            prisma.stockIn.count({
                where: { ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}), createdAt: today }
            }),
            prisma.stockOut.count({
                where: { ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}), createdAt: today }
            }),
            prisma.stockIn.count({
                where: { ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}), createdAt: yesterday }
            }),
            prisma.stockOut.count({
                where: { ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}), createdAt: yesterday }
            }),
        ]);

        const totalFisik = stocks.reduce((acc, curr) => acc + curr.stockNew + curr.stockDismantle, 0); // Exclude stockDamaged
        const totalItems = warehouseFilter
            ? new Set(stocks.map(s => s.itemId)).size
            : await prisma.item.count();

        const trxToday = stockInToday + stockOutToday;
        const trxYesterday = stockInYesterday + stockOutYesterday;

        return {
            success: true,
            data: { totalItems, totalFisik, totalSN, trxToday, trxIn: stockInToday, trxOut: stockOutToday, trxYesterday }
        };
    } catch (error) {
        console.error("DASHBOARD STATS ERROR", error);
        return { success: false, error: "Gagal memuat statistik dashboard" };
    }
}

export async function getLowStockAlerts() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }

        const warehouseFilter = await getDashboardFilter();

        const stocks = await prisma.warehouseStock.findMany({
            where: {
                minStock: { gt: 0 },
                ...(warehouseFilter ? { warehouseId: warehouseFilter } : {})
            },
            include: { item: true, warehouse: true }
        });

        const lowStocks = stocks.filter(stock => {
            const sum = stock.stockNew + stock.stockDismantle; // Exclude stockDamaged
            return sum <= stock.minStock;
        });

        return { success: true, data: lowStocks };
    } catch (error) {
        return { success: false, error: "Gagal memuat alert stok minimum" };
    }
}

export async function getRecentTransactions() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }

        const warehouseFilter = await getDashboardFilter();

        const [ins, outsRaw] = await Promise.all([
            prisma.stockIn.findMany({
                where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
                take: 6,
                orderBy: { createdAt: 'desc' },
                include: { item: true, warehouse: true }
            }),
            prisma.stockOut.findMany({
                where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
                take: 6,
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, itemId: true, qty: true, warehouseId: true, location: true }
            })
        ]);

        // StockOut has no direct relations — resolve item names separately
        const outItemIds = [...new Set(outsRaw.map(o => o.itemId))];
        const outWarehouseIds = [...new Set(outsRaw.map(o => o.warehouseId))];
        const [outItems, outWarehouses] = await Promise.all([
            prisma.item.findMany({ where: { id: { in: outItemIds } }, select: { id: true, name: true } }),
            prisma.warehouse.findMany({ where: { id: { in: outWarehouseIds } }, select: { id: true, name: true } }),
        ]);
        const itemMap = Object.fromEntries(outItems.map(i => [i.id, i.name]));
        const whMap = Object.fromEntries(outWarehouses.map(w => [w.id, w.name]));

        const outs = outsRaw.map(o => ({
            id: `out-${o.id}`,
            type: 'OUT' as const,
            date: o.createdAt,
            itemName: itemMap[o.itemId] ?? 'Unknown',
            qty: o.qty,
            location: whMap[o.warehouseId] ?? (o.location ?? '-'),
        }));

        const combined = [
            ...ins.map(i => ({
                id: `in-${i.id}`, type: 'IN' as const, date: i.createdAt,
                itemName: i.item.name, qty: i.qty, location: i.warehouse.name
            })),
            ...outs
        ];

        combined.sort((a, b) => b.date.getTime() - a.date.getTime());
        return { success: true, data: combined.slice(0, 12) };
    } catch (error) {
        return { success: false, error: "Gagal memuat aktivitas terbaru" };
    }
}
