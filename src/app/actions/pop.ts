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

        const pops = await (prisma as any).pop.findMany({
            where: warehouseId ? { warehouseId } : undefined,
            orderBy: { name: "asc" },
            include: {
                area: true,
                warehouse: true,
                _count: {
                    select: { stockout: true, popinstallation: true, serialnumber: true }
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
                updatedAt: new Date(),
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
                updatedAt: new Date(),
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

export async function getPopDetails(id: number) {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: null };
        }

        const pop = await prisma.pop.findUnique({
            where: { id },
            include: {
                area: true,
                warehouse: true,
                _count: { select: { stockout: true, popinstallation: true, serialnumber: true } },
            },
        });

        if (!pop) return { success: false, error: "POP tidak ditemukan" };

        // Installations (history of items installed here)
        const installations = await (prisma as any).popInstallation.findMany({
            where: { popId: id },
            orderBy: { installedAt: "desc" },
            include: {
                item: { select: { id: true, name: true, code: true, unit: true } },
                serialnumber: { select: { id: true, code: true } },
            },
        });

        // Serial numbers currently at this POP
        const serialNumbers = await (prisma as any).serialNumber.findMany({
            where: { popId: id },
            orderBy: { updatedAt: "desc" },
            include: {
                item: { select: { id: true, name: true, code: true, unit: true } },
                status: { select: { name: true } },
            },
        });

        // StockOut records targeting this POP
        const stockOuts = await (prisma as any).stockOut.findMany({
            where: { popId: id },
            orderBy: { createdAt: "desc" },
            include: {
                item: { select: { id: true, name: true, code: true } },
                warehouse_stockout_warehouseIdTowarehouse: { select: { name: true } },
                stockoutserial: {
                    include: { serialnumber: { select: { code: true } } },
                },
            },
        });

        return {
            success: true,
            data: {
                pop,
                installations,
                serialNumbers,
                stockOuts,
            },
        };
    } catch (error) {
        console.error("getPopDetails error:", error);
        return { success: false, error: "Gagal mengambil detail POP" };
    }
}

// ─── Konversi PopInstallation → Asset ─────────────────────────────────────

export async function convertToAsset(
    installationId: number,
    data: {
        purchasePrice?: number;
        warrantyExpiry?: string | null;
        rackLocation?: string | null;
        note?: string | null;
    }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const userId = Number(session.user.id);

        // Ambil data instalasi
        const installation = await (prisma as any).popInstallation.findUnique({
            where: { id: installationId },
            include: { serialnumber: true },
        });

        if (!installation) return { success: false, error: "Instalasi tidak ditemukan" };
        if (installation.assetId) return { success: false, error: "Sudah menjadi asset" };
        if (!installation.serialNumberId) return { success: false, error: "Instalasi ini tidak memiliki Serial Number — hanya item ber-SN yang bisa jadi asset" };

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Buat Asset baru
            const asset = await tx.asset.create({
                data: {
                    serialNumberId: installation.serialNumberId,
                    itemId: installation.itemId,
                    purchasePrice: data.purchasePrice ?? 0,
                    warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
                    status: "ACTIVE",
                    installedAt: installation.installedAt,
                    updatedAt: new Date(),
                },
            });

            // 2. Update PopInstallation: link ke asset + simpan posisi rak
            await tx.popInstallation.update({
                where: { id: installationId },
                data: {
                    assetId: asset.id,
                    rackLocation: data.rackLocation ?? null,
                },
            });

            // 3. Catat log lokasi pertama
            await tx.assetLocationLog.create({
                data: {
                    assetId: asset.id,
                    popId: installation.popId,
                    rackLocation: data.rackLocation ?? null,
                    movedBy: userId,
                    note: data.note ?? "Konversi awal dari PopInstallation",
                },
            });

            return asset;
        });

        revalidatePath("/pop");
        revalidatePath(`/pop/${installation.popId}`);
        revalidatePath("/assets");
        return { success: true, data: result };
    } catch (error: any) {
        console.error("convertToAsset error:", error);
        return { success: false, error: "Gagal mengkonversi ke asset: " + (error?.message ?? "") };
    }
}

// ─── Pindah posisi rak (setelah sudah jadi asset) ──────────────────────────

export async function moveRack(
    installationId: number,
    rackLocation: string,
    note?: string
) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const userId = Number(session.user.id);

        const installation = await (prisma as any).popInstallation.findUnique({
            where: { id: installationId },
        });

        if (!installation) return { success: false, error: "Instalasi tidak ditemukan" };
        if (!installation.assetId) return { success: false, error: "Belum menjadi asset" };

        await prisma.$transaction(async (tx: any) => {
            // Update posisi rak di PopInstallation
            await tx.popInstallation.update({
                where: { id: installationId },
                data: { rackLocation },
            });

            // Catat log perpindahan
            await tx.assetLocationLog.create({
                data: {
                    assetId: installation.assetId,
                    popId: installation.popId,
                    rackLocation,
                    movedBy: userId,
                    note: note ?? null,
                },
            });
        });

        revalidatePath(`/pop/${installation.popId}`);
        return { success: true };
    } catch (error: any) {
        console.error("moveRack error:", error);
        return { success: false, error: "Gagal memindahkan rak: " + (error?.message ?? "") };
    }
}

// ─── Ambil data instalasi di suatu POP (untuk tab Assets) ─────────────────

export async function getInstallationsForPop(popId: number) {
    noStore();
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return { success: true, data: [] };
        }

        const installations = await (prisma as any).popInstallation.findMany({
            where: { popId },
            orderBy: { installedAt: "desc" },
            include: {
                item: { select: { id: true, name: true, code: true, unit: true } },
                serialnumber: { select: { id: true, code: true } },
                asset: {
                    select: {
                        id: true, status: true, purchasePrice: true, warrantyExpiry: true,
                        locationlogs: {
                            orderBy: { movedAt: "desc" },
                            take: 1,
                            select: { movedAt: true, rackLocation: true },
                        },
                    },
                },
            },
        });

        return { success: true, data: installations };
    } catch (error) {
        return { success: false, error: "Gagal mengambil data instalasi" };
    }
}
