"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "./audit";
import { ReturnService, ReturnPayload } from "@/lib/services/ReturnService";

import { z } from "zod";

const ReturnItemSchema = z.object({
    itemId: z.number().int().positive(),
    qty: z.number().int().positive("Quantity setiap barang harus lebih dari 0."),
    qtyNew: z.number().int().nonnegative().optional(),
    qtyDismantle: z.number().int().nonnegative().optional(),
    qtyDamaged: z.number().int().nonnegative().optional(),
    condition: z.enum(["NEW", "DISMANTLE", "DAMAGED"]).optional(),
    serialNumbers: z.array(z.string())
}).refine(data => data.serialNumbers.length === 0 || data.serialNumbers.length === data.qty, {
    message: "Jumlah Serial Number tidak sesuai dengan Qty untuk salah satu barang.",
    path: ["serialNumbers"]
});

const ReturnSchema = z.object({
    targetWarehouseId: z.number().int().positive(),
    returnSource: z.enum(["POP", "CUSTOMER"]),
    sourcePopId: z.number().int().positive().optional(),
    sourceCustomerName: z.string().optional(),
    items: z.array(ReturnItemSchema).min(1, "Minimal 1 barang harus ditambahkan."),
    techName: z.string().optional(),
    description: z.string().optional()
}).refine(data => {
    if (data.returnSource === "POP" && !data.sourcePopId) return false;
    return true;
}, {
    message: "POP Asal wajib dipilih.",
    path: ["sourcePopId"]
}).refine(data => {
    if (data.returnSource === "CUSTOMER" && !data.sourceCustomerName) return false;
    return true;
}, {
    message: "Nama Customer Asal wajib diisi.",
    path: ["sourceCustomerName"]
});

type ReturnItemPayloadLocal = z.infer<typeof ReturnItemSchema>;
type ReturnPayloadLocal = z.infer<typeof ReturnSchema>;

export async function verifySerialNumberForReturn(code: string) {
    try {
        const sn = await prisma.serialNumber.findUnique({
            where: { code },
            select: {
                id: true,
                code: true,
                itemId: true,
                item: { select: { id: true, name: true, code: true } },
                itemstatus: { select: { name: true } },
                warehouse: { select: { name: true } },
            }
        });

        if (!sn) {
            return { success: false, error: `Serial Number ${code} tidak ditemukan di sistem.` };
        }

        return { success: true, data: sn };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createReturn(rawData: ReturnPayloadLocal) {
    try {
        const parsed = ReturnSchema.safeParse(rawData);
        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "Input tidak valid.";
            await logAudit({ action: "RETURN", status: "ERROR", warehouseId: rawData.targetWarehouseId, message: errorMsg });
            return { success: false, error: errorMsg };
        }
        
        const data = parsed.data;

        const results = await ReturnService.processReturn(data as ReturnPayload);

        revalidatePath("/operasi");
        revalidatePath("/inbound");
        revalidatePath("/stock");
        revalidatePath("/dashboard");
        revalidatePath("/master");
        
        await logAudit({ 
            action: "RETURN", 
            status: "SUCCESS", 
            warehouseId: data.targetWarehouseId, 
            message: `Berhasil memproses return ${data.items.length} item(s) dari ${data.returnSource}`,
            details: JSON.stringify({ source: data.returnSource === "POP" ? data.sourcePopId : data.sourceCustomerName })
        });
        
        return { success: true, data: results };

    } catch (error: any) {
        console.error("Return Error:", error);
        await logAudit({ 
            action: "RETURN", 
            status: "ERROR", 
            warehouseId: rawData.targetWarehouseId, 
            message: error.message || "Gagal memproses return barang." 
        });
        return { success: false, error: error.message || "Gagal memproses return barang." };
    }
}
