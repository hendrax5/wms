"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

// Returns warehouseId if user should be scoped to a branch, null if global access
async function getBranchScope(): Promise<number | null> {
    const session = await auth();
    if (!session?.user) return null;
    if (session.user.level === "MASTER") return null;  // MASTER sees all
    return session.user.warehouseId ?? null;           // anyone else with warehouseId is scoped
}

// ------------------------------------------------------------------
// CATEGORIES
// ------------------------------------------------------------------

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { item: true }
                }
            }
        });
        return { success: true, data: categories };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createCategory(data: { name: string; code?: string; hasSN?: boolean }) {
    try {
        const res = await prisma.category.create({ data: { ...data, hasSN: data.hasSN ?? true, updatedAt: new Date() } });
        revalidatePath("/master/categories");
        revalidatePath("/master/items");
        return { success: true, data: res };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateCategory(id: number, data: { name: string; code?: string; hasSN?: boolean }) {
    try {
        const res = await prisma.category.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        revalidatePath("/master/categories");
        revalidatePath("/master/items");
        return { success: true, data: res };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteCategory(id: number) {
    try {
        await prisma.category.delete({ where: { id } });
        revalidatePath("/master/categories");
        revalidatePath("/master/items");
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2003') {
            return { success: false, error: "Kategori tidak dapat dihapus karena masih digunakan oleh beberapa item." };
        }
        return { success: false, error: e.message };
    }
}

// ------------------------------------------------------------------
// ITEMS
// ------------------------------------------------------------------

export async function getItems() {
    try {
        const items = await prisma.item.findMany({
            include: { category: true },
            orderBy: { name: 'asc' }
        });

        const warehouseId = await getBranchScope();

        const stocks = await (prisma as any).warehouseStock.groupBy({
            by: ['itemId'],
            where: warehouseId ? { warehouseId } : undefined,
            _sum: { stockNew: true, stockDismantle: true, stockDamaged: true }
        });

        const stockMap = stocks.reduce((acc: Record<number, number>, curr: any) => {
            acc[curr.itemId] = (curr._sum.stockNew || 0) + (curr._sum.stockDismantle || 0) + (curr._sum.stockDamaged || 0);
            return acc;
        }, {} as Record<number, number>);

        const snCounts = await (prisma as any).serialNumber.groupBy({
            by: ['itemId'],
            where: warehouseId ? { warehouseId } : undefined,
            _count: { id: true }
        });
        const snCountMap = snCounts.reduce((acc: Record<number, number>, curr: any) => {
            acc[curr.itemId] = curr._count.id || 0;
            return acc;
        }, {} as Record<number, number>);

        const fullItems = items.map((item: any) => ({
            ...item,
            totalFisik: stockMap[item.id] || 0,
            snCount: snCountMap[item.id] || 0
        }));

        if (warehouseId) {
            const itemIdsInWarehouse = new Set(stocks.map((s: any) => s.itemId));
            return { success: true, data: fullItems.filter((item: any) => itemIdsInWarehouse.has(item.id)) };
        }

        return { success: true, data: fullItems };
    } catch (e: any) {
        console.error("GET ITEMS ERROR", e?.message);
        return { success: false, error: e.message };
    }
}


export async function getItemDetails(id: number) {
    try {
        const warehouseId = await getBranchScope();

        const item = await prisma.item.findUnique({
            where: { id },
            include: {
                category: true,
                warehousestock: {
                    where: warehouseId ? { warehouseId } : undefined,
                    include: { warehouse: true }
                } as any,
                serialnumber: {
                    where: warehouseId ? { warehouseId } : undefined,
                    include: {
                        itemstatus: true,
                        warehouse: true,
                        pop: true,
                        itemtype: true
                    },
                    orderBy: { id: 'desc' } as any,
                    take: 500
                } as any
            }
        } as any);

        if (!item) throw new Error("Item not found");

        const warehouseStocks = item.warehousestock || [];
        const serialNumbers = item.serialnumber || [];
        const totalFisik = warehouseStocks.reduce((acc: number, curr: any) => acc + curr.stockNew + curr.stockDismantle + curr.stockDamaged, 0);

        // Normalize SN status/type property names for the client
        const normalizedSNs = serialNumbers.map((sn: any) => ({
            ...sn,
            status: sn.itemstatus || sn.status || null,
            type: sn.itemtype || sn.type || null,
        }));

        return {
            success: true,
            data: {
                ...item,
                stocks: warehouseStocks,
                serialNumbers: normalizedSNs,
                totalFisik
            }
        };
    } catch (e: any) {
        console.error("GET ITEM DETAILS ERROR for id:", id, e?.message);
        
        // Fallback: try to get the item without serial numbers
        try {
            const itemBasic = await prisma.item.findUnique({
                where: { id },
                include: {
                    category: true,
                }
            });
            if (itemBasic) {
                // Get warehouse stocks separately
                const stocks = await (prisma as any).warehouseStock.findMany({
                    where: { itemId: id },
                    include: { warehouse: true }
                });
                const totalFisik = stocks.reduce((acc: number, curr: any) => acc + (curr.stockNew || 0) + (curr.stockDismantle || 0) + (curr.stockDamaged || 0), 0);

                return {
                    success: true,
                    data: {
                        ...itemBasic,
                        stocks,
                        serialNumbers: [],
                        totalFisik,
                        _snError: e.message
                    }
                };
            }
        } catch (fallbackErr: any) {
            console.error("FALLBACK ALSO FAILED:", fallbackErr?.message);
        }
        
        return { success: false, error: e.message };
    }
}


// ------------------------------------------------------------------
// SERIAL NUMBERS
// ------------------------------------------------------------------

export async function getAllSerialNumbers() {
    try {
        const warehouseId = await getBranchScope();

        const sns = await (prisma as any).serialNumber.findMany({
            where: warehouseId ? { warehouseId } : undefined,
            include: {
                item: { include: { category: true } },
                itemstatus: true,
                itemtype: true,
                warehouse: true,
                pop: true
            },
            orderBy: { updatedAt: 'desc' }
        });
        return { success: true, data: sns };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function searchBySerialNumber(code: string) {
    try {
        const sn = await (prisma as any).serialNumber.findMany({
            where: { code: { contains: code } },
            select: {
                id: true,
                code: true,
                itemId: true,
                item: { select: { id: true, name: true, code: true } },
                itemstatus: { select: { name: true } },
                warehouse: { select: { name: true } },
            },
            take: 10,
        });
        return { success: true, data: sn };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getSerialNumberHistory(id: number) {
    try {
        const snRaw = await prisma.serialNumber.findUnique({
            where: { id },
            include: {
                item: { include: { category: true } },
                itemstatus: true,
                itemtype: true,
                warehouse: true,
                pop: true
            }
        });

        if (!snRaw) throw new Error("Serial Number not found");

        // Normalize for client
        const sn = {
            ...snRaw,
            status: (snRaw as any).itemstatus,
            type: (snRaw as any).itemtype,
        };

        // Fetch all related transactions for the timeline
        const [inLogs, outLogs, damagedLogs, popInstalls, custInstalls] = await Promise.all([
            prisma.stockInSerial.findMany({
                where: { serialNumberId: id },
                include: { stockin: { include: { warehouse: true, distributor: true } } }
            }),
            prisma.stockOutSerial.findMany({
                where: { serialNumberId: id },
                include: { stockout: { include: { warehouse_stockout_warehouseIdTowarehouse: true, warehouse_stockout_targetWarehouseIdTowarehouse: true, pop: true } } }
            }),
            prisma.damagedSerial.findMany({
                where: { serialNumberId: id },
                include: { damageditem: { include: { warehouse: true } } }
            }),
            prisma.popInstallation.findMany({
                where: { serialNumberId: id },
                include: { pop: true }
            }),
            prisma.customerInstallation.findMany({
                where: { serialNumberId: id }
            })
        ]);

        // Standardize timeline events
        type TimelineEvent = {
            id: string;
            date: Date;
            type: 'INBOUND' | 'TRANSFER' | 'POP_INSTALL' | 'CUSTOMER_INSTALL' | 'DAMAGED' | 'DISMANTLE';
            title: string;
            description: string;
            location: string;
            actor?: string;
        };

        const timeline: TimelineEvent[] = [];

        inLogs.forEach((log: any) => {
            const si = log.stockin || log.stockIn;
            timeline.push({
                id: `in-${log.id}`,
                date: si.createdAt,
                type: 'INBOUND',
                title: 'Barang Masuk (Inbound)',
                description: `Diterima dari ${si.distributor?.vendorName || 'Vendor'}. Keterangan: ${si.description || '-'}`,
                location: `Gudang: ${si.warehouse.name}`,
            });
        });

        outLogs.forEach((log: any) => {
            const out = log.stockout || log.stockOut;
            const srcWarehouse = out.warehouse_stockout_warehouseIdTowarehouse || out.warehouse;
            const tgtWarehouse = out.warehouse_stockout_targetWarehouseIdTowarehouse || out.targetWarehouse;
            if (out.outType === 'TRANSFER') {
                timeline.push({
                    id: `out-${log.id}`,
                    date: out.createdAt,
                    type: 'TRANSFER',
                    title: 'Transfer Antar Gudang',
                    description: `Dikirim via ${out.techName1 || 'Teknisi'}. Keterangan: ${out.description || '-'}`,
                    location: `Dari ${srcWarehouse?.name || '?'} ke ${tgtWarehouse?.name || '?'}`,
                    actor: out.techName1 || undefined
                });
            } else if (out.outType === 'POP_INSTALL') {
                timeline.push({
                    id: `out-${log.id}`,
                    date: out.createdAt,
                    type: 'POP_INSTALL',
                    title: 'Dikeluarkan untuk Instalasi POP',
                    description: `Dibawa oleh teknisi ${out.techName1 || '-'}. Tujuan: ${out.pop?.name || out.location || '-'}`,
                    location: out.pop?.name || out.location || 'Unknown POP',
                    actor: out.techName1 || undefined
                });
            } else if (out.outType === 'CUSTOMER_INSTALL') {
                timeline.push({
                    id: `out-${log.id}`,
                    date: out.createdAt,
                    type: 'CUSTOMER_INSTALL',
                    title: 'Dikeluarkan untuk Instalasi Customer',
                    description: `Dibawa oleh teknisi ${out.techName1 || '-'}. Tujuan: ${out.customerName || out.location || '-'}`,
                    location: out.customerName || out.location || 'Unknown Customer',
                    actor: out.techName1 || undefined
                });
            }
        });

        damagedLogs.forEach((log: any) => {
            const dmg = log.damageditem || log.damagedItem;
            timeline.push({
                id: `dmg-${log.id}`,
                date: dmg.createdAt,
                type: 'DAMAGED',
                title: 'Dilaporkan Rusak',
                description: `Keterangan kerusakan: ${dmg.description || '-'}`,
                location: `Gudang: ${dmg.warehouse.name}`
            });
        });

        popInstalls.forEach(install => {
            timeline.push({
                id: `pop-${install.id}`,
                date: install.installedAt,
                type: 'POP_INSTALL',
                title: 'Selesai Instalasi di POP',
                description: `Dipasang oleh ${install.installedBy || 'Teknisi'}. Keterangan: ${install.description || '-'}`,
                location: `POP: ${install.pop.name}`,
                actor: install.installedBy || undefined
            });
        });

        custInstalls.forEach(install => {
            timeline.push({
                id: `cust-${install.id}`,
                date: install.installedAt,
                type: 'CUSTOMER_INSTALL',
                title: 'Selesai Instalasi di Customer',
                description: `Dipasang oleh ${install.installedBy || 'Teknisi'}. Keterangan: ${install.description || '-'}`,
                location: `Customer: ${install.customerName}`,
                actor: install.installedBy || undefined
            });
        });

        // Sort by date descending (newest first)
        timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

        return { success: true, data: { sn, timeline } };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ------------------------------------------------------------------
// WAREHOUSE
// ------------------------------------------------------------------

export async function getWarehouseList() {
    try {
        const warehouseId = await getBranchScope();

        const warehouses = await prisma.warehouse.findMany({
            where: warehouseId ? { id: warehouseId } : undefined,
            orderBy: { name: 'asc' }
        });

        // Count total stock (new + dismantle + damaged) per warehouse
        const rawStocks = await (prisma as any).warehouseStock.findMany({
            where: warehouseId ? { warehouseId } : undefined,
            select: { warehouseId: true, stockNew: true, stockDamaged: true, stockDismantle: true }
        });

        const stockMap = rawStocks.reduce((acc: Record<number, number>, curr: any) => {
            acc[curr.warehouseId] = (acc[curr.warehouseId] || 0) + curr.stockNew + curr.stockDismantle + curr.stockDamaged;
            return acc;
        }, {} as Record<number, number>);

        const fullList = warehouses.map(w => ({
            ...w,
            totalFisik: stockMap[w.id] || 0
        }));

        return { success: true, data: fullList };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function getWarehouseDetails(id: number) {
    try {
        const warehouse = await (prisma as any).warehouse.findUnique({
            where: { id },
            include: {
                area: true,
                warehousestock: {
                    include: { item: { include: { category: true } } }
                }
            }
        });

        if (!warehouse) throw new Error("Warehouse not found");

        const historyIn = await (prisma as any).stockIn.findMany({
            where: { warehouseId: id },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { item: true }
        });

        const historyOut = await (prisma as any).stockOut.findMany({
            where: { warehouseId: id },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { item: true }
        });

        // Normalize: remap warehousestock → stocks for client compatibility
        const normalized = {
            ...warehouse,
            stocks: warehouse.warehousestock || []
        };

        return { success: true, data: { warehouse: normalized, historyIn, historyOut } };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

