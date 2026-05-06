"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit";

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
            await logAudit({ action: "OUTBOUND_INSTALLATION", status: "ERROR", warehouseId: data.sourceWarehouseId, message: "Minimal 1 barang harus ditambahkan." });
            return { success: false, error: "Minimal 1 barang harus ditambahkan." };
        }

        for (const item of data.items) {
            if (item.qty <= 0) {
                await logAudit({ action: "OUTBOUND_INSTALLATION", status: "ERROR", warehouseId: data.sourceWarehouseId, message: "Quantity setiap barang harus lebih dari 0." });
                return { success: false, error: "Quantity setiap barang harus lebih dari 0." };
            }
            if (item.serialNumbers.length > 0 && item.serialNumbers.length !== item.qty) {
                await logAudit({ action: "OUTBOUND_INSTALLATION", status: "ERROR", warehouseId: data.sourceWarehouseId, message: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang." });
                return { success: false, error: `Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang.` };
            }
        }

        if (data.installType === "POP" && !data.targetPopId) {
            await logAudit({ action: "OUTBOUND_INSTALLATION", status: "ERROR", warehouseId: data.sourceWarehouseId, message: "POP Tujuan wajib dipilih." });
            return { success: false, error: "POP Tujuan wajib dipilih." };
        }

        if (data.installType === "CUSTOMER" && !data.targetCustomerName) {
            await logAudit({ action: "OUTBOUND_INSTALLATION", status: "ERROR", warehouseId: data.sourceWarehouseId, message: "Nama Customer Tujuan wajib diisi." });
            return { success: false, error: "Nama Customer Tujuan wajib diisi." };
        }

        const outTypeEnum = data.installType === "POP" ? "POP_INSTALL" : "CUSTOMER_INSTALL";

        const statusDipakai = await prisma.itemStatus.upsert({
            where: { name: "Dipakai" },
            update: {},
            create: { name: "Dipakai" }
        });

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

                let qtyNew = 0;
                let qtyDismantle = 0;
                let qtyDamaged = 0;

                // Validate SN and calculate types BEFORE doing stock changes
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

                        if (existingSn.typeId === typeBaru.id) qtyNew++;
                        else if (existingSn.typeId === typeDismantle.id) qtyDismantle++;
                        else qtyDamaged++;
                    }
                } else {
                    qtyNew = itemPayload.qty;
                }

                if (!sourceStock || sourceStock.stockNew < qtyNew || sourceStock.stockDismantle < qtyDismantle || sourceStock.stockDamaged < qtyDamaged) {
                    const itemInfo = await tx.item.findUnique({ where: { id: itemPayload.itemId } });
                    throw new Error(`Stok "${itemInfo?.name || itemPayload.itemId}" tidak mencukupi untuk kondisi barang yang dipilih.`);
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
                    data: { 
                        stockNew: { decrement: qtyNew }, 
                        stockDismantle: { decrement: qtyDismantle }, 
                        stockDamaged: { decrement: qtyDamaged }, 
                        updatedAt: new Date() 
                    }
                });

                if (itemPayload.serialNumbers.length > 0) {
                    for (const snCode of itemPayload.serialNumbers) {
                        const existingSn = await tx.serialNumber.findUnique({
                            where: { code: snCode }
                        });

                        // We already validated above, but we need the ID
                        if (existingSn) {
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
        }, { maxWait: 20000, timeout: 300000 });

        revalidatePath("/outbound");
        revalidatePath("/stock");
        revalidatePath("/pop");
        revalidatePath("/dashboard");
        revalidatePath("/tracking");
        
        await logAudit({ 
            action: "OUTBOUND_INSTALLATION", 
            status: "SUCCESS", 
            warehouseId: data.sourceWarehouseId, 
            message: `Berhasil mengeluarkan ${data.items.length} item(s) untuk ${data.installType}`,
            details: JSON.stringify({ target: data.installType === "POP" ? data.targetPopId : data.targetCustomerName })
        });
        
        return { success: true, data: results };

    } catch (error: any) {
        console.error("Installation Error:", error);
        await logAudit({ 
            action: "OUTBOUND_INSTALLATION", 
            status: "ERROR", 
            warehouseId: data.sourceWarehouseId, 
            message: error.message || "Gagal memproses barang keluar / instalasi." 
        });
        return { success: false, error: error.message || "Gagal memproses barang keluar / instalasi." };
    }
}
