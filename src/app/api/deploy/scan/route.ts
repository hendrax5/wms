import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        // In a real app we would verify session here
        // const session = await auth();
        // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { serialCode } = body;

        if (!serialCode) {
            return NextResponse.json({ error: 'Serial Code is required' }, { status: 400 });
        }

        // Cari Serial Number beserta Item dan Warehouse-nya
        const serialNumber = await prisma.serialNumber.findUnique({
            where: { code: serialCode },
            include: {
                item: true,
                warehouse: true,
                itemstatus: true,
                itemtype: true,
                asset: true
            }
        });

        if (!serialNumber) {
            return NextResponse.json({ error: 'Serial Number tidak ditemukan di database' }, { status: 404 });
        }

        // Verifikasi apakah Serial Number ini merupakan aset yang sudah di-deploy
        if (serialNumber.asset) {
             return NextResponse.json({ error: 'Serial Number ini sudah terdaftar sebagai Aset Aktif' }, { status: 400 });
        }

        // Verifikasi ketersediaan di gudang (harus ada di gudang, tidak boleh null/In-Transit)
        if (!serialNumber.warehouseId) {
            return NextResponse.json({ error: 'Serial Number ini sedang tidak berada di gudang manapun (In-Transit / Kosong)' }, { status: 400 });
        }

        // Verifikasi status Item (harus "In Stock" atau semacamnya)
        // Note: Asumsi nama status adalah 'In Stock', disesuaikan nanti jika beda.
        if (serialNumber.itemstatus.name !== 'In Stock') {
            return NextResponse.json({ 
                error: `Status Serial Number tidak valid untuk deployment. Status saat ini: ${serialNumber.itemstatus.name}` 
            }, { status: 400 });
        }

        // Return detail item untuk ditampilkan di UI Teknisi
        return NextResponse.json({
            success: true,
            data: {
                id: serialNumber.id,
                serialCode: serialNumber.code,
                item: {
                    id: serialNumber.item.id,
                    name: serialNumber.item.name,
                    category: serialNumber.item.categoryId
                },
                warehouse: {
                    id: serialNumber.warehouse?.id,
                    name: serialNumber.warehouse?.name
                },
                status: serialNumber.itemstatus.name,
                type: serialNumber.itemtype.name
            }
        });

    } catch (error: any) {
        console.error('API Error [Scan SN]:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
