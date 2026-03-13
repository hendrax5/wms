"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type DamagedPayload = {
    warehouseId: number;
    itemId: number;
    qty: number;
    description?: string;
    serialNumbers: string[];
};

export async function createDamagedReport(data: DamagedPayload) {
    try {
        if (data.qty <= 0) {
            return { success: false, error: "Quantity harus lebih dari 0." };
        }

        if (data.serialNumbers.length > 0 && data.serialNumbers.length !== data.qty) {
            return { success: false, error: "Jumlah Serial Number tidak sesuai dengan Qty." };
        }

        // Determine Status ID for Rusak
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

        const result = await prisma.$transaction(async (tx) => {
            // Validate Warehouse Stock
            const stock = await tx.warehouseStock.findUnique({
                where: {
                    itemId_warehouseId: {
                        itemId: data.itemId,
                        warehouseId: data.warehouseId
                    }
                }
            });

            // For simplicity, we assume they are coming from stockNew for now. 
            // In a full implementation we might need to know if they were dismantling.
            if (!stock || stock.stockNew < data.qty) {
                const available = stock ? stock.stockNew : 0;
                throw new Error(`Stok Baru di gudang tidak mencukupi untuk dilaporkan rusak. Tersedia: ${available}`);
            }

            // 1. Create DamagedItem log
            const damagedLog = await tx.damagedItem.create({
                data: {
                    warehouseId: data.warehouseId,
                    itemId: data.itemId,
                    qty: data.qty,
                    description: data.description,
                }
            });

            // 2. Decrement healthy stock, increment damaged
            await tx.warehouseStock.update({
                where: { id: stock.id },
                data: {
                    stockNew: { decrement: data.qty },
                    stockDamaged: { increment: data.qty }
                }
            });

            // 3. Process Serial Numbers if present
            if (data.serialNumbers.length > 0) {
                for (const snCode of data.serialNumbers) {
                    const existingSn = await tx.serialNumber.findUnique({
                        where: { code: snCode }
                    });

                    if (!existingSn) {
                        throw new Error(`Serial Number ${snCode} tidak ditemukan di sistem.`);
                    }

                    if (existingSn.warehouseId !== data.warehouseId) {
                        throw new Error(`Serial Number ${snCode} tidak berada di gudang yang dipilih.`);
                    }

                    // Update SN attributes to Rusak
                    await tx.serialNumber.update({
                        where: { id: existingSn.id },
                        data: {
                            typeId: typeRusak.id,
                            statusId: statusRusak.id
                        }
                    });

                    // Link to Damaged record
                    await tx.damagedSerial.create({
                        data: {
                            damagedItemId: damagedLog.id,
                            serialNumberId: existingSn.id,
                            serialCode: existingSn.code
                        }
                    });
                }
            }

            return damagedLog;
        });

        revalidatePath("/damaged");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        return { success: true, data: result };

    } catch (error: any) {
        console.error("Damaged Report Error:", error);
        return { success: false, error: error.message || "Gagal memproses laporan barang rusak." };
    }
}
