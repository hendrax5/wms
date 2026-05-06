"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { logAudit } from "./audit";

import { z } from "zod";

const InboundItemSchema = z.object({
    itemId: z.number().int().positive(),
    qty: z.number().int().positive("Quantity setiap barang harus lebih dari 0."),
    price: z.number().nonnegative(),
    serialNumbers: z.array(z.string()),
    condition: z.enum(["NEW", "DISMANTLE", "DAMAGED"])
}).refine(data => data.serialNumbers.length === 0 || data.serialNumbers.length === data.qty, {
    message: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang.",
    path: ["serialNumbers"]
});

const StockInSchema = z.object({
    warehouseId: z.number().int().positive(),
    items: z.array(InboundItemSchema).min(1, "Minimal 1 barang harus ditambahkan."),
    description: z.string().optional(),
    clientName: z.string().optional()
});

type InboundItemPayload = z.infer<typeof InboundItemSchema>;
type StockInPayload = z.infer<typeof StockInSchema>;

export async function createStockIn(rawData: StockInPayload) {
    try {
        const parsed = StockInSchema.safeParse(rawData);
        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid.";
            await logAudit({ action: "INBOUND_IMPORT", status: "ERROR", warehouseId: rawData.warehouseId, message: errorMsg });
            return { success: false, error: errorMsg };
        }
        
        const data = parsed.data;

        // Determine IDs for ItemType
        const typeBaru = await prisma.itemType.upsert({
            where: { name: "Baru" },
            update: {},
            create: { name: "Baru" }
        });

        const typeDismantle = await prisma.itemType.upsert({
            where: { name: "Dismantle" },
            update: {},
            create: { name: "Dismantle" }
        });
        
        const typeRusak = await prisma.itemType.upsert({
            where: { name: "Rusak" },
            update: {},
            create: { name: "Rusak" }
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
                                typeId: itemPayload.condition === "NEW" ? typeBaru.id : itemPayload.condition === "DISMANTLE" ? typeDismantle.id : typeRusak.id,
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
                            stockNew: itemPayload.condition === "NEW" ? { increment: itemPayload.qty } : undefined,
                            stockDismantle: itemPayload.condition === "DISMANTLE" ? { increment: itemPayload.qty } : undefined,
                            stockDamaged: itemPayload.condition === "DAMAGED" ? { increment: itemPayload.qty } : undefined,
                            updatedAt: new Date(),
                        }
                    });
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.warehouseId,
                            stockNew: itemPayload.condition === "NEW" ? itemPayload.qty : 0,
                            stockDismantle: itemPayload.condition === "DISMANTLE" ? itemPayload.qty : 0,
                            stockDamaged: itemPayload.condition === "DAMAGED" ? itemPayload.qty : 0,
                            updatedAt: new Date(),
                        }
                    });
                }

                stockIns.push(stockIn);
            }

            return stockIns;
        }, { maxWait: 20000, timeout: 300000 });

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
            warehouseId: rawData.warehouseId, 
            message: error.message || "Gagal memproses barang masuk." 
        });
        return { success: false, error: error.message || "Gagal memproses barang masuk." };
    }
}
