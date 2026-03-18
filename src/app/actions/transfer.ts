"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type TransferPayload = {
    sourceWarehouseId: number;
    targetWarehouseId: number;
    itemId: number;
    qty: number;
    description?: string;
    serialNumbers: string[];
};

export async function createTransfer(data: TransferPayload) {
    try {
        if (data.sourceWarehouseId === data.targetWarehouseId) {
            return { success: false, error: "Gudang asal dan tujuan tidak boleh sama." };
        }

        if (data.qty <= 0) {
            return { success: false, error: "Quantity transfer harus lebih dari 0." };
        }

        if (data.serialNumbers.length > 0 && data.serialNumbers.length !== data.qty) {
            return { success: false, error: "Jumlah Serial Number tidak sesuai dengan Qty Transfer." };
        }

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

            if (!sourceStock || sourceStock.stockNew < data.qty) {
                // Determine actual available
                const available = sourceStock ? sourceStock.stockNew : 0;
                throw new Error(`Stok Unit Baru di gudang asal tidak mencukupi. Tersedia: ${available}, Diminta: ${data.qty}`);
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
            if (data.serialNumbers.length > 0) {
                for (const snCode of data.serialNumbers) {
                    // Find the precise SN in the Source Warehouse
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
                data: { stockNew: { decrement: data.qty }, updatedAt: new Date() }
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
                    data: { stockNew: { increment: data.qty }, updatedAt: new Date() }
                });
            } else {
                await tx.warehouseStock.create({
                    data: {
                        itemId: data.itemId,
                        warehouseId: data.targetWarehouseId,
                        stockNew: data.qty,
                        updatedAt: new Date(),
                    }
                });
            }

            // 5. Create Transfer Record Log
            await tx.stockTransfer.create({
                data: {
                    stockOutId: stockOut.id,
                    sourceWarehouseId: data.sourceWarehouseId,
                    targetWarehouseId: data.targetWarehouseId,
                    status: "COMPLETED", // Automatically completed for now, could be PENDING later if approval needed
                }
            });

            return stockOut;
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
