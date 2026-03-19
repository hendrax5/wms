"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ReturnItemPayload = {
    itemId: number;
    qty: number;
    condition: "NEW" | "DISMANTLE" | "DAMAGED";
    serialNumbers: string[];
};

type ReturnPayload = {
    targetWarehouseId: number;
    returnSource: "POP" | "CUSTOMER";
    sourcePopId?: number;
    sourceCustomerName?: string;
    items: ReturnItemPayload[];
    techName?: string;
    description?: string;
};

export async function createReturn(data: ReturnPayload) {
    try {
        if (!data.items || data.items.length === 0) {
            return { success: false, error: "Minimal 1 barang harus ditambahkan." };
        }

        for (const item of data.items) {
            if (item.qty <= 0) {
                return { success: false, error: "Quantity setiap barang harus lebih dari 0." };
            }
            if (item.serialNumbers.length > 0 && item.serialNumbers.length !== item.qty) {
                return { success: false, error: `Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang.` };
            }
        }

        if (data.returnSource === "POP" && !data.sourcePopId) {
            return { success: false, error: "POP Asal wajib dipilih." };
        }

        if (data.returnSource === "CUSTOMER" && !data.sourceCustomerName) {
            return { success: false, error: "Nama Customer Asal wajib diisi." };
        }

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

                // 2. Process Serial Numbers if present
                if (itemPayload.serialNumbers.length > 0) {
                    for (const snCode of itemPayload.serialNumbers) {
                        const existingSn = await tx.serialNumber.findUnique({
                            where: { code: snCode }
                        });

                        if (!existingSn) {
                            throw new Error(`Serial Number ${snCode} tidak ditemukan di sistem.`);
                        }

                        // Determine type based on condition
                        const snTypeId = itemPayload.condition === "NEW" ? typeBaru.id : typeDismantle.id;

                        await tx.serialNumber.update({
                            where: { id: existingSn.id },
                            data: {
                                warehouseId: data.targetWarehouseId,
                                popId: null,
                                customerId: null,
                                statusId: statusInStock.id,
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

                // 3. Upsert WarehouseStock — increment the appropriate column based on condition
                const stockField =
                    itemPayload.condition === "NEW" ? "stockNew" :
                    itemPayload.condition === "DAMAGED" ? "stockDamaged" :
                    "stockDismantle";

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
                            [stockField]: { increment: itemPayload.qty },
                            updatedAt: new Date(),
                        }
                    });
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.targetWarehouseId,
                            [stockField]: itemPayload.qty,
                            updatedAt: new Date(),
                        }
                    });
                }

                stockIns.push(stockIn);
            }

            return stockIns;
        });

        revalidatePath("/operasi");
        revalidatePath("/inbound");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        revalidatePath("/master");
        return { success: true, data: results };

    } catch (error: any) {
        console.error("Return Error:", error);
        return { success: false, error: error.message || "Gagal memproses barang return." };
    }
}
