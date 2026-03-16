import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { assetId, warehouseId, returnCondition, notes } = body;

        // Validate required fields
        if (!assetId || !warehouseId || !returnCondition) {
            return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 });
        }

        // Fetch the asset with its relations
        const asset = await (prisma as any).asset.findUnique({
            where: { id: parseInt(assetId) },
            include: {
                serialnumber: true,
                item: true,
            }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
        }

        if (!['ACTIVE', 'MAINTENANCE', 'DAMAGED'].includes(asset.status)) {
            return NextResponse.json({ error: `Aset berstatus "${asset.status}" tidak bisa dikembalikan` }, { status: 400 });
        }

        // Determine stock column and SN status based on return condition
        const isSwap = returnCondition === 'DISMANTLE';
        const newAssetStatus = returnCondition === 'DAMAGED' ? 'DECOMMISSIONED' : 'DECOMMISSIONED';
        const snNewStatus = returnCondition === 'DAMAGED' ? 'DAMAGED' : 'DISMANTLE';

        // Execute the full return transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Asset status to DECOMMISSIONED
            const updatedAsset = await (tx as any).asset.update({
                where: { id: asset.id },
                data: {
                    status: newAssetStatus,
                    updatedAt: new Date(),
                }
            });

            // 2. Update SerialNumber — return it to the target warehouse
            await (tx as any).serialNumber.update({
                where: { id: asset.serialNumberId },
                data: {
                    warehouseId: parseInt(warehouseId),
                    statusId: null, // will be set via itemstatus if needed
                    updatedAt: new Date(),
                }
            });

            // 3. Update WarehouseStock — increment the right column
            const existingStock = await (tx as any).warehouseStock.findFirst({
                where: {
                    warehouseId: parseInt(warehouseId),
                    itemId: asset.itemId,
                }
            });

            if (existingStock) {
                await (tx as any).warehouseStock.update({
                    where: { id: existingStock.id },
                    data: returnCondition === 'DAMAGED'
                        ? { stockDamaged: { increment: 1 }, updatedAt: new Date() }
                        : { stockDismantle: { increment: 1 }, updatedAt: new Date() },
                });
            } else {
                await (tx as any).warehouseStock.create({
                    data: {
                        warehouseId: parseInt(warehouseId),
                        itemId: asset.itemId,
                        stockNew: 0,
                        stockDismantle: returnCondition === 'DISMANTLE' ? 1 : 0,
                        stockDamaged: returnCondition === 'DAMAGED' ? 1 : 0,
                        minStock: 0,
                        updatedAt: new Date(),
                    }
                });
            }

            // 4. Log the return in InventoryLog
            await (tx as any).inventoryLog.create({
                data: {
                    warehouseId: parseInt(warehouseId),
                    itemId: asset.itemId,
                    type: 'INBOUND',
                    qty: 1,
                    description: `Return dari lapangan — Kondisi: ${returnCondition}. ${notes || ''}`.trim(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });

            return updatedAsset;
        });

        return NextResponse.json({
            success: true,
            message: 'Aset berhasil dikembalikan ke gudang',
            assetId: result.id,
        });

    } catch (error: any) {
        console.error('[POST /api/assets/return]', error);
        return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
    }
}
