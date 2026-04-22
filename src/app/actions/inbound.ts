"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { logAudit } from "./audit";

type InboundItemPayload = {
    itemId: number;
    qty: number;
    price: number;
    serialNumbers: string[];
    condition: "Baru" | "Bekas";
};

type StockInPayload = {
    warehouseId: number;
    items: InboundItemPayload[];
    description?: string;
    clientName?: string;
};

export async function createStockIn(data: StockInPayload) {
    try {
        if (!data.items || data.items.length === 0) {
            await logAudit({ action: "INBOUND_IMPORT", status: "ERROR", warehouseId: data.warehouseId, message: "Minimal 1 barang harus ditambahkan." });
            return { success: false, error: "Minimal 1 barang harus ditambahkan." };
        }

        for (const item of data.items) {
            if (item.qty <= 0) {
                await logAudit({ action: "INBOUND_IMPORT", status: "ERROR", warehouseId: data.warehouseId, message: "Quantity setiap barang harus lebih dari 0." });
                return { success: false, error: "Quantity setiap barang harus lebih dari 0." };
            }
            if (item.serialNumbers.length > 0 && item.serialNumbers.length !== item.qty) {
                await logAudit({ action: "INBOUND_IMPORT", status: "ERROR", warehouseId: data.warehouseId, message: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang." });
                return { success: false, error: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang." };
            }
        }

        // Determine IDs for ItemType (Baru/Bekas) and ItemStatus (In Stock)
        const typeBaru = await prisma.itemType.upsert({
            where: { name: "Baru" },
            update: {},
            create: { name: "Baru" }
        });

        const typeBekas = await prisma.itemType.upsert({
            where: { name: "Bekas" },
            update: {},
            create: { name: "Bekas" }
        });

        const statusInStock = await prisma.itemStatus.upsert({
            where: { name: "In Stock" },
            update: {},
            create: { name: "In Stock" }
        });

        const results = await prisma.$transaction(async (tx) => {
            const stockIns = [];

            for (const itemPayload of data.items) {
                // 1. Create StockIn record
                const stockIn = await tx.stockIn.create({
                    data: {
                        warehouseId: data.warehouseId,
                        itemId: itemPayload.itemId,
                        qty: itemPayload.qty,
                        price: itemPayload.price,
                        totalPrice: itemPayload.price * itemPayload.qty,
                        clientName: data.clientName,
                        description: data.description,
                    }
                });

                // 2. Process Serial Numbers if present
                if (itemPayload.serialNumbers.length > 0) {
                    for (const snCode of itemPayload.serialNumbers) {
                        const existingSn = await tx.serialNumber.findUnique({ where: { code: snCode } });
                        if (existingSn) {
                            throw new Error(`Serial Number ${snCode} sudah terdaftar di sistem!`);
                        }

                        const sn = await tx.serialNumber.create({
                            data: {
                                code: snCode,
                                price: itemPayload.price,
                                itemId: itemPayload.itemId,
                                typeId: itemPayload.condition === "Baru" ? typeBaru.id : typeBekas.id,
                                statusId: statusInStock.id,
                                warehouseId: data.warehouseId,
                                updatedAt: new Date(),
                            }
                        });

                        await tx.stockInSerial.create({
                            data: {
                                stockInId: stockIn.id,
                                serialNumberId: sn.id,
                                serialCode: sn.code
                            }
                        });
                    }
                }

                // 3. Upsert WarehouseStock
                const currentStock = await tx.warehouseStock.findUnique({
                    where: {
                        itemId_warehouseId: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.warehouseId
                        }
                    }
                });

                if (currentStock) {
                    await tx.warehouseStock.update({
                        where: { id: currentStock.id },
                        data: {
                            stockNew: { increment: itemPayload.qty },
                            updatedAt: new Date(),
                        }
                    });
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.warehouseId,
                            stockNew: itemPayload.qty,
                            updatedAt: new Date(),
                        }
                    });
                }

                stockIns.push(stockIn);
            }

            return stockIns;
        });

        revalidatePath("/inbound");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        revalidatePath("/master");
        revalidatePath("/master/items");
        
        await logAudit({ 
            action: "INBOUND_IMPORT", 
            status: "SUCCESS", 
            warehouseId: data.warehouseId, 
            message: `Berhasil import ${data.items.length} item(s) dengan total qty ${data.items.reduce((sum, item) => sum + item.qty, 0)}`,
            details: JSON.stringify({ itemCount: data.items.length })
        });
        
        return { success: true, data: results };

    } catch (error: any) {
        console.error("StockIn Error:", error);
        await logAudit({ 
            action: "INBOUND_IMPORT", 
            status: "ERROR", 
            warehouseId: data.warehouseId, 
            message: error.message || "Gagal memproses barang masuk." 
        });
        return { success: false, error: error.message || "Gagal memproses barang masuk." };
    }
}
