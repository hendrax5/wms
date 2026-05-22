import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$transaction(async (tx) => {
            // Level 3 (Deepest dependents)
            await tx.stockInSerial.deleteMany({});
            await tx.stockOutSerial.deleteMany({});
            await tx.damagedSerial.deleteMany({});
            await tx.stockRequestDetail.deleteMany({});
            await tx.stockAdjustmentDetail.deleteMany({});
            await tx.stockOpnameDetail.deleteMany({});
            await tx.popInstallation.deleteMany({});
            await tx.customerInstallation.deleteMany({});
            await tx.assetDepreciation.deleteMany({});
            await tx.assetMaintenanceLog.deleteMany({});
            
            // Level 2
            await tx.serialNumber.deleteMany({});
            await tx.inventoryLog.deleteMany({});
            await tx.damagedItem.deleteMany({});
            await tx.deliveryManifest.deleteMany({});
            
            // Level 1
            await tx.stockIn.deleteMany({});
            await tx.stockOut.deleteMany({});
            await tx.stockTransfer.deleteMany({});
            await tx.stockRequest.deleteMany({});
            await tx.stockAdjustment.deleteMany({});
            await tx.stockOpname.deleteMany({});
            await tx.asset.deleteMany({});
            await tx.pop.deleteMany({});
            
            // Level 0 (Stock counts)
            await tx.warehouseStock.deleteMany({});
        }, { maxWait: 20000, timeout: 300000 });
        console.log("Success");
    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
