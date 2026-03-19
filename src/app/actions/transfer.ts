"use server";

import { prisma } from "@/lib/db";

import { revalidatePath } from "next/cache";

// Payload untuk 1 item dalam transfer
export type TransferItem = {
    itemId: number;
    qty: number;
    serialNumbers: string[];
};

// Payload utama transfer (bisa multiple items)
export type TransferPayload = {
    sourceWarehouseId: number;
    targetWarehouseId: number;
    items: TransferItem[];
    description?: string;
};

export async function createTransfer(data: TransferPayload) {
    try {
        if (data.sourceWarehouseId === data.targetWarehouseId) {
            return { success: false, error: "Gudang asal dan tujuan tidak boleh sama." };
        }

        if (!data.items || data.items.length === 0) {
            return { success: false, error: "Minimal 1 barang harus dipilih untuk transfer." };
        }

        for (const item of data.items) {
            if (item.qty <= 0) {
                return { success: false, error: `Quantity transfer harus lebih dari 0 untuk setiap barang.` };
            }
            if (item.serialNumbers.length > 0 && item.serialNumbers.length !== item.qty) {
                return { success: false, error: `Jumlah Serial Number tidak sesuai dengan Qty Transfer untuk item ID ${item.itemId}.` };
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await prisma.$transaction(async (tx: any) => {
            const stockOutIds: number[] = [];

            for (const transferItem of data.items) {
                // Validate Source Warehouse Stock
                const sourceStock = await tx.warehouseStock.findUnique({
                    where: {
                        itemId_warehouseId: {
                            itemId: transferItem.itemId,
                            warehouseId: data.sourceWarehouseId
                        }
                    }
                });

                if (!sourceStock || sourceStock.stockNew < transferItem.qty) {
                    const available = sourceStock ? sourceStock.stockNew : 0;
                    throw new Error(`Stok Unit Baru di gudang asal tidak mencukupi untuk item ID ${transferItem.itemId}. Tersedia: ${available}, Diminta: ${transferItem.qty}`);
                }

                // 1. Create StockOut record with TRANSFER type
                const stockOut = await tx.stockOut.create({
                    data: {
                        warehouseId: data.sourceWarehouseId,
                        itemId: transferItem.itemId,
                        qty: transferItem.qty,
                        outType: "TRANSFER",
                        targetWarehouseId: data.targetWarehouseId,
                        description: data.description,
                    }
                });

                // 2. Process Serial Numbers if present
                if (transferItem.serialNumbers.length > 0) {
                    for (const snCode of transferItem.serialNumbers) {
                        const existingSn = await tx.serialNumber.findUnique({
                            where: { code: snCode }
                        });

                        if (!existingSn) {
                            throw new Error(`Serial Number ${snCode} tidak ditemukan di sistem.`);
                        }

                        if (existingSn.warehouseId !== data.sourceWarehouseId) {
                            throw new Error(`Serial Number ${snCode} tidak berada di gudang asal yang dipilih.`);
                        }

                        if (existingSn.statusId) {
                            const status = await tx.itemStatus.findUnique({ where: { id: existingSn.statusId } });
                            if (status?.name !== "In Stock") {
                                throw new Error(`Serial Number ${snCode} tidak berstatus "In Stock". Status saat ini: ${status?.name}`);
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
                    data: { stockNew: { decrement: transferItem.qty }, updatedAt: new Date() }
                });

                // 4. Increment target warehouse stock
                const targetStock = await tx.warehouseStock.findUnique({
                    where: {
                        itemId_warehouseId: {
                            itemId: transferItem.itemId,
                            warehouseId: data.targetWarehouseId
                        }
                    }
                });

                if (targetStock) {
                    await tx.warehouseStock.update({
                        where: { id: targetStock.id },
                        data: { stockNew: { increment: transferItem.qty }, updatedAt: new Date() }
                    });
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            itemId: transferItem.itemId,
                            warehouseId: data.targetWarehouseId,
                            stockNew: transferItem.qty,
                            updatedAt: new Date(),
                        }
                    });
                }

                // 5. Create Transfer Record Log - field names sesuai schema
                await tx.stockTransfer.create({
                    data: {
                        fromWarehouseId: data.sourceWarehouseId,
                        toWarehouseId: data.targetWarehouseId,
                        itemId: transferItem.itemId,
                        qty: transferItem.qty,
                        status: "RECEIVED",
                        updatedAt: new Date(),
                    }
                });

                stockOutIds.push(stockOut.id);
            }

            return stockOutIds;
        });

        revalidatePath("/transfer");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        return { success: true, data: result };

    } catch (error: any) {
        console.error("Transfer Error:", error);
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
