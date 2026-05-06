"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit";

import { z } from "zod";

const TransferSchema = z.object({
    sourceWarehouseId: z.number().int().positive(),
    targetWarehouseId: z.number().int().positive(),
    itemId: z.number().int().positive(),
    qty: z.number().int().positive("Quantity transfer harus lebih dari 0."),
    qtyNew: z.number().int().nonnegative().optional(),
    qtyDismantle: z.number().int().nonnegative().optional(),
    qtyDamaged: z.number().int().nonnegative().optional(),
    description: z.string().optional(),
    serialNumbers: z.array(z.string())
}).refine(data => data.sourceWarehouseId !== data.targetWarehouseId, {
    message: "Gudang asal dan tujuan tidak boleh sama.",
    path: ["targetWarehouseId"]
}).refine(data => data.serialNumbers.length === 0 || data.serialNumbers.length === data.qty, {
    message: "Jumlah Serial Number tidak sesuai dengan Qty Transfer.",
    path: ["serialNumbers"]
});

type TransferPayload = z.infer<typeof TransferSchema>;

export async function createTransfer(rawData: TransferPayload) {
    try {
        const parsed = TransferSchema.safeParse(rawData);
        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid.";
            await logAudit({ action: "TRANSFER", status: "ERROR", warehouseId: rawData.sourceWarehouseId, message: errorMsg });
            return { success: false, error: errorMsg };
        }
        
        const data = parsed.data;

        const typeBaru = await prisma.itemType.upsert({ where: { name: "Baru" }, update: {}, create: { name: "Baru" } });
        const typeDismantle = await prisma.itemType.upsert({ where: { name: "Dismantle" }, update: {}, create: { name: "Dismantle" } });

        const result = await prisma.$transaction(async (tx) => {
            // Validate Source Warehouse Stock
            const sourceStock = await tx.warehouseStock.findUnique({
                where: {
                    itemId_warehouseId: {
                        itemId: data.itemId,
                        warehouseId: data.sourceWarehouseId
                    }
                }
            });

            let qtyNew = 0;
            let qtyDismantle = 0;
            let qtyDamaged = 0;
            let existingSns: any[] = [];

            if (data.serialNumbers.length > 0) {
                for (const snCode of data.serialNumbers) {
                    const existingSn = await tx.serialNumber.findUnique({
                        where: { code: snCode }
                    });

                    if (!existingSn) throw new Error(`Serial Number ${snCode} tidak ditemukan di sistem.`);
                    if (existingSn.warehouseId !== data.sourceWarehouseId) throw new Error(`Serial Number ${snCode} tidak berada di gudang asal yang dipilih.`);

                    if (existingSn.typeId === typeBaru.id) qtyNew++;
                    else if (existingSn.typeId === typeDismantle.id) qtyDismantle++;
                    else qtyDamaged++;

                    existingSns.push(existingSn);
                }
            } else {
                qtyNew = data.qtyNew ?? data.qty;
                qtyDismantle = data.qtyDismantle ?? 0;
                qtyDamaged = data.qtyDamaged ?? 0;
            }

            if (!sourceStock || sourceStock.stockNew < qtyNew || sourceStock.stockDismantle < qtyDismantle || sourceStock.stockDamaged < qtyDamaged) {
                const itemInfo = await tx.item.findUnique({ where: { id: data.itemId } });
                throw new Error(`Stok "${itemInfo?.name || data.itemId}" di gudang asal tidak mencukupi untuk jenis/kondisi SN yang dipilih.`);
            }

            // 1. Create StockOut record with TRANSFER type
            const stockOut = await tx.stockOut.create({
                data: {
                    warehouseId: data.sourceWarehouseId,
                    itemId: data.itemId,
                    qty: data.qty,
                    outType: "TRANSFER",
                    targetWarehouseId: data.targetWarehouseId,
                    description: data.description,
                }
            });

            // 2. Process Serial Numbers if present
            if (existingSns.length > 0) {
                for (const existingSn of existingSns) {
                    if (existingSn.statusId) {
                        const status = await tx.itemStatus.findUnique({ where: { id: existingSn.statusId } });
                        if (status?.name !== "In Stock") {
                            throw new Error(`Serial Number ${existingSn.code} tidak berstatus "In Stock". Status saat ini: ${status?.name}`);
                        }
                    }

                    // Update SN location to target warehouse
                    await tx.serialNumber.update({
                        where: { id: existingSn.id },
                        data: {
                            warehouseId: data.targetWarehouseId,
                            updatedAt: new Date(),
                        }
                    });

                    // Link to StockOut
                    await tx.stockOutSerial.create({
                        data: {
                            stockOutId: stockOut.id,
                            serialNumberId: existingSn.id,
                            serialCode: existingSn.code
                        }
                    });
                }
            }

            // 3. Decrement source warehouse stock
            await tx.warehouseStock.update({
                where: { id: sourceStock.id },
                data: { 
                    stockNew: { decrement: qtyNew }, 
                    stockDismantle: { decrement: qtyDismantle }, 
                    stockDamaged: { decrement: qtyDamaged }, 
                    updatedAt: new Date() 
                }
            });

            // 4. Increment target warehouse stock
            const targetStock = await tx.warehouseStock.findUnique({
                where: {
                    itemId_warehouseId: {
                        itemId: data.itemId,
                        warehouseId: data.targetWarehouseId
                    }
                }
            });

            if (targetStock) {
                await tx.warehouseStock.update({
                    where: { id: targetStock.id },
                    data: { 
                        stockNew: { increment: qtyNew }, 
                        stockDismantle: { increment: qtyDismantle }, 
                        stockDamaged: { increment: qtyDamaged }, 
                        updatedAt: new Date() 
                    }
                });
            } else {
                await tx.warehouseStock.create({
                    data: {
                        itemId: data.itemId,
                        warehouseId: data.targetWarehouseId,
                        stockNew: qtyNew,
                        stockDismantle: qtyDismantle,
                        stockDamaged: qtyDamaged,
                        updatedAt: new Date(),
                    }
                });
            }

            await tx.stockTransfer.create({
                data: {
                    fromWarehouseId: data.sourceWarehouseId,
                    toWarehouseId: data.targetWarehouseId,
                    itemId: data.itemId,
                    qty: data.qty,
                    status: "RECEIVED",
                }
            });

            return stockOut;
        }, { maxWait: 20000, timeout: 300000 });

        revalidatePath("/transfer");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        
        await logAudit({ 
            action: "TRANSFER", 
            status: "SUCCESS", 
            warehouseId: data.sourceWarehouseId, 
            message: `Berhasil mentransfer ${data.qty} item ke gudang tujuan`,
            details: JSON.stringify({ targetWarehouseId: data.targetWarehouseId, itemId: data.itemId })
        });
        
        return { success: true, data: result };

    } catch (error: any) {
        console.error("Transfer Error:", error);
        await logAudit({ 
            action: "TRANSFER", 
            status: "ERROR", 
            warehouseId: rawData.sourceWarehouseId, 
            message: error.message || "Gagal memproses transfer stok." 
        });
        return { success: false, error: error.message || "Gagal memproses transfer stok." };
    }
}

