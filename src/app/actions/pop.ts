"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";

export async function getPops() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const session = await auth();
        const warehouseId = session?.user?.level === "CABANG" ? session.user.warehouseId : null;

        const pops = await prisma.pop.findMany({
            where: warehouseId ? { warehouseId } : undefined,
            orderBy: { name: "asc" },
            include: {
                area: true,
                managingWarehouse: true,
                _count: {
                    select: { stockOuts: true, installations: true, serialNumbers: true }
                }
            }
        });
        return { success: true, data: pops };
    } catch (error) {
        return { success: false, error: "Gagal mengambil data POP" };
    }
}

export async function getWarehousesForSelect() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const session = await auth();
        const warehouseId = session?.user?.level === "CABANG" ? session.user.warehouseId : null;

        const warehouses = await prisma.warehouse.findMany({
            where: warehouseId ? { id: warehouseId } : undefined,
            orderBy: { name: "asc" },
            select: { id: true, name: true, type: true }
        });
        return { success: true, data: warehouses };
    } catch (error) {
        return { success: false, error: "Gagal mengambil list gudang pengelola" };
    }
}

export async function createPop(formData: FormData) {
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const areaId = formData.get("areaId") ? Number(formData.get("areaId")) : null;
    const warehouseId = formData.get("warehouseId") ? Number(formData.get("warehouseId")) : null;

    if (!name) {
        return { success: false, error: "Nama POP wajib diisi" };
    }

    try {
        await prisma.pop.create({
            data: {
                name,
                location: location || null,
                areaId,
                warehouseId,
            },
        });

        revalidatePath("/pop");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menambahkan POP" };
    }
}

export async function updatePop(id: number, formData: FormData) {
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const areaId = formData.get("areaId") ? Number(formData.get("areaId")) : null;
    const warehouseId = formData.get("warehouseId") ? Number(formData.get("warehouseId")) : null;

    if (!name) {
        return { success: false, error: "Nama POP wajib diisi" };
    }

    try {
        await prisma.pop.update({
            where: { id },
            data: {
                name,
                location: location || null,
                areaId,
                warehouseId,
            },
        });

        revalidatePath("/pop");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal memperbarui POP" };
    }
}

export async function deletePop(id: number) {
    try {
        await prisma.pop.delete({
            where: { id },
        });

        revalidatePath("/pop");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menghapus POP. Pastikan tidak ada stok atau transaksi terkait." };
    }
}
