"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { WarehouseType } from "@prisma/client";

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
                    select: { users: true, pops: true }
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
    const type = formData.get("type") as WarehouseType;
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
    const type = formData.get("type") as WarehouseType;
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
