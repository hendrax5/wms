"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getAppConfig() {
    noStore();
    try {
        let config = await prisma.appConfig.findUnique({
            where: { id: 1 }
        });
        
        if (!config) {
            config = await prisma.appConfig.create({
                data: {
                    id: 1,
                    appName: "WMS",
                    companyName: "PT Gudang Utama",
                }
            });
        }
        
        return { success: true, data: config };
    } catch (error: any) {
        console.error("GET APP CONFIG ERROR", error?.message);
        return { success: false, error: "Gagal memuat pengaturan aplikasi" };
    }
}

export async function updateAppConfig(data: { appName: string; companyName: string; description?: string; logo?: string }) {
    try {
        await prisma.appConfig.upsert({
            where: { id: 1 },
            update: {
                appName: data.appName,
                companyName: data.companyName,
                description: data.description,
                logo: data.logo,
            },
            create: {
                id: 1,
                appName: data.appName,
                companyName: data.companyName,
                description: data.description,
                logo: data.logo,
            }
        });
        
        revalidatePath("/");
        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("UPDATE APP CONFIG ERROR", error?.message);
        return { success: false, error: "Gagal menyimpan pengaturan" };
    }
}

export async function resetOperationalData(confirmCompanyName: string) {
    try {
        const config = await prisma.appConfig.findUnique({ where: { id: 1 } });
        if (!config) return { success: false, error: "Setup aplikasi belum selesai." };
        
        if (confirmCompanyName !== config.companyName) {
            return { success: false, error: "Nama PT tidak sesuai. Reset dibatalkan." };
        }

        // Execute sequentially to avoid foreign key constraint errors
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
        });

        // Also reset Item's computed/denormalized fields if any, but our schema doesn't seem to have totalFisik in Item.
        
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("RESET DATA ERROR", error?.message);
        return { success: false, error: "Gagal me-reset data. Pastikan tidak ada transaksi yang sedang berjalan." };
    }
}
