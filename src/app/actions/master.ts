"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { auth, getBranchScope } from "@/lib/auth";

// ------------------------------------------------------------------
// CATEGORIES
// ------------------------------------------------------------------

async function getWarehouseFilter() {
    const session = await auth();
    const branchId = await getBranchScope();
    
    if (branchId) return branchId;
    
    if (session?.user && session.user.level !== "MASTER" && session.user.accessibleWarehouseIds?.length) {
        return { in: session.user.accessibleWarehouseIds };
    }
    
    return undefined;
}

export async function getCategories() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
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
    if (!data.name?.trim()) return { success: false, error: "Nama kategori wajib diisi" };
    try {
        const res = await (prisma as any).category.create({
            data: {
                name: data.name.trim(),
                code: data.code?.trim() || null,
                hasSN: data.hasSN ?? true,
                updatedAt: new Date(),
            }
        });
        revalidatePath("/master/categories");
        revalidatePath("/master/items");
        revalidatePath("/master");
        return { success: true, data: res };
    } catch (e: any) {
        console.error("createCategory error:", e);
        return { success: false, error: e.message || "Gagal membuat kategori" };
    }
}

export async function updateCategory(id: number, data: { name: string; code?: string; hasSN?: boolean }) {
    if (!data.name?.trim()) return { success: false, error: "Nama kategori wajib diisi" };
    try {
        const res = await (prisma as any).category.update({
            where: { id },
            data: {
                name: data.name.trim(),
                code: data.code?.trim() || null,
                hasSN: data.hasSN ?? true,
                updatedAt: new Date(),
            }
        });
        revalidatePath("/master/categories");
        revalidatePath("/master/items");
        revalidatePath("/master");
        return { success: true, data: res };
    } catch (e: any) {
        console.error("updateCategory error:", e);
        return { success: false, error: e.message || "Gagal memperbarui kategori" };
    }
}

export async function deleteCategory(id: number) {
    try {
        await prisma.category.delete({ where: { id } });
        revalidatePath("/master/categories");
        revalidatePath("/master/items");
        revalidatePath("/master");
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
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const items = await prisma.item.findMany({
            include: { category: true },
            orderBy: { name: 'asc' }
        });

        const warehouseFilter = await getWarehouseFilter();

        const stocks = await (prisma as any).warehouseStock.groupBy({
            by: ['itemId'],
            where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
            _sum: { stockNew: true, stockDismantle: true, stockDamaged: true }
        });

        const stockMap = stocks.reduce((acc: Record<number, number>, curr: any) => {
            acc[curr.itemId] = (curr._sum.stockNew || 0) + (curr._sum.stockDismantle || 0) + (curr._sum.stockDamaged || 0);
            return acc;
        }, {} as Record<number, number>);

        const snCounts = await (prisma as any).serialNumber.groupBy({
            by: ['itemId'],
            where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
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

        if (warehouseFilter) {
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
        const warehouseFilter = await getWarehouseFilter();

        const item: any = await prisma.item.findUnique({
            where: { id },
            include: {
                category: true,
                warehousestock: {
                    where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
                    include: { warehouse: true }
                },
                serialnumber: {
                    where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
                    include: {
                        itemstatus: true,
                        warehouse: true,
                        pop: true,
                        itemtype: true
                    },
                    orderBy: { id: 'desc' } as any
                }
            }
        });

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
        const warehouseFilter = await getWarehouseFilter();

        const sns = await (prisma as any).serialNumber.findMany({
            where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
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
        const warehouseFilter = await getWarehouseFilter();
        let whereClause: any = { code: { contains: code } };

        if (warehouseFilter) {
            whereClause.warehouseId = warehouseFilter;
        }

        const sn = await (prisma as any).serialNumber.findMany({
            where: whereClause,
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
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const warehouseFilter = await getWarehouseFilter();

        const warehouses = await prisma.warehouse.findMany({
            where: warehouseFilter ? { id: warehouseFilter } : undefined,
            orderBy: { name: 'asc' }
        });

        // Count total stock (new + dismantle + damaged) per warehouse
        const rawStocks = await (prisma as any).warehouseStock.findMany({
            where: warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
            select: { warehouseId: true, stockNew: true, stockDamaged: true, stockDismantle: true, minStock: true, itemId: true, item: { select: { hasSN: true } } }
        });

        const stockMap: Record<number, number> = {};
        const nonSNStockMap: Record<number, number> = {};
        const lowStockMap: Record<number, number> = {};
        for (const s of rawStocks) {
            const total = (s.stockNew || 0) + (s.stockDismantle || 0) + (s.stockDamaged || 0);
            stockMap[s.warehouseId] = (stockMap[s.warehouseId] || 0) + total;
            if (!s.item?.hasSN) {
                nonSNStockMap[s.warehouseId] = (nonSNStockMap[s.warehouseId] || 0) + total;
            }
            if (total <= 0) {
                lowStockMap[s.warehouseId] = (lowStockMap[s.warehouseId] || 0) + 1;
            }
        }

        const fullList = warehouses.map(w => ({
            ...w,
            totalFisik: stockMap[w.id] || 0,
            totalNonSN: nonSNStockMap[w.id] || 0,
            lowStockCount: lowStockMap[w.id] || 0,
        }));

        return { success: true, data: fullList };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createWarehouse(data: { name: string; location?: string; type?: string }) {
    try {
        await prisma.warehouse.create({
            data: {
                name: data.name,
                location: data.location || null,
                type: (data.type as any) || 'CABANG',
                updatedAt: new Date(),
            },
        });
        revalidatePath("/stock");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Gagal membuat gudang" };
    }
}

export async function updateWarehouse(id: number, data: { name: string; location?: string; type?: string }) {
    try {
        await prisma.warehouse.update({
            where: { id },
            data: {
                name: data.name,
                location: data.location || null,
                type: (data.type as any) || 'CABANG',
                updatedAt: new Date(),
            },
        });
        revalidatePath("/stock");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Gagal memperbarui gudang" };
    }
}

export async function deleteWarehouse(id: number) {
    try {
        await prisma.warehouse.delete({ where: { id } });
        revalidatePath("/stock");
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2003') {
            return { success: false, error: "Gudang tidak dapat dihapus karena masih memiliki stok atau data terkait." };
        }
        return { success: false, error: e.message || "Gagal menghapus gudang" };
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
export async function getWarehouseSerialNumbers(warehouseId: number) {
    try {
        const sns = await prisma.serialNumber.findMany({
            where: { warehouseId },
            include: {
                item: { include: { category: true } },
                itemtype: true,
                itemstatus: true
            }
        });
        return { success: true, data: sns };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
