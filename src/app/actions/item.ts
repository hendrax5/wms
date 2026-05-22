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

export async function createItem(data: { code: string; name: string; categoryId: number; minStock?: number; hasSN: boolean; price?: number; unit?: string }) {
    if (!data.code || !data.name || !data.categoryId || data.hasSN === undefined) {
        return { success: false, error: "Kode, Nama, Kategori, dan Status SN wajib diisi" };
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
                hasSN: data.hasSN,
                unit: data.unit || "Pcs",
                price: data.price || 0,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/master/items");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menambahkan barang" };
    }
}

export async function updateItem(id: number, data: { code: string; name: string; categoryId: number; minStock?: number; hasSN: boolean; price?: number; unit?: string }) {
    if (!data.code || !data.name || !data.categoryId || data.hasSN === undefined) {
        return { success: false, error: "Kode, Nama, Kategori, dan Status SN wajib diisi" };
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
                hasSN: data.hasSN,
                unit: data.unit || "Pcs",
                price: data.price || 0,
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

export async function importItemBatch(
    data: {
        code: string;
        name: string;
        categoryName: string;
        companyName?: string;
        hasSN: boolean;
        minStock?: number;
        unit?: string;
        price?: number;
    }[]
) {
    try {
        if (!data || data.length === 0) {
            return { success: false, error: "Data impor kosong atau tidak valid" };
        }

        const result = await prisma.$transaction(async (tx) => {
            // Pre-load all categories to memory map
            const existingCategories = await tx.category.findMany();
            const categoryMap = new Map<string, number>();
            existingCategories.forEach(c => {
                categoryMap.set(c.name.toLowerCase().trim(), c.id);
            });

            // Pre-load all companies to memory map
            const existingCompanies = await tx.company.findMany();
            const companyMap = new Map<string, number>();
            existingCompanies.forEach(c => {
                companyMap.set(c.name.toLowerCase().trim(), c.id);
            });

            // Check for existing items in db to prevent duplicate codes
            const codesToImport = data.map(row => row.code?.trim()).filter(Boolean);
            const duplicateInDb = await tx.item.findMany({
                where: { code: { in: codesToImport } },
                select: { code: true }
            });

            if (duplicateInDb.length > 0) {
                const dupCodes = duplicateInDb.map(item => item.code).join(", ");
                throw new Error(`Kode barang berikut sudah digunakan di database: ${dupCodes}`);
            }

            // Also check for duplicate codes inside the excel file itself
            const uniqueCodes = new Set<string>();
            for (const code of codesToImport) {
                if (uniqueCodes.has(code.toLowerCase())) {
                    throw new Error(`Kode barang duplikat ditemukan di dalam file Excel: ${code}`);
                }
                uniqueCodes.add(code.toLowerCase());
            }

            let createdCount = 0;

            for (const row of data) {
                const code = row.code?.trim();
                const name = row.name?.trim();
                const categoryName = row.categoryName?.trim();
                const companyName = row.companyName?.trim() || null;
                const hasSN = row.hasSN;
                const minStock = Number(row.minStock) || 0;
                const unit = row.unit?.trim() || "Pcs";
                const price = Number(row.price) || 0;

                if (!code || !name) {
                    throw new Error("Kode Barang dan Nama Barang wajib diisi");
                }

                if (!categoryName) {
                    throw new Error(`Barang "${name}" (${code}) wajib memiliki Kategori.`);
                }

                // Resolve Category ID
                let categoryId = categoryMap.get(categoryName.toLowerCase());
                if (!categoryId) {
                    // Auto-create Category (hasSN defaults to true)
                    const newCategory = await tx.category.create({
                        data: { name: categoryName, hasSN: true }
                    });
                    categoryId = newCategory.id;
                    categoryMap.set(categoryName.toLowerCase(), categoryId);
                }

                // Resolve Company ID
                let companyId = null;
                if (companyName) {
                    companyId = companyMap.get(companyName.toLowerCase());
                    if (!companyId) {
                        const newCompany = await tx.company.create({
                            data: { name: companyName }
                        });
                        companyId = newCompany.id;
                        companyMap.set(companyName.toLowerCase(), companyId);
                    }
                }

                // Create Item
                await tx.item.create({
                    data: {
                        code,
                        name,
                        categoryId,
                        companyId,
                        hasSN,
                        minStock,
                        unit,
                        price,
                        updatedAt: new Date()
                    }
                });

                createdCount++;
            }

            return { createdCount };
        });

        revalidatePath("/master/items");
        revalidatePath("/master");
        return { success: true, createdCount: result.createdCount };
    } catch (error: any) {
        console.error("IMPORT ITEM BATCH ERROR:", error);
        return { success: false, error: error.message || "Gagal mengimpor data barang" };
    }
}

