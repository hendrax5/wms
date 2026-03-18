"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type OutboundItemPayload = {
    itemId: number;
    qty: number;
    serialNumbers: string[];
};

type InstallationPayload = {
    sourceWarehouseId: number;
    items: OutboundItemPayload[];
    installType: "POP" | "CUSTOMER";
    targetPopId?: number;
    targetCustomerName?: string;
    targetCustomerLocation?: string;
    techName1?: string;
    techName2?: string;
    description?: string;
};

export async function createInstallation(data: InstallationPayload) {
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

        if (data.installType === "POP" && !data.targetPopId) {
            return { success: false, error: "POP Tujuan wajib dipilih." };
        }

        if (data.installType === "CUSTOMER" && !data.targetCustomerName) {
            return { success: false, error: "Nama Customer Tujuan wajib diisi." };
        }

        const outTypeEnum = data.installType === "POP" ? "POP_INSTALL" : "CUSTOMER_INSTALL";

        const statusDipakai = await prisma.itemStatus.upsert({
            where: { name: "Dipakai" },
            update: {},
            create: { name: "Dipakai" }
        });

        const technicianCombined = [data.techName1, data.techName2].filter(Boolean).join(" & ");

        const results = await prisma.$transaction(async (tx) => {
            const stockOuts = [];

            for (const itemPayload of data.items) {
                const sourceStock = await tx.warehouseStock.findUnique({
                    where: {
                        itemId_warehouseId: {
                            itemId: itemPayload.itemId,
                            warehouseId: data.sourceWarehouseId
                        }
                    }
                });

                if (!sourceStock || sourceStock.stockNew < itemPayload.qty) {
                    const available = sourceStock ? sourceStock.stockNew : 0;
                    const itemInfo = await tx.item.findUnique({ where: { id: itemPayload.itemId } });
                    throw new Error(`Stok "${itemInfo?.name || itemPayload.itemId}" tidak mencukupi. Tersedia: ${available}, Diminta: ${itemPayload.qty}`);
                }

                const stockOut = await tx.stockOut.create({
                    data: {
                        warehouseId: data.sourceWarehouseId,
                        itemId: itemPayload.itemId,
                        qty: itemPayload.qty,
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
                    data: { stockNew: { decrement: itemPayload.qty }, updatedAt: new Date() }
                });

                if (itemPayload.serialNumbers.length > 0) {
                    for (const snCode of itemPayload.serialNumbers) {
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
                                    itemId: itemPayload.itemId,
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
                                    itemId: itemPayload.itemId,
                                    serialNumberId: existingSn.id,
                                    installedBy: technicianCombined,
                                    description: data.description
                                }
                            });
                        }
                    }
                } else {
                    // Non-SN items
                    if (data.installType === "POP") {
                        for (let i = 0; i < itemPayload.qty; i++) {
                            await tx.popInstallation.create({
                                data: {
                                    popId: data.targetPopId!,
                                    itemId: itemPayload.itemId,
                                    installedBy: technicianCombined,
                                    description: data.description
                                }
                            });
                        }
                    } else {
                        for (let i = 0; i < itemPayload.qty; i++) {
                            await tx.customerInstallation.create({
                                data: {
                                    customerName: data.targetCustomerName!,
                                    customerAddress: data.targetCustomerLocation,
                                    itemId: itemPayload.itemId,
                                    installedBy: technicianCombined,
                                    description: data.description
                                }
                            });
                        }
                    }
                }

                stockOuts.push(stockOut);
            }

            return stockOuts;
        });

        revalidatePath("/outbound");
        revalidatePath("/stock");
        revalidatePath("/pop");
        revalidatePath("/dashboard");
        revalidatePath("/tracking");
        return { success: true, data: results };

    } catch (error: any) {
        console.error("Installation Error:", error);
        return { success: false, error: error.message || "Gagal memproses barang keluar / instalasi." };
    }
}
