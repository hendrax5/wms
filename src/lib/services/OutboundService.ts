import { prisma } from "@/lib/db";

export interface OutboundItemPayload {
    itemId: number;
    qty: number;
    qtyNew?: number;
    qtyDismantle?: number;
    qtyDamaged?: number;
    serialNumbers: string[];
}

export interface InstallationPayload {
    sourceWarehouseId: number;
    items: OutboundItemPayload[];
    installType: "POP" | "CUSTOMER";
    targetPopId?: number;
    targetCustomerName?: string;
    targetCustomerLocation?: string;
    techName1?: string;
    techName2?: string;
    description?: string;
}

export class OutboundService {
    /**
     * Processes an outbound/installation transaction: decrements warehouse stock,
     * updates serial numbers to 'Dipakai', and records the outbound transactions.
     * @param data Validated InstallationPayload
     */
    static async processInstallation(data: InstallationPayload) {
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

        return await prisma.$transaction(async (tx) => {
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
                let existingSns: any[] = [];

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
                        
                        existingSns.push(existingSn);
                    }
                } else {
                    qtyNew = itemPayload.qtyNew ?? itemPayload.qty;
                    qtyDismantle = itemPayload.qtyDismantle ?? 0;
                    qtyDamaged = itemPayload.qtyDamaged ?? 0;
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

                if (existingSns.length > 0) {
                    for (const existingSn of existingSns) {
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
        }, { maxWait: 20000, timeout: 300000 });
    }
}
