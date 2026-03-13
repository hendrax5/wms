"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

type StockInPayload = {
    warehouseId: number;
    itemId: number;
    categoryId?: number;
    distributorId?: number;
    qty: number;
    price: number;
    totalPrice: number;
    clientName?: string;
    description?: string;
    serialNumbers: string[];
};

export async function createStockIn(data: StockInPayload) {
    try {
        if (data.serialNumbers.length > 0 && data.serialNumbers.length !== data.qty) {
            return { success: false, error: "Jumlah Serial Number tidak sesuai dengan Qty Barang Masuk." };
        }

        // Determine IDs for ItemType (Baru) and ItemStatus (In Stock)
        const typeBaru = await prisma.itemType.upsert({
            where: { name: "Baru" },
            update: {},
            create: { name: "Baru" }
        });

        const statusInStock = await prisma.itemStatus.upsert({
            where: { name: "In Stock" },
            update: {},
            create: { name: "In Stock" }
        });

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create StockIn record
            const stockIn = await tx.stockIn.create({
                data: {
                    warehouseId: data.warehouseId,
                    itemId: data.itemId,
                    categoryId: data.categoryId,
                    distributorId: data.distributorId,
                    qty: data.qty,
                    price: data.price,
                    totalPrice: data.totalPrice,
                    clientName: data.clientName,
                    description: data.description,
                }
            });

            // 2. Process Serial Numbers if present
            if (data.serialNumbers.length > 0) {
                const snRecords = [];
                for (const snCode of data.serialNumbers) {
                    // Check if SN already exists everywhere to avoid unique constraint throws
                    const existingSn = await tx.serialNumber.findUnique({ where: { code: snCode } });
                    if (existingSn) {
                        throw new Error(`Serial Number ${snCode} sudah terdaftar di sistem!`);
                    }

                    // Create SerialNumber
                    const sn = await tx.serialNumber.create({
                        data: {
                            code: snCode,
                            price: data.price,
                            itemId: data.itemId,
                            typeId: typeBaru.id,
                            statusId: statusInStock.id,
                            warehouseId: data.warehouseId,
                        }
                    });

                    // Link to StockIn via StockInSerial
                    await tx.stockInSerial.create({
                        data: {
                            stockInId: stockIn.id,
                            serialNumberId: sn.id,
                            serialCode: sn.code
                        }
                    });

                    snRecords.push(sn);
                }
            }

            // 3. Upsert WarehouseStock
            const currentStock = await tx.warehouseStock.findUnique({
                where: {
                    itemId_warehouseId: {
                        itemId: data.itemId,
                        warehouseId: data.warehouseId
                    }
                }
            });

            if (currentStock) {
                await tx.warehouseStock.update({
                    where: { id: currentStock.id },
                    data: { stockNew: { increment: data.qty } }
                });
            } else {
                await tx.warehouseStock.create({
                    data: {
                        itemId: data.itemId,
                        warehouseId: data.warehouseId,
                        stockNew: data.qty,
                    }
                });
            }

            return stockIn;
        });

        revalidatePath("/inbound");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        return { success: true, data: result };

    } catch (error: any) {
        console.error("StockIn Error:", error);
        return { success: false, error: error.message || "Gagal memproses barang masuk." };
    }
}
