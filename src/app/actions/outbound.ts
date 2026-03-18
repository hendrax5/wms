"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type InstallationPayload = {
    sourceWarehouseId: number;
    itemId: number;
    qty: number;
    installType: "POP" | "CUSTOMER";
    targetPopId?: number;
    targetCustomerName?: string;
    targetCustomerLocation?: string;
    techName1?: string;
    techName2?: string;
    description?: string;
    serialNumbers: string[];
};

export async function createInstallation(data: InstallationPayload) {
    try {
        if (data.qty <= 0) {
            return { success: false, error: "Quantity keluar harus lebih dari 0." };
        }

        if (data.installType === "POP" && !data.targetPopId) {
            return { success: false, error: "POP Tujuan wajib dipilih." };
        }

        if (data.installType === "CUSTOMER" && !data.targetCustomerName) {
            return { success: false, error: "Nama Customer Tujuan wajib diisi." };
        }

        if (data.serialNumbers.length > 0 && data.serialNumbers.length !== data.qty) {
            return { success: false, error: "Jumlah Serial Number tidak sesuai dengan Qty Barang Keluar." };
        }

        const outTypeEnum = data.installType === "POP" ? "POP_INSTALL" : "CUSTOMER_INSTALL";

        const statusDipakai = await prisma.itemStatus.upsert({
            where: { name: "Dipakai" },
            update: {},
            create: { name: "Dipakai" }
        });

        const result = await prisma.$transaction(async (tx) => {
            const sourceStock = await tx.warehouseStock.findUnique({
                where: {
                    itemId_warehouseId: {
                        itemId: data.itemId,
                        warehouseId: data.sourceWarehouseId
                    }
                }
            });

            if (!sourceStock || sourceStock.stockNew < data.qty) {
                const available = sourceStock ? sourceStock.stockNew : 0;
                throw new Error(`Stok Unit Baru di gudang asal tidak mencukupi. Tersedia: ${available}, Diminta: ${data.qty}`);
            }

            const stockOut = await tx.stockOut.create({
                data: {
                    warehouseId: data.sourceWarehouseId,
                    itemId: data.itemId,
                    qty: data.qty,
                    outType: outTypeEnum,
                    description: data.description,
                    techName1: data.techName1,
                    techName2: data.techName2,
                    popId: data.installType === "POP" ? data.targetPopId : null,
                    customerName: data.installType === "CUSTOMER" ? data.targetCustomerName : null,
                    location: data.installType === "CUSTOMER" ? data.targetCustomerLocation : null,
                }
            });

            await tx.warehouseStock.update({
                where: { id: sourceStock.id },
                data: { stockNew: { decrement: data.qty }, updatedAt: new Date() }
            });

            const technicianCombined = [data.techName1, data.techName2].filter(Boolean).join(" & ");

            if (data.serialNumbers.length > 0) {
                for (const snCode of data.serialNumbers) {
                    const existingSn = await tx.serialNumber.findUnique({
                        where: { code: snCode }
                    });

                    if (!existingSn) {
                        throw new Error(`Serial Number ${snCode} tidak ditemukan di sistem.`);
                    }

                    if (existingSn.warehouseId !== data.sourceWarehouseId) {
                        throw new Error(`Serial Number ${snCode} tidak berada di gudang asal yang dipilih.`);
                    }

                    await tx.serialNumber.update({
                        where: { id: existingSn.id },
                        data: {
                            warehouseId: null,
                            popId: data.installType === "POP" ? data.targetPopId : null,
                            customerId: null,
                            statusId: statusDipakai.id,
                            updatedAt: new Date(),
                        }
                    });

                    await tx.stockOutSerial.create({
                        data: {
                            stockOutId: stockOut.id,
                            serialNumberId: existingSn.id,
                            serialCode: existingSn.code
                        }
                    });

                    if (data.installType === "POP") {
                        await tx.popInstallation.create({
                            data: {
                                popId: data.targetPopId!,
                                itemId: data.itemId,
                                serialNumberId: existingSn.id,
                                installedBy: technicianCombined,
                                description: data.description
                            }
                        });
                    } else {
                        await tx.customerInstallation.create({
                            data: {
                                customerName: data.targetCustomerName!,
                                customerAddress: data.targetCustomerLocation,
                                itemId: data.itemId,
                                serialNumberId: existingSn.id,
                                installedBy: technicianCombined,
                                description: data.description
                            }
                        });
                    }
                }
            } else {
                if (data.installType === "POP") {
                    for (let i = 0; i < data.qty; i++) {
                        await tx.popInstallation.create({
                            data: {
                                popId: data.targetPopId!,
                                itemId: data.itemId,
                                installedBy: technicianCombined,
                                description: data.description
                            }
                        });
                    }
                } else {
                    for (let i = 0; i < data.qty; i++) {
                        await tx.customerInstallation.create({
                            data: {
                                customerName: data.targetCustomerName!,
                                customerAddress: data.targetCustomerLocation,
                                itemId: data.itemId,
                                installedBy: technicianCombined,
                                description: data.description
                            }
                        });
                    }
                }
            }

            return stockOut;
        });

        revalidatePath("/outbound");
        revalidatePath("/stock");
        revalidatePath("/pop");
        revalidatePath("/dashboard");
        revalidatePath("/tracking");
        return { success: true, data: result };

    } catch (error: any) {
        console.error("Installation Error:", error);
        return { success: false, error: error.message || "Gagal memproses barang keluar / instalasi." };
    }
}
