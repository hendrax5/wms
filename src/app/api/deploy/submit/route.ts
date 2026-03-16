import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { serialCode, siteName, technicianId } = body;

        if (!serialCode || !siteName) {
            return NextResponse.json({ error: 'Serial Code dan Site Name wajib diisi' }, { status: 400 });
        }

        // Cari data SN
        const serialNumber: any = await prisma.serialNumber.findUnique({
            where: { code: serialCode },
            include: { warehouse: true, item: true, asset: true, itemstatus: true }
        });

        if (!serialNumber) {
            return NextResponse.json({ error: 'Serial Number tidak ditemukan' }, { status: 404 });
        }

        if (serialNumber.asset || serialNumber.itemstatus.name !== 'In Stock') {
            return NextResponse.json({ error: 'Serial Number tidak valid untuk di-deploy' }, { status: 400 });
        }

        const currentWarehouseId = serialNumber.warehouseId;
        if (!currentWarehouseId) {
            return NextResponse.json({ error: 'Serial Number hilang atau sedang dalam transit' }, { status: 400 });
        }

        const statusDipakai = await prisma.itemStatus.findUnique({ where: { name: 'Dipakai' } });
        if (!statusDipakai) {
             return NextResponse.json({ error: 'Setup data master gagal: Status "Dipakai" tidak ditemukan' }, { status: 500 });
        }

        // Lakukan migrasi WMS -> Asset di dalam transaksi reabilitas (ACID)
        const transactionResult = await prisma.$transaction(async (tx) => {
            // 1. Kurangi stok di warehouse (Jika type New/Dismantle. Kita asumsi stockNew untuk contoh ini)
            await tx.warehouseStock.update({
                where: {
                    itemId_warehouseId: {
                        itemId: serialNumber.itemId,
                        warehouseId: currentWarehouseId
                    }
                },
                data: {
                    stockNew: {
                        decrement: 1
                    }
                }
            });

            // 2. Ubah status Serial Number menjadi "Dipakai" dan lepaskan dari Gudang
            const updatedSN = await tx.serialNumber.update({
                where: { id: serialNumber.id },
                data: {
                    statusId: statusDipakai.id,
                    warehouseId: null, 
                    // popId atau customerId bisa diset disini bila WO berbasis DB relasional, 
                    // tapi di contoh ini kita pakai simple siteName di Asset.
                }
            });

            // 3. Tambahkan ke list Asset Aktif perusahaan
            const newAsset = await (tx as any).asset.create({
                data: {
                    serialNumberId: updatedSN.id,
                    itemId: updatedSN.itemId,
                    assignedToUser: technicianId ? parseInt(technicianId) : null,
                    status: 'ACTIVE',         
                    purchasePrice: serialNumber.price || serialNumber.item.price || 0,
                }
            });

            // 4. Catat histori pengeluaran mutlak ke InventoryLog
            await (tx as any).inventoryLog.create({
                data: {
                    warehouseId: currentWarehouseId,
                    itemId: serialNumber.itemId,
                    type: 'OUTBOUND',
                    qtyChange: -1,
                    finalQty: 0, // In real world you may recalculate or query current stok
                    userId: technicianId ? parseInt(technicianId) : null,
                }
            });

            return newAsset;
        });

        return NextResponse.json({
            success: true,
            message: 'Aset berhasil di-deploy dari gudang',
            asset: transactionResult
        });

    } catch (error: any) {
        console.error('API Error [Submit Deployment]:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
