"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit";

import { z } from "zod";

const ReturnItemSchema = z.object({
    itemId: z.number().int().positive(),
    qty: z.number().int().positive("Quantity setiap barang harus lebih dari 0."),
    qtyNew: z.number().int().nonnegative().optional(),
    qtyDismantle: z.number().int().nonnegative().optional(),
    qtyDamaged: z.number().int().nonnegative().optional(),
    condition: z.enum(["NEW", "DISMANTLE", "DAMAGED"]).optional(),
    serialNumbers: z.array(z.string())
}).refine(data => data.serialNumbers.length === 0 || data.serialNumbers.length === data.qty, {
    message: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang.",
    path: ["serialNumbers"]
});

const ReturnSchema = z.object({
    targetWarehouseId: z.number().int().positive(),
    returnSource: z.enum(["POP", "CUSTOMER"]),
    sourcePopId: z.number().int().positive().optional(),
    sourceCustomerName: z.string().optional(),
    items: z.array(ReturnItemSchema).min(1, "Minimal 1 barang harus ditambahkan."),
    techName: z.string().optional(),
    description: z.string().optional()
}).refine(data => {
    if (data.returnSource === "POP" && !data.sourcePopId) return false;
    return true;
}, {
    message: "POP Asal wajib dipilih.",
    path: ["sourcePopId"]
}).refine(data => {
    if (data.returnSource === "CUSTOMER" && !data.sourceCustomerName) return false;
    return true;
}, {
    message: "Nama Customer Asal wajib diisi.",
    path: ["sourceCustomerName"]
});

type ReturnItemPayload = z.infer<typeof ReturnItemSchema>;
type ReturnPayload = z.infer<typeof ReturnSchema>;