// Helper to validate if an SN exists in a specific warehouse
export async function checkSerialInWarehouse(serialCode: string, warehouseId: number, itemId: number) {
    try {
        const sn = await prisma.serialNumber.findUnique({
            where: { code: serialCode },
            include: { itemstatus: true }
        });

        if (!sn) return { success: false, error: "SN tidak ditemukan" };
        if (sn.warehouseId !== warehouseId) return { success: false, error: "SN tidak ada di gudang ini" };
        if (sn.itemId !== itemId) return { success: false, error: "SN bukan untuk barang yang dipilih" };
        const statusName = (sn as any).itemstatus?.name;
        if (statusName !== "In Stock") return { success: false, error: `SN berstatus: ${statusName}` };

        return { success: true, data: sn };
    } catch (error: any) {
        console.error("checkSerialInWarehouse Error:", error?.message);
        return { success: false, error: "Gagal memvalidasi SN" };
    }
}

// Get available SNs for a given item in a specific warehouse (In Stock only)
export async function getAvailableSNs(warehouseId: number, itemId: number) {
    try {
        const statusInStock = await prisma.itemStatus.findUnique({ where: { name: "In Stock" } });
        if (!statusInStock) return { success: true, data: [] };

        const sns = await (prisma as any).serialNumber.findMany({
            where: {
                itemId,
                warehouseId,
                statusId: statusInStock.id,
            },
            select: {
                id: true,
                code: true,
            },
            orderBy: { id: 'desc' },
            take: 200,
        });

        return { success: true, data: sns };
    } catch (error: any) {
        console.error("getAvailableSNs Error:", error?.message);
        return { success: false, error: error.message };
    }
}
