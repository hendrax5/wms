"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function auditAllStock() {
    try {
        // 1. Get the necessary status and types
        const typeBaru = await prisma.itemType.findFirst({ where: { name: "Baru" } });
        const typeBekas = await prisma.itemType.findFirst({ where: { name: "Bekas" } });
        const typeDismantle = await prisma.itemType.findFirst({ where: { name: "Dismantle" } });
        const typeRusak = await prisma.itemType.findFirst({ where: { name: "Rusak" } });
        const statusInStock = await prisma.itemStatus.findFirst({ where: { name: "In Stock" } });

        if (!statusInStock) {
            return { success: false, error: "Status 'In Stock' tidak ditemukan." };
        }

        const baruId = typeBaru?.id || -1;
        // Group "Bekas" and "Dismantle" as they both contribute to stockDismantle in standard flow
        const dismantleIds = [typeBekas?.id, typeDismantle?.id].filter(Boolean) as number[];
        const rusakId = typeRusak?.id || -1;

        // 2. Fetch all Serial Numbers currently in stock at a warehouse
        const sns = await prisma.serialNumber.findMany({
            where: {
                statusId: statusInStock.id,
                warehouseId: { not: null }
            },
            select: {
                warehouseId: true,
                itemId: true,
                typeId: true
            }
        });

        // 3. Aggregate serial numbers by warehouseId and itemId
        const aggregatedSN = new Map<string, { newQty: number; dismantleQty: number; damagedQty: number }>();
        
        for (const sn of sns) {
            const key = `${sn.warehouseId}-${sn.itemId}`;
            if (!aggregatedSN.has(key)) {
                aggregatedSN.set(key, { newQty: 0, dismantleQty: 0, damagedQty: 0 });
            }
            const record = aggregatedSN.get(key)!;
            
            if (sn.typeId === baruId) {
                record.newQty += 1;
            } else if (dismantleIds.includes(sn.typeId)) {
                record.dismantleQty += 1;
            } else if (sn.typeId === rusakId) {
                record.damagedQty += 1;
            } else {
                // If unknown type, safely assume it's new/default or ignore? Let's assume new.
                record.newQty += 1;
            }
        }

        // 4. Fetch all WarehouseStocks for items that have serial numbers (hasSN = true)
        const stocksToAudit = await prisma.warehouseStock.findMany({
            where: {
                item: {
                    hasSN: true
                }
            },
            include: {
                item: true
            }
        });

        const discrepancies: any[] = [];
        
        // 5. Compare and reconcile
        await prisma.$transaction(async (tx) => {
            for (const stock of stocksToAudit) {
                const key = `${stock.warehouseId}-${stock.itemId}`;
                const actual = aggregatedSN.get(key) || { newQty: 0, dismantleQty: 0, damagedQty: 0 };
                
                const isDiscrepant = 
                    stock.stockNew !== actual.newQty ||
                    stock.stockDismantle !== actual.dismantleQty ||
                    stock.stockDamaged !== actual.damagedQty;

                if (isDiscrepant) {
                    discrepancies.push({
                        warehouseId: stock.warehouseId,
                        itemId: stock.itemId,
                        itemName: stock.item.name,
                        before: {
                            new: stock.stockNew,
                            dismantle: stock.stockDismantle,
                            damaged: stock.stockDamaged
                        },
                        after: {
                            new: actual.newQty,
                            dismantle: actual.dismantleQty,
                            damaged: actual.damagedQty
                        }
                    });

                    // Update the WarehouseStock to match exact SN count
                    await tx.warehouseStock.update({
                        where: { id: stock.id },
                        data: {
                            stockNew: actual.newQty,
                            stockDismantle: actual.dismantleQty,
                            stockDamaged: actual.damagedQty,
                            updatedAt: new Date()
                        }
                    });
                }
            }

            // Log the audit event if there were discrepancies
            if (discrepancies.length > 0) {
                await tx.auditLog.create({
                    data: {
                        action: "SYSTEM_AUDIT_STOK",
                        status: "SUCCESS",
                        message: `Audit menemukan dan memperbaiki ${discrepancies.length} ketidaksesuaian stok barang SN.`,
                        details: JSON.stringify(discrepancies, null, 2)
                    }
                });
            } else {
                await tx.auditLog.create({
                    data: {
                        action: "SYSTEM_AUDIT_STOK",
                        status: "SUCCESS",
                        message: "Audit selesai. Tidak ditemukan ketidaksesuaian data stok SN.",
                    }
                });
            }
        }, { maxWait: 20000, timeout: 60000 });

        revalidatePath("/stock");
        revalidatePath("/dashboard");
        revalidatePath("/reports");

        return { success: true, message: `Audit selesai. ${discrepancies.length} rekaman diperbaiki.`, discrepancies };

    } catch (error: any) {
        console.error("Audit Stok Error:", error);
        return { success: false, error: error.message || "Gagal menjalankan audit stok." };
    }
}
