import { prisma } from "@/lib/db";
import { INVENTORY_CONDITIONS } from "@/lib/constants/inventory";

export interface ReturnItemPayload {
    itemId: number;
    qty: number;
    qtyNew?: number;
    qtyDismantle?: number;
    qtyDamaged?: number;
    condition?: "NEW" | "DISMANTLE" | "DAMAGED";
    serialNumbers: string[];
}

export interface ReturnPayload {
    targetWarehouseId: number;
    returnSource: "POP" | "CUSTOMER";
    sourcePopId?: number;
    sourceCustomerName?: string;
    items: ReturnItemPayload[];
    techName?: string;
    description?: string;
}

export class ReturnService {
    /**
     * Processes a return transaction: creates stock in, updates serial numbers,
     * and increments the warehouse stock accordingly.
     * @param data Validated ReturnPayload
     */
    static async processReturn(data: ReturnPayload) {
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

        return await prisma.$transaction(async (tx) => {
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

                        if (itemPayload.condition === INVENTORY_CONDITIONS.NEW) {
                            snTypeId = typeBaru.id;
                        } else if (itemPayload.condition === INVENTORY_CONDITIONS.DAMAGED) {
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
                    if (itemPayload.condition === INVENTORY_CONDITIONS.NEW) qtyNew = itemPayload.qty;
                    else if (itemPayload.condition === INVENTORY_CONDITIONS.DAMAGED) qtyDamaged = itemPayload.qty;
                    else qtyDismantle = itemPayload.qty;
                } else {
                    qtyNew = itemPayload.qtyNew ?? 0;
                    qtyDismantle = itemPayload.qtyDismantle ?? 0;
                    qtyDamaged = itemPayload.qtyDamaged ?? 0;
                    
                    if (qtyNew === 0 && qtyDismantle === 0 && qtyDamaged === 0 && itemPayload.qty > 0) {
                        // Fallback for legacy requests without separate quantities
                        if (itemPayload.condition === INVENTORY_CONDITIONS.NEW) qtyNew = itemPayload.qty;
                        else if (itemPayload.condition === INVENTORY_CONDITIONS.DAMAGED) qtyDamaged = itemPayload.qty;
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
    }
}
