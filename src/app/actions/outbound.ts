"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit";
import { OutboundService, InstallationPayload } from "@/lib/services/OutboundService";

import { z } from "zod";

const OutboundItemSchema = z.object({
    itemId: z.number().int().positive(),
    qty: z.number().int().positive("Quantity setiap barang harus lebih dari 0."),
    qtyNew: z.number().int().nonnegative().optional(),
    qtyDismantle: z.number().int().nonnegative().optional(),
    qtyDamaged: z.number().int().nonnegative().optional(),
    serialNumbers: z.array(z.string())
}).refine(data => data.serialNumbers.length === 0 || data.serialNumbers.length === data.qty, {
    message: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang.",
    path: ["serialNumbers"]
});

const OutboundInstallationSchema = z.object({
    sourceWarehouseId: z.number().int().positive(),
    items: z.array(OutboundItemSchema).min(1, "Minimal 1 barang harus ditambahkan."),
    installType: z.enum(["POP", "CUSTOMER"]),
    targetPopId: z.number().int().positive().optional(),
    targetCustomerName: z.string().optional(),
    targetCustomerLocation: z.string().optional(),
    techName1: z.string().optional(),
    techName2: z.string().optional(),
    description: z.string().optional()
}).refine(data => {
    if (data.installType === "POP" && !data.targetPopId) return false;
    return true;
}, {
    message: "POP Tujuan wajib dipilih.",
    path: ["targetPopId"]
}).refine(data => {
    if (data.installType === "CUSTOMER" && !data.targetCustomerName) return false;
    return true;
}, {
    message: "Nama Customer Tujuan wajib diisi.",
    path: ["targetCustomerName"]
});

type OutboundItemPayloadLocal = z.infer<typeof OutboundItemSchema>;
type InstallationPayloadLocal = z.infer<typeof OutboundInstallationSchema>;

export async function createInstallation(rawData: InstallationPayloadLocal) {
    try {
        const parsed = OutboundInstallationSchema.safeParse(rawData);
        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid.";
            await logAudit({ action: "OUTBOUND_INSTALLATION", status: "ERROR", warehouseId: rawData.sourceWarehouseId, message: errorMsg });
            return { success: false, error: errorMsg };
        }
        
        const data = parsed.data;

        const results = await OutboundService.processInstallation(data as InstallationPayload);

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
            warehouseId: rawData.sourceWarehouseId, 
            message: error.message || "Gagal memproses barang keluar / instalasi." 
        });
        return { success: false, error: error.message || "Gagal memproses barang keluar / instalasi." };
    }
}
