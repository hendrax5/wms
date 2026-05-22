"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { warehouse_type } from "@prisma/client";

export async function getWarehouses() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const warehouses = await prisma.warehouse.findMany({
            orderBy: { name: "asc" },
            include: {
                area: true,
                _count: {
                    select: { user: true, pop: true }
                }
            }
        });
        return { success: true, data: warehouses };
    } catch (error) {
        return { success: false, error: "Gagal mengambil data gudang/cabang" };
    }
}

export async function getAreasForSelect() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const areas = await prisma.area.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true }
        });
        return { success: true, data: areas };
    } catch (error) {
        return { success: false, error: "Gagal mengambil list area" };
    }
}

export async function createWarehouse(formData: FormData) {
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const type = formData.get("type") as warehouse_type;
    const areaId = formData.get("areaId") ? Number(formData.get("areaId")) : null;

    if (!name) {
        return { success: false, error: "Nama gudang/cabang wajib diisi" };
    }

    try {
        await prisma.warehouse.create({
            data: {
                name,
                location: location || null,
                type: type || "CABANG",
                areaId,
            },
        });

        revalidatePath("/master/warehouses");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menambahkan gudang/cabang" };
    }
}

export async function updateWarehouse(id: number, formData: FormData) {
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const type = formData.get("type") as warehouse_type;
    const areaId = formData.get("areaId") ? Number(formData.get("areaId")) : null;

    if (!name) {
        return { success: false, error: "Nama gudang/cabang wajib diisi" };
    }

    try {
        await prisma.warehouse.update({
            where: { id },
            data: {
                name,
                location: location || null,
                type: type || "CABANG",
                areaId,
            },
        });

        revalidatePath("/master/warehouses");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal memperbarui gudang/cabang" };
    }
}

export async function deleteWarehouse(id: number) {
    try {
        await prisma.warehouse.delete({
            where: { id },
        });

        revalidatePath("/master/warehouses");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menghapus gudang. Pastikan tidak ada stok atau user terkait." };
    }
}

export async function importWarehouseBatch(
    data: {
        name: string;
        type: "PUSAT" | "CABANG";
        areaName: string;
        location?: string;
    }[]
) {
    try {
        if (!data || data.length === 0) {
            return { success: false, error: "Data impor kosong atau tidak valid" };
        }

        const result = await prisma.$transaction(async (tx) => {
            // Pre-load all areas to memory map (case-insensitive key)
            const existingAreas = await tx.area.findMany();
            const areaMap = new Map<string, number>();
            existingAreas.forEach(a => {
                areaMap.set(a.name.toLowerCase().trim(), a.id);
            });

            let createdCount = 0;

            for (const row of data) {
                const name = row.name?.trim();
                const type = (row.type?.trim().toUpperCase() as "PUSAT" | "CABANG") || "CABANG";
                const areaName = row.areaName?.trim();
                const location = row.location?.trim() || null;

                if (!name) {
                    throw new Error("Nama gudang wajib diisi");
                }

                if (!areaName) {
                    throw new Error(`Gudang "${name}" wajib memiliki Area.`);
                }

                // Resolve Area ID
                let areaId = areaMap.get(areaName.toLowerCase());
                if (!areaId) {
                    // Auto-create Area
                    const newArea = await tx.area.create({
                        data: { name: areaName }
                    });
                    areaId = newArea.id;
                    areaMap.set(areaName.toLowerCase(), areaId);
                }

                // Create Warehouse
                await tx.warehouse.create({
                    data: {
                        name,
                        type,
                        location,
                        areaId
                    }
                });

                createdCount++;
            }

            return { createdCount };
        });

        revalidatePath("/stock");
        revalidatePath("/master/warehouses");
        return { success: true, createdCount: result.createdCount };
    } catch (error: any) {
        console.error("IMPORT WAREHOUSE BATCH ERROR:", error);
        return { success: false, error: error.message || "Gagal mengimpor data gudang" };
    }
}