export async function verifySerialNumberForReturn(code: string) {
    try {
        const sn = await prisma.serialNumber.findUnique({
            where: { code },
            select: {
                id: true,
                code: true,
                itemId: true,
                item: { select: { id: true, name: true, code: true } },
                itemstatus: { select: { name: true } },
                warehouse: { select: { name: true } },
            }
        });

        if (!sn) {
            return { success: false, error: `Serial Number ${code} tidak ditemukan di sistem.` };
        }

        return { success: true, data: sn };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createReturn(rawData: ReturnPayload) {
    try {
        const parsed = ReturnSchema.safeParse(rawData);
        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid.";
            await logAudit({ action: "RETURN", status: "ERROR", warehouseId: rawData.targetWarehouseId, message: errorMsg });
            return { success: false, error: errorMsg };
        }
        
        const data = parsed.data;

        // Determine status for returned SN
        const statusInStock = await prisma.itemStatus.upsert({
            where: { name: "In Stock" },
            update: {},
            create: { name: "In Stock" }
        });

        const typeDismantle = await prisma.itemType.upsert({
            where: { name: "Dismantle" },
            update: {},
            create: { name: "Dismantle" }
        });

        const typeBaru = await prisma.itemType.upsert({
            where: { name: "Baru" },
            update: {},
            create: { name: "Baru" }
        });

        const typeRusak = await prisma.itemType.upsert({
            where: { name: "Rusak" },
            update: {},
            create: { name: "Rusak" }
        });

        const statusRusak = await prisma.itemStatus.upsert({
            where: { name: "Rusak" },
            update: {},
            create: { name: "Rusak" }
        });

        // Build description prefix
        let sourceDesc = "";
        if (data.returnSource === "POP" && data.sourcePopId) {
            const pop = await prisma.pop.findUnique({ where: { id: data.sourcePopId } });
            sourceDesc = `Return dari POP: ${pop?.name || data.sourcePopId}`;
        } else if (data.returnSource === "CUSTOMER") {
            sourceDesc = `Return dari Customer: ${data.sourceCustomerName}`;
        }

        const fullDescription = [sourceDesc, data.techName ? `Teknisi: ${data.techName}` : "", data.description].filter(Boolean).join(" | ");

        const results = await prisma.$transaction(async (tx) => {
            const stockIns = [];

            for (const itemPayload of data.items) {
                // 1. Create StockIn record for the return
                const stockIn = await tx.stockIn.create({
                    data: {
                        warehouseId: data.targetWarehouseId,
                        itemId: itemPayload.itemId,
                        qty: itemPayload.qty,
                        price: 0,
                        totalPrice: 0,
                        clientName: data.returnSource === "CUSTOMER" ? data.sourceCustomerName : undefined,
                        description: fullDescription,
                    }
                });

                // 2. Validate and Process Serial Numbers if present
                let existingSns: any[] = [];
                if (itemPayload.serialNumbers.length > 0) {
                    for (const snCode of itemPayload.serialNumbers) {
                        const existingSn = await tx.serialNumber.findUnique({
                            where: { code: snCode }
                        });

                        if (!existingSn) {
                            throw new Error(`Serial Number ${snCode} tidak ditemukan di sistem.`);
                        }
                        existingSns.push(existingSn);
                    }
                }

                if (existingSns.length > 0) {
                    for (const existingSn of existingSns) {
                        // Determine type and status based on condition
                        let snTypeId = typeDismantle.id;
                        let snStatusId = statusInStock.id;

                        if (itemPayload.condition === "NEW") {
                            snTypeId = typeBaru.id;
                        } else if (itemPayload.condition === "DAMAGED") {
                            snTypeId = typeRusak.id;
                            snStatusId = statusRusak.id;
                        }

                        await tx.serialNumber.update({
                            where: { id: existingSn.id },
                            data: {
                                warehouseId: data.targetWarehouseId,
                                popId: null,
                                customerId: null,
                                statusId: snStatusId,
                                typeId: snTypeId,
                                updatedAt: new Date(),
                            }
                        });

                        await tx.stockInSerial.create({
                            data: {
                                stockInId: stockIn.id,
                                serialNumberId: existingSn.id,
                                serialCode: existingSn.code
                            }
                        });
                    }
                }

                // 3. Upsert WarehouseStock — increment the appropriate columns
                let qtyNew = 0;
                let qtyDismantle = 0;
                let qtyDamaged = 0;

                if (itemPayload.serialNumbers.length > 0) {
                    if (itemPayload.condition === "NEW") qtyNew = itemPayload.qty;
                    else if (itemPayload.condition === "DAMAGED") qtyDamaged = itemPayload.qty;
                    else qtyDismantle = itemPayload.qty;
                } else {
                    qtyNew = itemPayload.qtyNew ?? 0;
                    qtyDismantle = itemPayload.qtyDismantle ?? 0;
                    qtyDamaged = itemPayload.qtyDamaged ?? 0;
                    
                    if (qtyNew === 0 && qtyDismantle === 0 && qtyDamaged === 0 && itemPayload.qty > 0) {
                        // Fallback for legacy requests without separate quantities
                        if (itemPayload.condition === "NEW") qtyNew = itemPayload.qty;
                        else if (itemPayload.condition === "DAMAGED") qtyDamaged = itemPayload.qty;
                        else qtyDismantle = itemPayload.qty;
                    }
                }

                const currentStock = await tx.warehouseStock.findUnique({
                    where: {
                        itemId_warehouseId: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.targetWarehouseId
                        }
                    }
                });

                if (currentStock) {
                    await tx.warehouseStock.update({
                        where: { id: currentStock.id },
                        data: {
                            stockNew: { increment: qtyNew },
                            stockDismantle: { increment: qtyDismantle },
                            stockDamaged: { increment: qtyDamaged },
                            updatedAt: new Date(),
                        }
                    });
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.targetWarehouseId,
                            stockNew: qtyNew,
                            stockDismantle: qtyDismantle,
                            stockDamaged: qtyDamaged,
                            updatedAt: new Date(),
                        }
                    });
                }

                stockIns.push(stockIn);
            }

            return stockIns;
        }, { maxWait: 20000, timeout: 300000 });

        revalidatePath("/operasi");
        revalidatePath("/inbound");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        revalidatePath("/master");
        
        await logAudit({ 
            action: "RETURN", 
            status: "SUCCESS", 
            warehouseId: data.targetWarehouseId, 
            message: `Berhasil memproses return ${data.items.length} item(s) dari ${data.returnSource}`,
            details: JSON.stringify({ source: data.returnSource === "POP" ? data.sourcePopId : data.sourceCustomerName })
        });
        
        return { success: true, data: results };

    } catch (error: any) {
        console.error("Return Error:", error);
        await logAudit({ 
            action: "RETURN", 
            status: "ERROR", 
            warehouseId: rawData.targetWarehouseId, 
            message: error.message || "Gagal memproses return barang." 
        });
        return { success: false, error: error.message || "Gagal memproses return barang." };
    }
}
