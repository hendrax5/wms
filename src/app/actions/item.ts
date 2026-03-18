"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getItems() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const items = await prisma.item.findMany({
            orderBy: { code: "asc" },
            include: {
                category: true,
                company: true,
            }
        });
        return { success: true, data: items };
    } catch (error: any) {
        console.error("GET ITEMS ERROR", error?.message);
        return { success: false, error: "Gagal mengambil data barang" };
    }
}

export async function getCategoriesForSelect() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const items = await prisma.category.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, code: true, hasSN: true }
        });
        return { success: true, data: items };
    } catch (error) {
        return { success: false, error: "Gagal mengambil list kategori" };
    }
}

export async function createItem(data: { code: string; name: string; categoryId: number; minStock?: number; hasSN?: boolean }) {
    if (!data.code || !data.name || !data.categoryId) {
        return { success: false, error: "Kode, Nama, dan Kategori wajib diisi" };
    }

    try {
        const existing = await prisma.item.findUnique({ where: { code: data.code } });
        if (existing) {
            return { success: false, error: `Kode barang ${data.code} sudah digunakan` };
        }

        await prisma.item.create({
            data: {
                code: data.code,
                name: data.name,
                categoryId: data.categoryId,
                minStock: data.minStock || 0,
                hasSN: data.hasSN ?? true,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/master/items");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menambahkan barang" };
    }
}

export async function updateItem(id: number, data: { code: string; name: string; categoryId: number; minStock?: number; hasSN?: boolean }) {
    if (!data.code || !data.name || !data.categoryId) {
        return { success: false, error: "Kode, Nama, dan Kategori wajib diisi" };
    }

    try {
        const existing = await prisma.item.findUnique({ where: { code: data.code } });
        if (existing && existing.id !== id) {
            return { success: false, error: `Kode barang ${data.code} sudah digunakan` };
        }

        await prisma.item.update({
            where: { id },
            data: {
                code: data.code,
                name: data.name,
                categoryId: data.categoryId,
                minStock: data.minStock || 0,
                hasSN: data.hasSN ?? true,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/master/items");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal memperbarui barang" };
    }
}

export async function deleteItem(id: number) {
    try {
        await prisma.item.delete({
            where: { id },
        });

        revalidatePath("/master/items");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menghapus barang. Pastikan tidak ada stok atau transaksi terkait." };
    }
}
