"use server";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";

// Returns warehouseId if user should be scoped to a branch, null if global access
async function getBranchScope(): Promise<number | null> {
    const session = await auth();
    if (!session?.user) return null;
    const level = session.user.level;
    // MASTER always sees everything
    if (level === "MASTER") return null;
    // Any other role with a warehouseId is scoped to that branch
    return session.user.warehouseId ?? null;
}

export async function getDashboardStats() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return {
                success: true, data: {
                    totalItems: 0, totalFisik: 0, totalSN: 0, trxToday: 0
                }
            };
        }

        const warehouseId = await getBranchScope();
        const today = {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
        };

        const [stocks, totalSN, stockInToday, stockOutToday] = await Promise.all([
            prisma.warehouseStock.findMany({
                where: warehouseId ? { warehouseId } : undefined,
                select: { stockNew: true, stockDismantle: true, stockDamaged: true, itemId: true }
            }),
            prisma.serialNumber.count({
                where: warehouseId ? { warehouseId } : undefined,
            }),
            prisma.stockIn.count({
                where: { ...(warehouseId ? { warehouseId } : {}), createdAt: today }
            }),
            prisma.stockOut.count({
                where: { ...(warehouseId ? { warehouseId } : {}), createdAt: today }
            })
        ]);

        const totalFisik = stocks.reduce((acc, curr) => acc + curr.stockNew + curr.stockDismantle + curr.stockDamaged, 0);
        // Count only unique items in this warehouse
        const totalItems = warehouseId
            ? new Set(stocks.map(s => s.itemId)).size
            : await prisma.item.count();

        return {
            success: true,
            data: { totalItems, totalFisik, totalSN, trxToday: stockInToday + stockOutToday }
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

        const warehouseId = await getBranchScope();

        const stocks = await prisma.warehouseStock.findMany({
            where: {
                minStock: { gt: 0 },
                ...(warehouseId ? { warehouseId } : {})
            },
            include: { item: true, warehouse: true }
        });

        const lowStocks = stocks.filter(stock => {
            const sum = stock.stockNew + stock.stockDismantle + stock.stockDamaged;
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

        const warehouseId = await getBranchScope();

        const [ins, outs] = await Promise.all([
            prisma.stockIn.findMany({
                where: warehouseId ? { warehouseId } : undefined,
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { item: true, warehouse: true }
            }),
            prisma.stockOut.findMany({
                where: warehouseId ? { warehouseId } : undefined,
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { item: true, warehouse: true }
            })
        ]);

        const combined = [
            ...ins.map(i => ({
                id: `in-${i.id}`, type: 'IN', date: i.createdAt,
                itemName: i.item.name, qty: i.qty, location: i.warehouse.name
            })),
            ...outs.map(o => ({
                id: `out-${o.id}`, type: 'OUT', date: o.createdAt,
                itemName: o.item.name, qty: o.qty, location: o.warehouse.name
            }))
        ];

        combined.sort((a, b) => b.date.getTime() - a.date.getTime());
        return { success: true, data: combined.slice(0, 10) };
    } catch (error) {
        return { success: false, error: "Gagal memuat aktivitas terbaru" };
    }
}
