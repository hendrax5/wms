"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUsers() {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }
        const users = await prisma.user.findMany({
            orderBy: { name: "asc" },
            include: {
                warehouse: true
            }
        });

        // Remove passwords from response
        const safeUsers = users.map(u => {
            const { password, ...safeUser } = u;
            return safeUser;
        });

        return { success: true, data: safeUsers };
    } catch (error) {
        return { success: false, error: "Gagal mengambil data pengguna" };
    }
}

export async function createUser(formData: FormData) {
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const level = formData.get("level") as any;
    const jabatan = formData.get("jabatan") as string;
    const phone = formData.get("phone") as string;
    const warehouseId = formData.get("warehouseId") ? Number(formData.get("warehouseId")) : null;
    const isActive = formData.get("isActive") === "on";

    if (!name || !username || !password) {
        return { success: false, error: "Username, Nama dan Password wajib diisi" };
    }

    try {
        // Check if username exists
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return { success: false, error: "Username sudah digunakan" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                username,
                password: hashedPassword,
                level: level || "STAFF",
                jabatan: jabatan || null,
                phone: phone || null,
                warehouseId,
                isActive,
                updatedAt: new Date()
            },
        });

        revalidatePath("/master/users");
        return { success: true };
    } catch (error: any) {
        console.error("USER CREATE ERROR:", error);
        return { success: false, error: error?.message || "Gagal menambahkan pengguna" };
    }
}

export async function updateUser(id: number, formData: FormData) {
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const level = formData.get("level") as any;
    const jabatan = formData.get("jabatan") as string;
    const phone = formData.get("phone") as string;
    const warehouseId = formData.get("warehouseId") ? Number(formData.get("warehouseId")) : null;
    const isActive = formData.get("isActive") === "on";

    if (!name || !username) {
        return { success: false, error: "Username dan Nama wajib diisi" };
    }

    try {
        // Check username collision
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing && existing.id !== id) {
            return { success: false, error: "Username sudah digunakan oleh user lain" };
        }

        const updateData: any = {
            name,
            username,
            level: level || "STAFF",
            jabatan: jabatan || null,
            phone: phone || null,
            warehouseId,
            isActive,
            updatedAt: new Date()
        };

        // Only update password if provided
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id },
            data: updateData,
        });

        revalidatePath("/master/users");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal memperbarui pengguna" };
    }
}

export async function deleteUser(id: number) {
    try {
        // Cannot delete last master admin (ideal case, but skipping complex logic for now)
        await prisma.user.delete({
            where: { id },
        });

        revalidatePath("/master/users");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Gagal menghapus pengguna." };
    }
}
