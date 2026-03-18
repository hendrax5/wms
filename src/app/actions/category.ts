"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getCategories() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { item: true }
                }
            }
        });
        return { success: true, data: categories };
    } catch (error) {
        return { success: false, error: "Gagal mengambil data kategori" };
    }
}

export async function createCategory(formData: FormData) {
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const hasSN = formData.get("hasSN") === "on";

    if (!name) {
        return { success: false, error: "Nama kategori wajib diisi" };
    }

    try {
        await prisma.category.create({
            data: {
                name,
                code: code || null,
                hasSN,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/master/categories");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal membuat kategori" };
    }
}

export async function updateCategory(id: number, formData: FormData) {
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const hasSN = formData.get("hasSN") === "on";

    if (!name) {
        return { success: false, error: "Nama kategori wajib diisi" };
    }

    try {
        await prisma.category.update({
            where: { id },
            data: {
                name,
                code: code || null,
                hasSN,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/master/categories");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal memperbarui kategori" };
    }
}

export async function deleteCategory(id: number) {
    try {
        await prisma.category.delete({
            where: { id },
        });

        revalidatePath("/master/categories");
        return { success: true };
    } catch (error) {
        // If it fails, probably restricted by foreign key (items exist)
        return { success: false, error: "Gagal menghapus kategori. Pastikan tidak ada barang yang terkait dengan kategori ini." };
    }
}
